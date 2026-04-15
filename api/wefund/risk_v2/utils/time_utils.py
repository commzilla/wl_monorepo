# wefund/risk_v2/utils/time_utils.py

from __future__ import annotations
from datetime import date, datetime, timezone as dt_timezone
from typing import Dict, Iterable, List, Tuple
from django.utils import timezone


def to_broker_date(dt: datetime, broker_tz_str: str = "Etc/GMT-2") -> date:
    """
    Convert a naive/aware datetime into broker-local date.
    Default broker TZ is fixed GMT+2 (no DST).
    """
    from zoneinfo import ZoneInfo

    # FIX: Django 5 removed timezone.utc → use datetime.timezone.utc
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, dt_timezone.utc)

    broker_tz = ZoneInfo(broker_tz_str)
    return dt.astimezone(broker_tz).date()


def seconds_between(a: datetime, b: datetime) -> float:
    return abs((b - a).total_seconds())


def group_trades_by_broker_day(
    trades: Iterable,
    broker_tz_str: str = "Etc/GMT-2",
) -> Dict[Tuple[int, date], List]:
    """
    Group trades by (account_id, date) using the close_time's date directly.
    MT5 trades are typically stored in broker server time already.
    Trades are grouped by the day they were CLOSED.
    """
    buckets: Dict[Tuple[int, date], List] = {}
    for t in trades:
        # Use the date directly from close_time without timezone conversion
        # MT5 trades are stored in broker server time
        # Group by CLOSE date - a trade's profit is realized on the day it closed
        d = t.close_time.date()
        key = (t.account_id, d)
        buckets.setdefault(key, []).append(t)
    return buckets
