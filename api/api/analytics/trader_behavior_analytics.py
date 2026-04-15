from datetime import timedelta
from django.db.models import (
    Sum,
    Avg,
    Count,
    Case,
    When,
    F,
    DecimalField,
    DurationField,
)
from django.db.models.expressions import ExpressionWrapper
from django.utils import timezone
from decimal import Decimal

from wefund.models import (
    ChallengeEnrollment,
    ClientProfile,
    MT5Trade,
)


# ---------------------------------------------------------------------------
# FILTER HELPERS
# ---------------------------------------------------------------------------

def apply_enrollment_filters(enrollments, request):
    """
    Only apply filters if provided — otherwise return full platform data.
    """
    program = request.GET.get("program")
    country = request.GET.get("country")
    account_size = request.GET.get("account_size")
    from_date = request.GET.get("from_date")
    to_date = request.GET.get("to_date")

    if program:
        enrollments = enrollments.filter(challenge__name__icontains=program)

    if country:
        enrollments = enrollments.filter(client__address_info__country=country)

    if account_size:
        enrollments = enrollments.filter(account_size=account_size)

    if from_date:
        enrollments = enrollments.filter(created_at__date__gte=from_date)

    if to_date:
        enrollments = enrollments.filter(created_at__date__lte=to_date)

    return enrollments


def get_account_ids(enrollments):
    """
    Convert mt5_account_id strings → ints for MT5Trade queries.
    """
    raw_ids = enrollments.values_list("mt5_account_id", flat=True)

    account_ids = []
    for x in raw_ids:
        if not x:
            continue
        s = str(x).strip()
        if not s.isdigit():
            continue
        try:
            account_ids.append(int(s))
        except ValueError:
            continue

    return list(set(account_ids))


def get_trades_query(account_ids, request):
    """
    If account_ids provided → filtered trades.
    Else → return platform-wide trades.
    """
    if account_ids:
        trades = MT5Trade.objects.filter(account_id__in=account_ids, is_closed=True)
    else:
        # Platform-wide trades (default analytics)
        trades = MT5Trade.objects.filter(is_closed=True)

    trade_from = request.GET.get("trade_from")
    trade_to = request.GET.get("trade_to")

    if trade_from:
        trades = trades.filter(close_time__date__gte=trade_from)
    if trade_to:
        trades = trades.filter(close_time__date__lte=trade_to)

    return trades


# ---------------------------------------------------------------------------
# TRADE DURATION ANALYTICS
# ---------------------------------------------------------------------------

def compute_trade_durations(trades):
    """
    Compute:
    - average duration
    - scalping / intraday / swing percentages
    """
    trades_dur = trades.annotate(
        duration=ExpressionWrapper(
            F("close_time") - F("open_time"),
            output_field=DurationField()
        )
    )

    agg = trades_dur.aggregate(avg_duration=Avg("duration"))
    avg_dur = agg["avg_duration"]

    scalping = intraday = swing = 0

    for d in trades_dur.values_list("duration", flat=True):
        if not d:
            continue
        sec = d.total_seconds()
        if sec < 300:  # < 5 minutes
            scalping += 1
        elif sec < 3600:  # < 1 hour
            intraday += 1
        else:
            swing += 1

    total = trades.count() or 1

    buckets = {
        "scalping_trades_pct": round(scalping * 100 / total, 2),
        "intraday_trades_pct": round(intraday * 100 / total, 2),
        "swing_trades_pct": round(swing * 100 / total, 2),
    }

    if avg_dur:
        sec = int(avg_dur.total_seconds())
        h = sec // 3600
        m = (sec % 3600) // 60
        s = sec % 60
        human = f"{h}h {m}m {s}s"
    else:
        sec = 0
        human = "0s"

    return sec, human, buckets


# ---------------------------------------------------------------------------
# MAIN ANALYTICS FUNCTION
# ---------------------------------------------------------------------------

def get_trader_behavior_analytics(request):
    """
    Platform-wide trader behavior analytics with optional filters.
    """

    # 1) Base enrollments (full platform unless filters applied)
    enrollments = ChallengeEnrollment.objects.all()
    enrollments = apply_enrollment_filters(enrollments, request)

    # 2) Account IDs → MT5 mapping
    account_ids = get_account_ids(enrollments)

    # 3) MT5 Trades
    trades = get_trades_query(account_ids, request)

    total_trades = trades.count()
    total_accounts = trades.values("account_id").distinct().count()

    # 4) Count distinct traders via enrollment mapping
    raw_ids = enrollments.values_list("mt5_account_id", flat=True)
    trader_count = (
        ChallengeEnrollment.objects.filter(mt5_account_id__in=list(set(raw_ids)))
        .values("client__user_id")
        .distinct()
        .count()
    )

    # No trades? Return empty structured response
    if total_trades == 0:
        return {
            "filters": {
                "program": request.GET.get("program"),
                "country": request.GET.get("country"),
                "account_size": request.GET.get("account_size"),
                "from_date": request.GET.get("from_date"),
                "to_date": request.GET.get("to_date"),
                "trade_from": request.GET.get("trade_from"),
                "trade_to": request.GET.get("trade_to"),
            },
            "summary": {},
            "behavior": {},
            "top_profitable_symbols": [],
            "top_loss_symbols": []
        }

    # -----------------------------------------------------------------------
    # PROFIT CALCULATIONS
    # -----------------------------------------------------------------------
    gross_profit = (
        trades.filter(profit__gt=0).aggregate(total=Sum("profit"))["total"]
        or Decimal("0")
    )

    gross_loss = (
        trades.filter(profit__lt=0).aggregate(total=Sum("profit"))["total"]
        or Decimal("0")
    )

    net_profit = (
        trades.aggregate(total=Sum("profit"))["total"]
        or Decimal("0")
    )

    avg_profit_per_trade = (
        net_profit / total_trades
        if total_trades else Decimal("0")
    )

    win_trades = trades.filter(profit__gt=0).count()
    loss_trades = trades.filter(profit__lt=0).count()

    win_rate = round(win_trades * 100 / total_trades, 2)
    loss_rate = round(loss_trades * 100 / total_trades, 2)

    # -----------------------------------------------------------------------
    # DURATION METRICS
    # -----------------------------------------------------------------------
    avg_dur_sec, avg_dur_human, duration_buckets = compute_trade_durations(trades)

    # -----------------------------------------------------------------------
    # SL / TP USAGE
    # -----------------------------------------------------------------------
    accounts_total = total_accounts or 1

    accounts_sl = trades.exclude(sl=0).values("account_id").distinct().count()
    accounts_tp = trades.exclude(tp=0).values("account_id").distinct().count()

    sl_usage = round(accounts_sl * 100 / accounts_total, 2)
    tp_usage = round(accounts_tp * 100 / accounts_total, 2)

    # -----------------------------------------------------------------------
    # EA USAGE (magic > 0)
    # -----------------------------------------------------------------------
    ea_trades = trades.filter(magic__gt=0).count()
    ea_usage = round(ea_trades * 100 / total_trades, 2)

    # -----------------------------------------------------------------------
    # TRADES PER ACCOUNT
    # -----------------------------------------------------------------------
    trades_per_acc = (
        trades.values("account_id")
        .annotate(cnt=Count("id"))
    )
    avg_trades_per_account = (
        sum(x["cnt"] for x in trades_per_acc) / len(trades_per_acc)
        if trades_per_acc else 0
    )

    # -----------------------------------------------------------------------
    # SYMBOL ANALYTICS
    # -----------------------------------------------------------------------
    symbol_stats = (
        trades.values("symbol")
        .annotate(
            net_profit=Sum("profit"),
            total_trades=Count("id"),
            avg_profit=Avg("profit")
        )
    )

    top_profit_symbols_qs = symbol_stats.filter(net_profit__gt=0).order_by("-net_profit")[:10]
    top_loss_symbols_qs = symbol_stats.filter(net_profit__lt=0).order_by("net_profit")[:10]

    top_profit_symbols = [
        {
            "symbol": s["symbol"],
            "net_profit": str(s["net_profit"]),
            "total_trades": s["total_trades"],
            "avg_profit_per_trade": str(s["avg_profit"] or Decimal("0")),
        }
        for s in top_profit_symbols_qs
    ]

    top_loss_symbols = [
        {
            "symbol": s["symbol"],
            "net_profit": str(s["net_profit"]),  # negative
            "total_trades": s["total_trades"],
            "avg_profit_per_trade": str(s["avg_profit"] or Decimal("0")),
        }
        for s in top_loss_symbols_qs
    ]

    # Symbol concentration → % of trades in top 3 symbols
    top3 = symbol_stats.order_by("-total_trades")[:3]
    top3_total = sum(s["total_trades"] for s in top3)
    symbol_concentration = round(top3_total * 100 / total_trades, 2)

    # -----------------------------------------------------------------------
    # FINAL STRUCTURED OUTPUT
    # -----------------------------------------------------------------------
    return {
        "filters": {
            "program": request.GET.get("program"),
            "country": request.GET.get("country"),
            "account_size": request.GET.get("account_size"),
            "from_date": request.GET.get("from_date"),
            "to_date": request.GET.get("to_date"),
            "trade_from": request.GET.get("trade_from"),
            "trade_to": request.GET.get("trade_to"),
        },

        "summary": {
            "total_trades": total_trades,
            "total_accounts": total_accounts,
            "total_traders": trader_count,
            "win_rate_pct": win_rate,
            "loss_rate_pct": loss_rate,
            "gross_profit": str(gross_profit),
            "gross_loss": str(gross_loss),
            "net_profit": str(net_profit),
            "avg_profit_per_trade": str(avg_profit_per_trade),
            "avg_trade_duration_seconds": avg_dur_sec,
            "avg_trade_duration_human": avg_dur_human,
        },

        "behavior": {
            "sl_usage_pct": sl_usage,
            "tp_usage_pct": tp_usage,
            "avg_volume": trades.aggregate(avg=Avg("volume"))["avg"] or 0,
            "symbol_concentration_top3_pct": symbol_concentration,
            "style_distribution": duration_buckets,
            "ea_usage_pct": ea_usage,
            "avg_trades_per_account": round(avg_trades_per_account, 2),
        },

        "top_profitable_symbols": top_profit_symbols,
        "top_loss_symbols": top_loss_symbols,
    }
