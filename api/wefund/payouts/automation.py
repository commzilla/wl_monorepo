# wefund/payouts/automation.py
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.conf import settings

from wefund.risk_v2.engine import (
    run_risk_scan_for_payout,
    attach_report_to_payout,
)

from .rules import (
    calculate_deduction_percent,
    AUTO_REJECT_THRESHOLD_PERCENT,
)

from .context_builder import build_payout_rejection_context
from .email_renderer import send_payout_rejection_email
from api.services.mt5_client import MT5Client


def build_rejection_reason(deduction_percent: Decimal) -> str:
    return (
        "Total deductions from consistency rule breaches "
        f"({deduction_percent}%) exceeded the allowed 10% threshold "
        "of the total cycle profit. The account remains active."
    )


def auto_reject_payout_if_needed(*, payout) -> bool:
    """
    Auto-reject ONLY when:
      deductionPercent = (total_affected_pnl / total_profit) * 100
      and deductionPercent > 10%
    """
    report = run_risk_scan_for_payout(payout)
    deduction_percent = calculate_deduction_percent(report, payout)

    # ✅ Only reject if > 10%
    if deduction_percent <= AUTO_REJECT_THRESHOLD_PERCENT:
        return False
    
    enrollment = payout.challenge_enrollment

    with transaction.atomic():
        # Save/replace risk report
        attach_report_to_payout(payout)

        # Reject payout
        payout.status = "rejected"
        payout.reviewed_at = timezone.now()
        payout.rejection_reason = build_rejection_reason(deduction_percent)
        payout.save(update_fields=["status", "reviewed_at", "rejection_reason"])

        # Email context (ensure % matches decision)
        context = build_payout_rejection_context(payout, report)
        context["PERCENT_DEDUCTED"] = str(deduction_percent)

        send_payout_rejection_email(
            payout=payout,
            template_name="emails/automation/payouts/payout_rejected.html",
            context=context,
        )

        if enrollment and enrollment.mt5_account_id:
            try:
                mt5 = MT5Client(
                    settings.MT5_API_URL,
                    settings.MT5_API_KEY,
                )
                mt5.activate_trading(int(enrollment.mt5_account_id))
            except Exception as e:
                # Never break payout automation
                print(
                    f"[AUTO-REJECT] Failed to re-enable trading "
                    f"for MT5 {enrollment.mt5_account_id}: {e}"
                )

    return True