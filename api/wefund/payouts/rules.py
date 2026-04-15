# wefund/payouts/rules.py
from decimal import Decimal, ROUND_HALF_UP


AUTO_REJECT_THRESHOLD_PERCENT = Decimal("10.00")


def calculate_deduction_percent(report: dict, payout) -> Decimal:
    """
    deductionPercent = (Total Affected P&L / Total Profit) × 100
    """
    total_affected = Decimal(report["summary"]["total_affected_pnl"])
    total_profit = Decimal(payout.profit)

    if total_profit <= 0:
        return Decimal("0.00")

    percent = (
        total_affected / total_profit * Decimal("100")
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return percent


def should_auto_reject_payout(report: dict, payout) -> bool:
    deduction_percent = calculate_deduction_percent(report, payout)
    return deduction_percent > AUTO_REJECT_THRESHOLD_PERCENT
