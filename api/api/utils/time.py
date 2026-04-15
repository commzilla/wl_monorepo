from datetime import datetime
from zoneinfo import ZoneInfo

UTC = ZoneInfo("UTC")
GMT2 = ZoneInfo("Etc/GMT-2")  # fixed GMT+2

def make_naive(dt):
    """
    Return naive datetime.
    - If dt is unix timestamp => interpret as UTC.
    - If dt is aware => drop tzinfo.
    - If dt is naive => return as-is.
    """
    if dt is None:
        return None
    if isinstance(dt, (int, float)):
        return datetime.utcfromtimestamp(dt)
    return dt.replace(tzinfo=None)

def utc_to_gmt2_naive(dt):
    """
    Convert a UTC datetime (naive or aware) into GMT+2 and return a NAIVE datetime
    suitable for DB storage when USE_TZ=False.

    - If dt is naive, assume it represents UTC.
    - If dt is aware, convert from its tz to UTC first.
    """
    if dt is None:
        return None

    # normalize to aware UTC
    if dt.tzinfo is None:
        dt_utc = dt.replace(tzinfo=UTC)  # assume naive means UTC
    else:
        dt_utc = dt.astimezone(UTC)

    # convert to GMT+2 and strip tzinfo for DB
    return dt_utc.astimezone(GMT2).replace(tzinfo=None)

def now_gmt2_naive():
    """
    Current time in GMT+2 as NAIVE datetime (DB storage for USE_TZ=False).
    """
    return datetime.now(UTC).astimezone(GMT2).replace(tzinfo=None)
