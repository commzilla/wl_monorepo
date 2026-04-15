from __future__ import annotations

from dataclasses import dataclass
from collections import defaultdict, deque
from datetime import timedelta
from typing import Deque, Dict, Iterable, List, Optional, Set, Tuple

from django.utils import timezone

from wefund.models import MT5Trade, ChallengeEnrollment


BUY_CMD = 0
SELL_CMD = 1


def cmd_to_side(cmd: int) -> Optional[str]:
    if cmd == BUY_CMD:
        return "BUY"
    if cmd == SELL_CMD:
        return "SELL"
    return None


@dataclass(frozen=True)
class CopyTradingMatch:
    symbol: str
    side: str
    start_time: timezone.datetime
    end_time: timezone.datetime
    accounts: Tuple[int, ...]
    orders: Tuple[int, ...]


def _make_cluster_key(symbol: str, side: str, accounts: Set[int], start_time) -> str:
    """
    Stable dedupe key for the same cluster.
    Bucket start_time by seconds so it doesn't change per-millisecond.
    """
    bucket = int(start_time.timestamp())  # second bucket
    accounts_key = ",".join(str(a) for a in sorted(accounts))
    return f"{symbol}:{side}:{bucket}:{accounts_key}"


def detect_copy_trading(
    *,
    start_time,
    end_time,
    window_seconds: int = 5,
    min_accounts: int = 2,
    volume_tolerance_ratio: Optional[float] = None,  # e.g. 0.10 for ±10%
    price_tolerance_points: Optional[float] = None,  # optional, needs symbol digits logic if you want
) -> List[CopyTradingMatch]:
    """
    Detects clusters where >= min_accounts have trades on same symbol+side
    with open_time within window_seconds.

    Optional filters to reduce false positives:
      - volume_tolerance_ratio: require volumes to be close to each other
      - price_tolerance_points: require open_price closeness (advanced)
    """

    window = timedelta(seconds=window_seconds)

    # Expand the query a bit so edges don't miss cross-boundary windows.
    qs = (
        MT5Trade.objects
        .filter(open_time__gte=start_time - window, open_time__lte=end_time + window)
        .filter(cmd__in=[BUY_CMD, SELL_CMD])
        .only("account_id", "order", "symbol", "cmd", "volume", "open_time", "open_price", "digits")
        .order_by("symbol", "cmd", "open_time")
    )

    # deque per (symbol, cmd)
    buffers: Dict[Tuple[str, int], Deque[MT5Trade]] = defaultdict(deque)

    seen_clusters: Set[str] = set()
    matches: List[CopyTradingMatch] = []

    for trade in qs.iterator(chunk_size=5000):
        key = (trade.symbol, trade.cmd)
        buf = buffers[key]

        # drop old trades outside window
        min_time = trade.open_time - window
        while buf and buf[0].open_time < min_time:
            buf.popleft()

        buf.append(trade)

        # compute distinct accounts
        accounts = {t.account_id for t in buf}
        if len(accounts) < min_accounts:
            continue

        side = cmd_to_side(trade.cmd)
        if not side:
            continue

        # Optional: reduce false positives using volume similarity
        if volume_tolerance_ratio is not None:
            vols = [float(t.volume) for t in buf]
            vmin, vmax = min(vols), max(vols)
            if vmin <= 0:
                continue
            if (vmax - vmin) / vmin > volume_tolerance_ratio:
                continue

        # Optional: price tolerance (simple numeric closeness)
        if price_tolerance_points is not None:
            prices = [float(t.open_price) for t in buf]
            pmin, pmax = min(prices), max(prices)
            if (pmax - pmin) > price_tolerance_points:
                continue

        start = min(t.open_time for t in buf)
        end = max(t.open_time for t in buf)

        cluster_key = _make_cluster_key(trade.symbol, side, accounts, start)
        if cluster_key in seen_clusters:
            continue
        seen_clusters.add(cluster_key)

        orders = sorted({int(t.order) for t in buf})
        matches.append(
            CopyTradingMatch(
                symbol=trade.symbol,
                side=side,
                start_time=start,
                end_time=end,
                accounts=tuple(sorted(accounts)),
                orders=tuple(orders),
            )
        )

    return matches


def enrich_accounts_with_clients(account_ids: Iterable[int]) -> Dict[int, dict]:
    """
    Bulk map MT5 account_id -> {enrollment_id, client_id, full_name, email, status}
    Note: your ChallengeEnrollment.mt5_account_id is CharField, so we cast to string.
    Strongly recommended: store mt5_account_id as BigIntegerField going forward.
    """
    account_ids = list(set(int(a) for a in account_ids))
    str_ids = [str(a) for a in account_ids]

    enrollments = (
        ChallengeEnrollment.objects
        .filter(mt5_account_id__in=str_ids)
        .select_related("client__user", "challenge")
        .only(
            "id", "mt5_account_id", "status",
            "client__id", "client__user__first_name", "client__user__last_name",
            "client__user__email", "challenge__name"
        )
    )

    out: Dict[int, dict] = {}
    for e in enrollments:
        try:
            aid = int(e.mt5_account_id)
        except (TypeError, ValueError):
            continue

        user = e.client.user
        out[aid] = {
            "enrollment_id": str(e.id),
            "client_id": str(e.client.id),
            "client_name": (user.get_full_name() or user.username),
            "email": user.email,
            "challenge": e.challenge.name,
            "status": e.status,
        }
    return out
