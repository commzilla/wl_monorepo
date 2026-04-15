from decimal import Decimal
from django.utils import timezone
from wefund.models import (
    TraderPayout,
    MT5Trade,
)

def get_trade_direction(cmd: int) -> str:
    """
    Convert MT5 cmd to human-readable direction.
    """
    if cmd == 0:
        return "BUY"
    if cmd == 1:
        return "SELL"
    return "UNKNOWN"

def get_trade_duration_seconds(open_time, close_time) -> int | None:
    if not open_time or not close_time:
        return None
    return int((close_time - open_time).total_seconds())

def build_ai_risk_context(*, payout_id):
    """
    Build full AI risk analysis context for a payout.
    """

    payout = (
        TraderPayout.objects
        .select_related(
            "trader",
            "trader__client_profile",
            "challenge_enrollment",
            "challenge_enrollment__challenge",
        )
        .get(id=payout_id)
    )

    enrollment = payout.challenge_enrollment
    user = payout.trader
    profile = user.client_profile
    challenge = enrollment.challenge

    # ------------------------------------------------
    # Client Info
    # ------------------------------------------------
    client_info = {
        "name": user.get_full_name() or user.username,
        "email": user.email,
    }

    # ------------------------------------------------
    # Challenge Info
    # ------------------------------------------------
    challenge_info = {
        "challenge_name": challenge.name,
        "challenge_type": challenge.step_type,
        "phase": enrollment.get_current_phase_type(),
    }

    # ------------------------------------------------
    # MT5 Info
    # ------------------------------------------------
    mt5_info = {
        "account_id": enrollment.mt5_account_id,
        "account_size": float(enrollment.account_size),
        "currency": enrollment.currency,
    }

    # ------------------------------------------------
    # Payout Info
    # ------------------------------------------------
    requested_at = payout.requested_at or timezone.now()
    payout_info = {
        "requested_at": requested_at.isoformat(),
        "total_profit": float(payout.profit),
        "profit_split_percent": float(payout.profit_share),
        "net_profit": float(payout.net_profit),
        "released_fund": float(payout.released_fund),
        "is_custom_amount": payout.is_custom_amount,
        "exclude_amount": float(payout.exclude_amount or 0),
        "exclude_reason": payout.exclude_reason,
    }

    # ------------------------------------------------
    # Consistency Info (Risk Engine v2)
    # ------------------------------------------------
    consistency_info = None
    if hasattr(payout, "risk_scan") and payout.risk_scan:
        summary = payout.risk_scan.report.get("summary", {})
        consistency_info = {
            "global_score": summary.get("global_score"),
            "max_severity": summary.get("max_severity"),
            "recommended_action": summary.get("recommended_action"),
            "total_affected_pnl": summary.get("total_affected_pnl"),
            "total_violations": summary.get("total_violations"),
        }

    # ------------------------------------------------
    # Determine Trade Window
    # ------------------------------------------------
    previous_payout = (
        TraderPayout.objects
        .filter(
            challenge_enrollment=enrollment,
            requested_at__lt=requested_at,
            status__in=["approved", "paid", "rejected"]
        )
        .order_by("-requested_at")
        .first()
    )

    trade_start = (
        previous_payout.requested_at
        if previous_payout
        else enrollment.start_date
    )

    trade_end = requested_at

    # ------------------------------------------------
    # Fetch Trades
    # ------------------------------------------------
    trades_qs = (
        MT5Trade.objects
        .filter(
            account_id=enrollment.mt5_account_id,
            close_time__gt=trade_start,
            close_time__lte=trade_end,
        )
        .order_by("close_time")
    )

    trades = []
    for t in trades_qs:
        trades.append({
            "order_id": t.order,
            "symbol": t.symbol,
            "direction": get_trade_direction(t.cmd),
            "lot_size": float(t.volume),

            "open_time": (
                t.open_time.isoformat()
                if t.open_time else None
            ),
            "close_time": (
                t.close_time.isoformat()
                if t.close_time else None
            ),

            "open_price": float(t.open_price),
            "close_price": float(t.close_price),
            "profit": float(t.profit),

            # COMPUTED FIELD
            "duration_seconds": get_trade_duration_seconds(
                t.open_time,
                t.close_time
            ),
        })

    # ------------------------------------------------
    # Final Payload
    # ------------------------------------------------
    return {
        "client": client_info,
        "challenge": challenge_info,
        "mt5": mt5_info,
        "payout": payout_info,
        "consistency": consistency_info,
        "trade_window": {
            "start": trade_start.isoformat(),
            "end": trade_end.isoformat(),
        },
        "trades": trades,
    }
