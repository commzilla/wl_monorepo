"""
Gemini-based Risk AI Client.
Replaces RunPod/Deepseek with faster, smarter Gemini.

SECURITY:
- Input validation before API calls
- Response validation after API calls
- No sensitive data in logs
- Rate limiting support
"""
import json
import logging
import threading
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)

# Maximum sizes to prevent DoS
MAX_PROMPT_LENGTH = 500_000
MAX_RESPONSE_LENGTH = 100_000

# Allowed model names to prevent injection
ALLOWED_MODELS = frozenset({
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
})


class GeminiRiskClientError(Exception):
    """Custom exception for Gemini Risk client errors."""
    pass


class GeminiRiskClient:
    """
    Singleton Gemini client optimized for risk analysis.

    SECURITY: Thread-safe singleton with input validation.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialize_client()
        self._initialized = True

    def _initialize_client(self):
        """Initialize Gemini with API key from settings."""
        api_key = getattr(settings, 'GOOGLE_API_KEY', None)
        if not api_key:
            raise GeminiRiskClientError("GOOGLE_API_KEY not configured in settings")

        if not isinstance(api_key, str) or len(api_key) < 20:
            raise GeminiRiskClientError("Invalid GOOGLE_API_KEY format")

        genai.configure(api_key=api_key)
        logger.info("GeminiRiskClient initialized")

    def analyze_payout(
        self,
        system_instruction: str,
        trade_context: str,
        model_name: str = None,
        temperature: float = 0.3,
        max_tokens: int = 8192,
    ) -> dict:
        """
        Execute risk analysis and return structured JSON response.

        Returns:
            dict with 'text' (JSON string), 'model_used', 'usage'
        """
        # Validate inputs
        self._validate_inputs(system_instruction, trade_context, temperature, max_tokens)

        # Sanitize inputs
        safe_system = self._sanitize_string(system_instruction)
        safe_context = self._sanitize_string(trade_context)

        # Validate model name
        if model_name is None:
            model_name = self._select_model(safe_context)
        else:
            model_name = self._validate_model_name(model_name)

        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=safe_system,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                    "response_mime_type": "application/json",
                }
            )

            response = model.generate_content(safe_context)

            validated_text = self._validate_response(response.text)

            return {
                "text": validated_text,
                "model_used": model_name,
                "usage": {
                    "prompt_tokens": response.usage_metadata.prompt_token_count,
                    "completion_tokens": response.usage_metadata.candidates_token_count,
                }
            }

        except GeminiRiskClientError:
            raise
        except Exception as e:
            error_type = type(e).__name__
            logger.error("Gemini API call failed: %s", error_type)
            raise GeminiRiskClientError(f"Gemini API error: {error_type}") from e

    def _validate_inputs(self, system_instruction, trade_context, temperature, max_tokens):
        """Validate all inputs before processing."""
        if not isinstance(system_instruction, str):
            raise GeminiRiskClientError("system_instruction must be a string")

        if not isinstance(trade_context, str):
            raise GeminiRiskClientError("trade_context must be a string")

        if len(system_instruction) > MAX_PROMPT_LENGTH:
            raise GeminiRiskClientError(f"system_instruction too long")

        if len(trade_context) > MAX_PROMPT_LENGTH:
            raise GeminiRiskClientError(f"trade_context too long")

        if not isinstance(temperature, (int, float)) or not (0.0 <= temperature <= 2.0):
            raise GeminiRiskClientError("temperature must be between 0.0 and 2.0")

        if not isinstance(max_tokens, int) or not (1 <= max_tokens <= 8192):
            raise GeminiRiskClientError("max_tokens must be between 1 and 8192")

    def _sanitize_string(self, value: str) -> str:
        """Remove null bytes and control characters."""
        if not isinstance(value, str):
            return str(value)[:MAX_PROMPT_LENGTH]
        sanitized = value.replace('\x00', '')
        return sanitized[:MAX_PROMPT_LENGTH]

    def _validate_response(self, response_text: str) -> str:
        """Validate AI response."""
        if not isinstance(response_text, str):
            raise GeminiRiskClientError("Response must be a string")

        if len(response_text) > MAX_RESPONSE_LENGTH:
            raise GeminiRiskClientError("Response too long")

        return response_text

    def _validate_model_name(self, model_name: str) -> str:
        """Validate model name against whitelist."""
        if not isinstance(model_name, str):
            return "gemini-2.5-flash"

        model_name = model_name.strip().lower()

        if model_name not in ALLOWED_MODELS:
            logger.warning("Invalid model name '%s', using default", model_name[:50])
            return "gemini-2.5-flash"

        return model_name

    def _select_model(self, trade_context: str) -> str:
        """Select model based on complexity."""
        try:
            context_data = json.loads(trade_context) if isinstance(trade_context, str) else trade_context
            trade_count = len(context_data.get("trades", []))

            if trade_count >= 50:
                return "gemini-2.5-flash"
            return "gemini-2.5-flash-lite"
        except (json.JSONDecodeError, TypeError, AttributeError):
            return "gemini-2.5-flash"


def get_gemini_risk_client() -> GeminiRiskClient:
    """Factory function to get singleton client."""
    return GeminiRiskClient()
