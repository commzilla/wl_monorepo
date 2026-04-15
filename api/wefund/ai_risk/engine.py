import json
import logging
import re
import time
from django.db import transaction
from django.utils import timezone

from wefund.models import (
    TraderPayout,
    AIRiskAnalysis,
)

from wefund.ai_risk.content_builder import build_ai_risk_context
from wefund.ai_risk.prompt_builder import build_ai_risk_prompt
from wefund.ai_risk.gemini_client import get_gemini_risk_client, GeminiRiskClientError

logger = logging.getLogger(__name__)

# Valid recommendations
VALID_RECOMMENDATIONS = {"APPROVE", "REJECT", "MANUAL_REVIEW"}

# Pattern code validation regex
PATTERN_CODE_REGEX = re.compile(r'^[A-Z][A-Z0-9_]{1,49}$')


def validate_pattern_codes(patterns: list) -> list:
    """Validate pattern codes against whitelist format."""
    valid = []
    for code in patterns:
        if isinstance(code, str):
            code = code.upper().strip()
            if PATTERN_CODE_REGEX.match(code):
                valid.append(code)
    return valid


def validate_recommendation(rec: str) -> str:
    """Validate recommendation is allowed."""
    if not isinstance(rec, str):
        return "MANUAL_REVIEW"
    rec = rec.upper().strip()
    return rec if rec in VALID_RECOMMENDATIONS else "MANUAL_REVIEW"


def validate_confidence(value) -> float:
    """Validate and normalize confidence value."""
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    if 0 <= confidence <= 1:
        confidence = confidence * 100
    return max(0.0, min(100.0, confidence))


class AIRiskEngineError(Exception):
    """Raised when AI risk engine fails."""


class AIRiskEngine:
    """
    Orchestrates AI risk analysis for a payout.
    Runs Gemini analysis SYNCHRONOUSLY (no Celery needed).
    """

    # ------------------------------------------------
    # Public Entry Point
    # ------------------------------------------------
    def run_for_payout(self, *, payout_id) -> AIRiskAnalysis:
        """
        Run AI risk analysis for a payout SYNCHRONOUSLY.
        Gemini typically responds in 5-15 seconds.
        """

        try:
            payout = TraderPayout.objects.select_related(
                "challenge_enrollment",
                "challenge_enrollment__challenge",
                "trader",
            ).get(id=payout_id)
        except TraderPayout.DoesNotExist:
            raise AIRiskEngineError("Payout not found")

        # Prevent duplicate AI runs
        if hasattr(payout, "ai_risk_analysis"):
            logger.info(
                "AI risk analysis already exists for payout %s",
                payout_id,
            )
            return payout.ai_risk_analysis

        # ------------------------------------------------
        # Build Context & Prompt
        # ------------------------------------------------
        context = build_ai_risk_context(payout_id=payout.id)
        prompt = build_ai_risk_prompt(context=context)

        # ------------------------------------------------
        # Create analysis record (status: running)
        # ------------------------------------------------
        start_time = time.time()

        with transaction.atomic():
            analysis = AIRiskAnalysis.objects.create(
                payout=payout,

                # Account context
                account_id=context["mt5"]["account_id"],
                account_step=context["challenge"]["challenge_type"],

                # Input snapshot
                trade_data=context["trades"],
                account_snapshot={
                    "client": context["client"],
                    "challenge": context["challenge"],
                    "mt5": context["mt5"],
                    "payout": context["payout"],
                    "trade_window": context["trade_window"],
                },

                # Consistency (optional)
                consistency_score=(context.get("consistency") or {}).get("global_score"),
                consistency_result=(context.get("consistency") or {}).get("recommended_action"),

                # AI metadata
                ai_model="gemini-2.5-flash",
                ai_prompt_version=prompt["prompt_version"],

                # Raw audit payload
                ai_raw_request=prompt,

                # Start immediately
                status="running",
                started_at=timezone.now(),
                completed_at=None,
            )

        # ------------------------------------------------
        # Run Gemini SYNCHRONOUSLY
        # ------------------------------------------------
        try:
            client = get_gemini_risk_client()

            result = client.analyze_payout(
                system_instruction=prompt["messages"][0]["content"],
                trade_context=prompt["messages"][1]["content"],
            )

            processing_time_ms = int((time.time() - start_time) * 1000)

            # Parse JSON response
            try:
                response_data = json.loads(result["text"])
            except json.JSONDecodeError as e:
                logger.error("JSON parse error | analysis=%s | error=%s | response_preview=%s",
                           analysis.id, str(e), result["text"][:500] if result.get("text") else "empty")
                raise GeminiRiskClientError("Invalid JSON response from AI")

            # Validate response fields
            recommendation = validate_recommendation(response_data.get("recommendation", "APPROVE"))
            patterns_detected = response_data.get("patterns_detected", [])
            confidence = validate_confidence(response_data.get("confidence", 0))

            # Validate pattern codes
            pattern_codes = []
            if isinstance(patterns_detected, list):
                raw_codes = [p.get("code", "") for p in patterns_detected if isinstance(p, dict)]
                pattern_codes = validate_pattern_codes(raw_codes)

            requires_review = recommendation in {"REJECT", "MANUAL_REVIEW"}

            # Persist results atomically
            with transaction.atomic():
                analysis.ai_raw_response = result
                analysis.ai_analysis_text = result["text"]
                analysis.ai_model = result.get("model_used", "gemini-2.5-flash")
                analysis.ai_recommendation = recommendation
                analysis.ai_patterns_detected = pattern_codes
                analysis.ai_confidence = confidence
                analysis.requires_human_review = requires_review
                analysis.status = "completed"
                analysis.completed_at = timezone.now()
                analysis.save()

            logger.info(
                "AI risk analysis completed | payout=%s analysis=%s recommendation=%s time_ms=%s",
                payout.id,
                analysis.id,
                recommendation,
                processing_time_ms,
            )

        except GeminiRiskClientError as e:
            logger.exception("Gemini API error | analysis=%s", analysis.id)
            analysis.status = "failed"
            analysis.error_message = str(e)[:500]
            analysis.completed_at = timezone.now()
            analysis.save(update_fields=["status", "error_message", "completed_at"])
            raise AIRiskEngineError(f"AI analysis failed: {e}")

        except Exception as e:
            logger.exception("AI risk analysis failed | analysis=%s", analysis.id)
            analysis.status = "failed"
            analysis.error_message = str(e)[:500]
            analysis.completed_at = timezone.now()
            analysis.save(update_fields=["status", "error_message", "completed_at"])
            raise AIRiskEngineError(f"AI analysis failed: {e}")

        return analysis
