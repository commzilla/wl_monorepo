# wefund/risk_v2/utils/math_utils.py

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from statistics import mean, median
from typing import Iterable, List, Optional


def to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def safe_median(values: Iterable[float]) -> float:
    vals: List[float] = [float(v) for v in values if v is not None]
    if not vals:
        return 0.0
    return float(median(vals))


def safe_mean(values: Iterable[float]) -> float:
    vals: List[float] = [float(v) for v in values if v is not None]
    if not vals:
        return 0.0
    return float(mean(vals))


def percent_of(part: Decimal, whole: Decimal) -> Optional[Decimal]:
    """
    Return part / whole * 100 (as Decimal) or None if invalid.
    """
    whole = to_decimal(whole)
    part = to_decimal(part)
    if whole == 0:
        return None
    return (part / whole) * Decimal("100")
