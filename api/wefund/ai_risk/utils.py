# wefund/ai_risk/utils.py

import re

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)

def strip_thinking(text: str) -> str:
    if not text:
        return text
    cleaned = _THINK_RE.sub("", text).strip()
    return cleaned or text.strip()
