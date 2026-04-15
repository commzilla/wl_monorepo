# wefund/ai_analysis/orchestrator.py

from django.db import transaction
from django.conf import settings

from wefund.models import TraderPayout, PayoutAIAnalysis
from .collectors import get_trades_for_payout, get_payout_period
from .metrics import compute_stats_and_samples
from .llm_client import call_llm   # <-- IMPORTANT: using Claude now


def run_payout_ai_analysis(payout_id):
    """
    Main execution entry for WeFund AI Analysis v2 (Claude version).
    - Collects MT5 trades for the payout period
    - Computes stats + samples
    - Calls Claude Sonnet (WeFund AI Risk Engine)
    - Saves result into PayoutAIAnalysis
    """

    payout = TraderPayout.objects.get(id=payout_id)

    with transaction.atomic():
        analysis, _created = PayoutAIAnalysis.objects.get_or_create(
            payout=payout,
            defaults={
                "trader": payout.trader,
                "enrollment": payout.challenge_enrollment,
            },
        )

        # Mark running
        analysis.status = "running"
        analysis.error_message = ""
        analysis.save()

        # ------------------------------------------------
        # 1) COLLECT MT5 TRADES AND PERIOD
        # ------------------------------------------------
        trades_qs, account_id = get_trades_for_payout(payout)
        start_dt, end_dt = get_payout_period(payout)

        if not account_id:
            analysis.status = "failed"
            analysis.error_message = "MT5 account not found for this payout."
            analysis.save()
            return analysis

        metrics = compute_stats_and_samples(trades_qs, start_dt, end_dt)

        # ------------------------------------------------
        # 2) BUILD PAYLOAD FOR CLAUDE
        # ------------------------------------------------
        payload = {
            "payout_info": {
                "payout_id": str(payout.id),
                "requested_amount": float(payout.amount),
                "net_profit": float(payout.net_profit),
                "currency": payout.challenge_enrollment.currency
                if payout.challenge_enrollment else "USD",
            },
            "mt5_account_id": account_id,
            "stats": metrics["stats"],
            "trades": metrics["samples"]["trades"],
            "period_start": start_dt.isoformat(),
            "period_end": end_dt.isoformat(),
        }

        # Store pre-LLM input
        analysis.mt5_account_id = account_id
        analysis.stats = metrics["stats"]
        analysis.trade_samples = metrics["samples"]
        analysis.llm_request_payload = payload
        analysis.llm_model = getattr(
            settings, "ANTHROPIC_MODEL", "claude-3.5-sonnet"
        )
        analysis.save()

        # ------------------------------------------------
        # 3) CALL CLAUDE
        # ------------------------------------------------
        try:
            result = call_llm(payload)
        except Exception as e:
            analysis.status = "failed"
            analysis.error_message = f"{type(e).__name__}: {e}"
            analysis.save()
            return analysis

        # ------------------------------------------------
        # 4) MAP CLAUDE RAW RESPONSE
        # ------------------------------------------------
        analysis.llm_raw_response = result

        # Basic sections
        analysis.ai_summary = result.get("summary", "")
        analysis.ai_trading_style = result.get("trading_style", {}) or {}
        analysis.ai_risk_profile = result.get("risk_profile", {}) or {}
        analysis.ai_consistency = result.get("consistency", {}) or {}
        analysis.ai_recommendations = result.get("recommendations", {}) or {}

        # ------------------------------------------------
        # 5) PAYOUT RECOMMENDATION BLOCK
        # ------------------------------------------------
        payout_rec = result.get("payout_recommendation") or {}

        analysis.recommendation = payout_rec.get("decision")
        analysis.recommendation_confidence = payout_rec.get("confidence")
        analysis.recommendation_rationale = payout_rec.get("rationale")

        # ------------------------------------------------
        # 6) CLASSIFICATION / VIOLATIONS / ADJUSTED PAYOUT
        # (NOT stored in DB unless you add new fields)
        # ------------------------------------------------

        # If Claude did not return the mandatory block → fail
        if not payout_rec:
            analysis.status = "failed"
            analysis.error_message = (
                "Claude response missing required 'payout_recommendation' block. "
                "Check prompt or JSON enforcement."
            )
        else:
            analysis.status = "completed"

        analysis.save()
        return analysis
