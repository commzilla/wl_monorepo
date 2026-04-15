# wefund/risk_v2/utils/helpers.py
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Sequence, Tuple

from django.db.models import Q

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from wefund.models import (
    MT5Trade,
    TraderPayout,
    ChallengeEnrollment,
    EnrollmentAccount,
)

def get_last_payout_time(payout: TraderPayout):
    last_payout = (
        TraderPayout.objects.filter(
            trader=payout.trader,
            requested_at__lt=payout.requested_at,
            status__in=["approved", "paid", "rejected"]
        )
        .order_by("-requested_at")
        .first()
    )
    return last_payout.requested_at if last_payout else None


def get_enrollment_for_payout(payout: TraderPayout) -> ChallengeEnrollment | None:
    """
    Resolves the ChallengeEnrollment associated with a payout.

    - primary: payout.challenge_enrollment
    - fallback: first enrollment of client's profile (if any)
    """
    if payout.challenge_enrollment:
        return payout.challenge_enrollment

    client_profile = getattr(payout.trader, "client_profile", None)
    if not client_profile:
        return None

    return (
        client_profile.challenge_enrollments.order_by("-created_at").first()
    )


def get_account_ids_for_enrollment(enrollment: ChallengeEnrollment) -> List[int]:
    """
    Returns all MT5 account IDs related to this enrollment across phases:

        - EnrollmentAccount rows (phase-1, phase-2, live-trader) with status=active|archived
        - Fallback: enrollment.mt5_account_id if present
    """
    account_ids: List[int] = []

    # From EnrollmentAccount
    accounts = enrollment.accounts.filter(
        status__in=["active", "archived"]
    ).exclude(mt5_account_id__isnull=True).exclude(mt5_account_id__exact="")

    for acc in accounts:
        try:
            account_ids.append(int(acc.mt5_account_id))
        except (TypeError, ValueError):
            continue

    # Fallback: older single account linkage
    if enrollment.mt5_account_id:
        try:
            aid = int(enrollment.mt5_account_id)
            if aid not in account_ids:
                account_ids.append(aid)
        except (TypeError, ValueError):
            pass

    return account_ids


def get_trades_for_accounts(account_ids: Iterable[int]) -> Sequence[MT5Trade]:
    """
    Fetch all MT5Trade rows for the given account IDs.
    """
    return (
        MT5Trade.objects.filter(account_id__in=list(account_ids))
        .only(
            "account_id",
            "order",
            "symbol",
            "digits",
            "cmd",
            "volume",
            "open_time",
            "open_price",
            "close_time",
            "close_price",
            "profit",
        )
        .order_by("open_time")
    )


def get_trades_for_payout(
    payout: TraderPayout,
    *,
    start_date=None,   # OPTIONAL
    end_date=None,     # OPTIONAL
) -> Tuple[List[TradeRecord], Dict[str, Any]]:

    enrollment = get_enrollment_for_payout(payout)
    if not enrollment:
        return [], {
            "payout": payout,
            "enrollment": None,
            "account_ids": [],
            "account_size": None,
            "currency": None,
        }

    account_id = int(enrollment.mt5_account_id) if enrollment.mt5_account_id else None
    if not account_id:
        return [], {
            "payout": payout,
            "enrollment": enrollment,
            "account_ids": [],
            "account_size": float(enrollment.account_size),
            "currency": enrollment.currency,
        }

    # DEFAULT WINDOW (existing behavior)
    last_payout_time = get_last_payout_time(payout)
    default_start = last_payout_time
    default_end = payout.requested_at

    # OVERRIDE IF PROVIDED
    start_time = start_date or default_start
    end_time = end_date or default_end

    qs = MT5Trade.objects.filter(account_id=account_id)

    if start_time:
        qs = qs.filter(close_time__gt=start_time)

    if end_time:
        qs = qs.filter(close_time__lte=end_time)

    qs = qs.only(
        "account_id", "order", "symbol", "digits", "cmd",
        "volume", "open_time", "open_price",
        "close_time", "close_price", "profit"
    ).order_by("open_time")

    trades = [convert_trade(t) for t in qs]

    context = {
        "payout": payout,
        "enrollment": enrollment,
        "account_ids": [account_id],
        "account_size": float(enrollment.account_size),
        "currency": enrollment.currency,
        "last_payout_time": last_payout_time,
        "scan_window_start": start_time,
        "scan_window_end": end_time,
        "custom_date_filter": bool(start_date or end_date),  # metadata flag
    }

    return trades, context



# ---- Global severity scoring helpers ----

SEVERITY_WEIGHTS: Dict[str, int] = {
    "info": 1,
    "low": 3,
    "medium": 6,
    "high": 10,
    "critical": 15,
}


def severity_to_weight(severity: str) -> int:
    return SEVERITY_WEIGHTS.get(severity, 3)

@dataclass(frozen=True)
class TradeRecord:
    """
    Lightweight, read-only snapshot of an MT5Trade used by Risk Engine v2.

    Only contains the fields required by the rules:
    - order, symbol, digits, cmd, volume, open_time, open_price,
      close_time, close_price, profit
    """
    account_id: int
    order: int
    symbol: str
    digits: int
    cmd: int  # 0 = buy, 1 = sell (MT5 convention)
    volume: float
    open_time: datetime
    open_price: Decimal
    close_time: datetime
    close_price: Decimal
    profit: Decimal

    @property
    def is_buy(self) -> bool:
        return self.cmd == 0

    @property
    def is_sell(self) -> bool:
        return self.cmd == 1

    @property
    def duration_seconds(self) -> float:
        return (self.close_time - self.open_time).total_seconds()

    @property
    def direction_str(self) -> str:
        if self.is_buy:
            return "BUY"
        if self.is_sell:
            return "SELL"
        return f"CMD_{self.cmd}"

def convert_trade(t: MT5Trade) -> TradeRecord:
    return TradeRecord(
        account_id=t.account_id,
        order=t.order,
        symbol=t.symbol,
        digits=t.digits,
        cmd=t.cmd,
        volume=float(t.volume),
        open_time=t.open_time,
        open_price=t.open_price,
        close_time=t.close_time,
        close_price=t.close_price,
        profit=t.profit,
    )


def group_by_account(trades: Sequence[TradeRecord]) -> Dict[int, List[TradeRecord]]:
    buckets: Dict[int, List[TradeRecord]] = {}
    for t in trades:
        buckets.setdefault(t.account_id, []).append(t)
    # ensure time ordering per account (oldest → newest)
    for acc_id, items in buckets.items():
        items.sort(key=lambda x: x.open_time)
    return buckets


def group_by_symbol(trades: Sequence[TradeRecord]) -> Dict[str, List[TradeRecord]]:
    buckets: Dict[str, List[TradeRecord]] = {}
    for t in trades:
        buckets.setdefault(t.symbol, []).append(t)
    for sym, items in buckets.items():
        items.sort(key=lambda x: x.open_time)
    return buckets


def sort_by_open_time(trades: Iterable[TradeRecord]) -> List[TradeRecord]:
    return sorted(trades, key=lambda x: x.open_time)