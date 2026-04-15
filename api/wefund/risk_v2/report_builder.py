# wefund/risk_v2/report_builder.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Tuple
from django.utils import timezone
from wefund.risk_v2.rules.base import RuleViolation


def _calculate_deduplicated_affected_pnl(violations: List[RuleViolation]) -> Decimal:
    """
    Calculate total affected P&L without double-counting trades flagged by multiple rules.

    Deduplication logic:
    - Track unique (account_id, order_id) pairs
    - When a trade is flagged by multiple rules, use the BIGGEST affected_pnl
    - For aggregated_trades violations (which contain multiple orders), the cluster's
      total P&L is only added if NONE of its orders were flagged by other rules.
      If any order in the cluster was already flagged, we skip the cluster to avoid
      double-counting (those individual trades' P&L is already accounted for).

    Returns the deduplicated total affected P&L.
    """
    # Separate aggregated cluster violations from standard violations
    standard_violations: List[RuleViolation] = []
    cluster_violations: List[RuleViolation] = []

    for v in violations:
        cluster_orders = v.meta.get("cluster_orders") if v.meta else None
        if cluster_orders and isinstance(cluster_orders, list) and len(cluster_orders) > 1:
            cluster_violations.append(v)
        else:
            standard_violations.append(v)

    # First pass: Process standard violations, keeping max P&L per order
    max_pnl_per_order: Dict[Tuple[int, int], Decimal] = {}

    for v in standard_violations:
        order_key = (v.account_id, v.order_id)
        current_max = max_pnl_per_order.get(order_key, Decimal("0"))
        if v.affected_pnl > current_max:
            max_pnl_per_order[order_key] = v.affected_pnl

    # Second pass: Process cluster violations
    # Only add cluster P&L if ALL orders in the cluster are new (not seen in standard violations)
    for v in cluster_violations:
        account_id = v.account_id
        cluster_orders = v.meta.get("cluster_orders", [])

        # Check if any order in this cluster was already flagged by a standard violation
        any_order_already_counted = any(
            (account_id, order_id) in max_pnl_per_order
            for order_id in cluster_orders
        )

        if not any_order_already_counted:
            # None of the cluster orders were flagged elsewhere - add full cluster P&L
            # Use the first order as representative key for the entire cluster
            cluster_key = (account_id, cluster_orders[0])
            current_max = max_pnl_per_order.get(cluster_key, Decimal("0"))
            if v.affected_pnl > current_max:
                max_pnl_per_order[cluster_key] = v.affected_pnl
                # Mark all cluster orders as seen to prevent other clusters from double-counting
                for order_id in cluster_orders:
                    if (account_id, order_id) not in max_pnl_per_order:
                        max_pnl_per_order[(account_id, order_id)] = Decimal("0")

    # Sum all the maximum P&L values
    return sum(max_pnl_per_order.values(), Decimal("0"))


def calculate_global_summary(violations: List[RuleViolation]) -> Dict[str, Any]:
    """
    Build the summary block based on severity scores.
    """

    if not violations:
        return {
            "total_violations": 0,
            "max_severity": None,
            "global_score": 0,
            "total_affected_pnl": "0",
            "recommended_action": "ok",
        }

    severities = [v.severity for v in violations]
    max_severity = max(severities)

    # Simple scoring model: sum of all severity scores
    global_score = sum(severities)

    # Calculate deduplicated total affected P&L
    total_affected_pnl = _calculate_deduplicated_affected_pnl(violations)

    # Decide recommended action
    if max_severity >= 90:
        recommended_action = "extended_review"
    elif max_severity >= 70:
        recommended_action = "manual_review"
    else:
        recommended_action = "ok"

    return {
        "total_violations": len(violations),
        "max_severity": max_severity,
        "global_score": global_score,
        "total_affected_pnl": str(total_affected_pnl),
        "recommended_action": recommended_action,
    }


def build_report(
    *,
    payout,
    violations: List[RuleViolation],
    context: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Convert raw RuleViolation list → final JSON report dict.
    """

    summary = calculate_global_summary(violations)

    report = {
        "version": "2.0",
        "payout_id": str(payout.id),
        "trader_id": str(payout.trader_id),

        "enrollment_id": (
            str(context["enrollment"].id) if context.get("enrollment") else None
        ),
        "account_ids": context.get("account_ids", []),
        "account_size": context.get("account_size"),
        "currency": context.get("currency"),

        "scan_window": {
            "start": (
                context.get("scan_window_start").isoformat()
                if context.get("scan_window_start") else None
            ),
            "end": (
                context.get("scan_window_end").isoformat()
                if context.get("scan_window_end") else None
            ),
            "is_custom": context.get("custom_date_filter", False),
            "last_payout_time": (
                context.get("last_payout_time").isoformat()
                if context.get("last_payout_time") else None
            ),
        },

        "generated_at": timezone.now().isoformat(),

        "summary": summary,

        # Violations flattened (not grouped by rule)
        "violations": [v.to_dict() for v in violations],
    }

    return report
