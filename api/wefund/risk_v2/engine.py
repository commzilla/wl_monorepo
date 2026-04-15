# wefund/risk_v2/engine.py
from __future__ import annotations

from typing import Any, Dict, List

from django.utils import timezone
from django.db import transaction

from .loader import get_all_rules
from .report_builder import build_report
from .utils.helpers import get_trades_for_payout
from wefund.models import TraderPayout, RiskScanReport


def run_risk_scan_for_payout(
    payout: TraderPayout,
    *,
    include_soft: bool = False,
    include_consistency: bool = True,
    start_date=None,      # OPTIONAL
    end_date=None,        # OPTIONAL
) -> Dict[str, Any]:
    """
    Main engine → returns final JSON report (but does not save).
    """
    trades, context = get_trades_for_payout(
        payout,
        start_date=start_date,   # pass through
        end_date=end_date,       # pass through
    )
    rules = get_all_rules(include_soft, include_consistency)

    all_violations = []
    for rule in rules:
        violations = rule.run(trades, context)
        all_violations.extend(violations)

    # Pass violations list to report builder
    report = build_report(
        payout=payout,
        violations=all_violations,
        context=context,
    )
    return report


def attach_report_to_payout(
    payout: TraderPayout,
    admin_user=None,
) -> RiskScanReport:
    """
    - Runs a fresh scan
    - Saves it into RiskScanReport table
    - Replaces existing report if already exists
    """
    report = run_risk_scan_for_payout(payout)

    summary = report.get("summary", {})
    global_score = summary.get("global_score", 0)
    max_severity = summary.get("max_severity", None)
    recommended_action = summary.get("recommended_action", None)

    with transaction.atomic():
        risk_obj, _ = RiskScanReport.objects.update_or_create(
            payout=payout,
            defaults={
                "report": report,
                "global_score": global_score,
                "max_severity": max_severity,
                "recommended_action": recommended_action,
                "generated_at": timezone.now(),
                "reran_by": admin_user,
            }
        )

    return risk_obj
