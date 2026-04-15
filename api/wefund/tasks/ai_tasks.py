"""
AI Risk Analysis Celery Task - Gemini Implementation.
Replaces RunPod/Deepseek with faster Gemini API.

SECURITY:
- Input validation on all data
- Rate limiting per payout
- Secure audit logging
- No sensitive data in error messages
"""
import json
import logging
import re
import time
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache

from wefund.models import AIRiskAnalysis
from wefund.ai_risk.gemini_client import get_gemini_risk_client, GeminiRiskClientError

logger = logging.getLogger(__name__)

# Rate limit: max 10 analyses per payout per hour
RATE_LIMIT_MAX_REQUESTS = 10
RATE_LIMIT_WINDOW_SECONDS = 3600

# Valid recommendations
VALID_RECOMMENDATIONS = {"APPROVE", "REJECT", "MANUAL_REVIEW"}

# Pattern code validation regex
PATTERN_CODE_REGEX = re.compile(r'^[A-Z][A-Z0-9_]{1,49}$')


def rate_limit_check(key: str, max_requests: int, window_seconds: int) -> bool:
    """Simple rate limiting using Django cache."""
    cache_key = f"rate_limit:{key}"
    current = cache.get(cache_key, 0)
    if current >= max_requests:
        return False
    cache.set(cache_key, current + 1, window_seconds)
    return True


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


@shared_task(
    bind=True,
    autoretry_for=(GeminiRiskClientError,),
    retry_kwargs={"max_retries": 3, "countdown": 10},
    retry_backoff=True,
    time_limit=300,
    soft_time_limit=240,
)
def run_ai_risk_analysis_async(self, analysis_id: int):
    """
    Execute AI risk analysis via Gemini.
    Typically completes in 5-15 seconds (vs 60-600s with RunPod).
    """
    # Validate analysis_id
    if not isinstance(analysis_id, int) or analysis_id <= 0:
        logger.error("Invalid analysis_id | id=%s", analysis_id)
        return {"error": "Invalid analysis ID"}

    try:
        analysis = AIRiskAnalysis.objects.select_related("payout").get(id=analysis_id)
    except AIRiskAnalysis.DoesNotExist:
        logger.error("AI risk analysis not found | id=%s", analysis_id)
        return {"error": "Analysis not found"}

    payout_id = analysis.payout_id

    # Rate limiting
    rate_limit_key = f"ai_risk_analysis:payout:{payout_id}"
    if not rate_limit_check(rate_limit_key, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS):
        logger.warning("Rate limit exceeded | payout=%s", payout_id)
        return {"error": "Rate limit exceeded"}

    # Idempotency guard
    if analysis.status not in {"queued", "failed"}:
        logger.warning("AI analysis already processed | id=%s status=%s", analysis.id, analysis.status)
        return {"skipped": True, "reason": f"status={analysis.status}"}

    # Validate request structure
    if not _validate_raw_request(analysis.ai_raw_request):
        logger.error("Invalid ai_raw_request structure | analysis=%s", analysis.id)
        analysis.status = "failed"
        analysis.error_message = "Invalid request structure"
        analysis.completed_at = timezone.now()
        analysis.save(update_fields=["status", "error_message", "completed_at"])
        return {"error": "Invalid request structure"}

    # Mark running
    start_time = time.time()
    analysis.status = "running"
    analysis.started_at = timezone.now()
    analysis.error_message = None
    analysis.save(update_fields=["status", "started_at", "error_message"])

    try:
        client = get_gemini_risk_client()

        # Execute Gemini analysis
        result = client.analyze_payout(
            system_instruction=analysis.ai_raw_request["messages"][0]["content"],
            trade_context=analysis.ai_raw_request["messages"][1]["content"],
        )

        processing_time_ms = int((time.time() - start_time) * 1000)

        # Parse JSON response
        try:
            response_data = json.loads(result["text"])
        except json.JSONDecodeError:
            logger.error("JSON parse error | analysis=%s", analysis.id)
            raise GeminiRiskClientError("Invalid JSON response from AI")

        # Validate response fields
        recommendation = validate_recommendation(response_data.get("recommendation", "APPROVE"))
        patterns_detected = response_data.get("patterns_detected", [])
        confidence = _validate_confidence(response_data.get("confidence", 0))

        # Validate pattern codes
        pattern_codes = []
        if isinstance(patterns_detected, list):
            raw_codes = [p.get("code", "") for p in patterns_detected if isinstance(p, dict)]
            pattern_codes = validate_pattern_codes(raw_codes)

        requires_review = recommendation in {"REJECT", "MANUAL_REVIEW"}

        # Persist atomically
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
            "AI risk analysis completed | analysis=%s recommendation=%s patterns=%s time_ms=%s",
            analysis.id, recommendation, pattern_codes, processing_time_ms,
        )

        return {
            "success": True,
            "recommendation": recommendation,
            "patterns": pattern_codes,
            "processing_time_ms": processing_time_ms,
        }

    except GeminiRiskClientError:
        raise  # Let Celery retry

    except Exception as exc:
        error_type = type(exc).__name__
        logger.exception("AI risk analysis failed | analysis=%s error_type=%s", analysis.id, error_type)

        analysis.status = "failed"
        analysis.error_message = str(exc)[:500]
        analysis.completed_at = timezone.now()
        analysis.save(update_fields=["status", "error_message", "completed_at"])

        return {"error": "Analysis failed"}


def _validate_raw_request(raw_request: dict) -> bool:
    """Validate the structure of ai_raw_request."""
    if not isinstance(raw_request, dict):
        return False

    messages = raw_request.get("messages")
    if not isinstance(messages, list) or len(messages) < 2:
        return False

    for msg in messages[:2]:
        if not isinstance(msg, dict):
            return False
        if "content" not in msg or not isinstance(msg["content"], str):
            return False

    return True


def _validate_confidence(value) -> float:
    """Validate and normalize confidence value."""
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0

    if 0 <= confidence <= 1:
        confidence = confidence * 100

    return max(0.0, min(100.0, confidence))
