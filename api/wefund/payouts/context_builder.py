# wefund/payouts/context_builder.py
from decimal import Decimal
from collections import defaultdict


def build_payout_rejection_context(payout, report):
    violations = report["violations"]

    by_rule = defaultdict(list)
    for v in violations:
        by_rule[v["rule_code"]].append(v)

    def top_n(rule_code, n=3):
        items = by_rule.get(rule_code, [])
        return sorted(
            items,
            key=lambda x: abs(Decimal(x["affected_pnl"])),
            reverse=True
        )[:n]

    total_deductions = Decimal(report["summary"]["total_affected_pnl"])
    total_profit = Decimal(payout.profit)

    threshold = (total_profit * Decimal("0.10")).quantize(Decimal("0.01"))
    percent_deducted = (
        (total_deductions / total_profit * 100).quantize(Decimal("0.01"))
        if total_profit > 0 else Decimal("0.00")
    )

    # ---- DAILY PROFIT TOTAL (FIXED) ----
    daily_profit_total = sum(
        Decimal(v["affected_pnl"])
        for v in by_rule.get("consistency.daily_profit_limit", [])
    )

    # ---- LOT SIZE RANGE (SAFE) ----
    lot_violations = by_rule.get("consistency.lot_size_consistency", [])
    if lot_violations:
        meta = lot_violations[0]["meta"]
        avg_lot = Decimal(meta["avg_volume"])
        min_allowed = Decimal(meta["min_allowed"])
        max_allowed = Decimal(meta["max_allowed"])
    else:
        avg_lot = min_allowed = max_allowed = Decimal("0.00")

    return {
        # ===================
        # SUMMARY
        # ===================
        "ACCOUNT_SIZE": int(payout.challenge_enrollment.account_size),
        "MT5_ACCOUNT": payout.challenge_enrollment.mt5_account_id,
        "TOTAL_CYCLE_PROFIT": f"{total_profit:.2f}",
        "PROFIT_SPLIT_PERCENT": f"{payout.profit_share:.0f}",
        "REQUESTED_PAYOUT": f"{payout.amount:.2f}",
        "THRESHOLD_10_PERCENT": f"{threshold:.2f}",
        "TOTAL_DEDUCTIONS": f"{total_deductions:.2f}",
        "PERCENT_DEDUCTED": f"{percent_deducted}",

        # ===================
        # PROFIT CONSISTENCY
        # ===================
        "DAILY_PROFIT_DED_TOTAL": f"{daily_profit_total:.2f}",
        "SINGLE_TRADE_DED_TOTAL": "0.00",

        # ===================
        # LOT SIZE SUMMARY
        # ===================
        "AVG_LOT": f"{avg_lot:.2f}",
        "MIN_ALLOWED_LOT": f"{min_allowed:.2f}",
        "MAX_ALLOWED_LOT": f"{max_allowed:.2f}",

        # ===================
        # EXAMPLES (≤ 3)
        # ===================
        "profit_examples": [
            {
                "date": v["meta"].get("day"),
                "amount": v["affected_pnl"],
                "trade_id": v["order_id"],
            }
            for v in top_n("consistency.daily_profit_limit")
        ],

        "lot_examples": [
            {
                "trade_id": v["order_id"],
                "lot": v["meta"]["trade_volume"],
                "profit": v["affected_pnl"],
            }
            for v in top_n("consistency.lot_size_consistency")
        ],

        "u60_examples": [
            {
                "trade_id": v["order_id"],
                "duration": v["meta"]["duration_seconds"],
                "profit": v["affected_pnl"],
            }
            for v in top_n("consistency.close_under_60s")
        ],

        "agg_examples": [
            {
                "symbol": v["symbol"],
                "lot": v["meta"]["total_volume"],
                "profit": v["affected_pnl"],
                "trade_id": v["order_id"],
            }
            for v in top_n("consistency.aggregated_trades")
        ],
    }
