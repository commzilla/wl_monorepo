import requests
import logging

logger = logging.getLogger(__name__)

class MT5Client:
    def __init__(self, api_url, api_key):
        self.url = api_url
        self.api_key = api_key

    def call(self, payload):
        try:
            response = requests.post(self.url, json=payload, timeout=15)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.exception("MT5 API call failed")
            return {
                "response": "Abort",
                "systemErrorStatus": str(e),
                "applicationStatus": "Failed to call MT5"
            }

    # (Optional) keep your other method like `add_user()` here
