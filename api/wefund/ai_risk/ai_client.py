import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class RunPodAIClientError(Exception):
    """Base exception for RunPod AI errors."""


class RunPodAIClient:
    """
    Client for interacting with RunPod AI inference endpoints.
    """

    def __init__(self):
        self.api_key = settings.RUNPOD_API_KEY
        self.endpoint_id = settings.RUNPOD_ENDPOINT_ID
        self.timeout = getattr(settings, "RUNPOD_TIMEOUT_SECONDS", 600)

        if not self.api_key or not self.endpoint_id:
            raise RuntimeError("RunPod API credentials are not configured")

        self.base_url = f"https://api.runpod.ai/v2/{self.endpoint_id}"

        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

    # ------------------------------------------------
    # Health Check
    # ------------------------------------------------
    def health_check(self) -> bool:
        try:
            resp = requests.get(
                f"{self.base_url}/health",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10,
            )
            return resp.status_code == 200
        except Exception:
            return False

    # ------------------------------------------------
    # Run Sync (Blocking)
    # ------------------------------------------------
    def run_sync(self, *, messages, max_tokens=9000, temperature=0.2) -> dict:
        """
        Execute a synchronous inference request (RunPod vLLM-compatible).
        """

        payload = {
            "input": {
                "messages": messages,
                "sampling_params": {
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "stop": None,
                }
            }
        }

        try:
            response = requests.post(
                f"{self.base_url}/runsync",
                headers=self.headers,
                json=payload,
                timeout=self.timeout,
            )
        except requests.RequestException as exc:
            logger.exception("RunPod request failed")
            raise RunPodAIClientError("RunPod request error") from exc

        if response.status_code != 200:
            logger.error(
                "RunPod error %s: %s",
                response.status_code,
                response.text,
            )
            raise RunPodAIClientError(
                f"RunPod returned {response.status_code}"
            )

        data = response.json()
        logger.info(
            "RunPod response received | keys=%s",
            list(data.keys()),
        )

        return self._parse_response(data)


    # ------------------------------------------------
    # Response Parsing (Normalize)
    # ------------------------------------------------
    def _parse_response(self, data: dict) -> dict:
        """
        Parse RunPod response (supports token-stream style outputs).
        """

        logger.info(
            "RunPod response received | keys=%s",
            list(data.keys()),
        )

        raw_response = data

        # ------------------------------------------------
        # Case 1: output is a LIST (most common for LLMs)
        # ------------------------------------------------
        output = data.get("output")

        if isinstance(output, list) and output:
            texts = []

            for item in output:
                choices = item.get("choices", [])
                for choice in choices:
                    tokens = choice.get("tokens", [])
                    if isinstance(tokens, list):
                        texts.extend(tokens)

            if texts:
                return {
                    "analysis_text": "".join(texts).strip(),
                    "raw_response": raw_response,
                }

        # ------------------------------------------------
        # Case 2: output is dict (fallback)
        # ------------------------------------------------
        if isinstance(output, dict):
            for key in ("text", "result", "content", "analysis"):
                value = output.get(key)
                if isinstance(value, str) and value.strip():
                    return {
                        "analysis_text": value.strip(),
                        "raw_response": raw_response,
                    }

        # ------------------------------------------------
        # Case 3: output is plain string
        # ------------------------------------------------
        if isinstance(output, str) and output.strip():
            return {
                "analysis_text": output.strip(),
                "raw_response": raw_response,
            }

        # ------------------------------------------------
        # FAILURE
        # ------------------------------------------------
        logger.error(
            "Unsupported RunPod response format | payload=%s",
            raw_response,
        )
        raise RunPodAIClientError("Unsupported RunPod response format")