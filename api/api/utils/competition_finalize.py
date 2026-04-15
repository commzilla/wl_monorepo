from decimal import Decimal
from django.utils import timezone

from wefund.models import (
    CompetitionRegistration,
    CompetitionPrize,
    CompetitionRankingSnapshot,
    MT5Trade,
)
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity  # adjust import to your actual location


def build_final_leaderboard_rows(competition):
    regs = (
        CompetitionRegistration.objects
        .filter(
            competition=competition,
            challenge_enrollment__isnull=False,
        )
        .select_related("user", "challenge_enrollment", "user__client_profile")
    )

    rows = []

    for reg in regs:
        enrollment = reg.challenge_enrollment
        mt5_login = getattr(enrollment, "mt5_account_id", None)
        if not mt5_login:
            continue

        initial_balance = enrollment.account_size or Decimal("0.00")
        live_balance = fetch_user_balance(mt5_login) or Decimal("0.00")
        live_equity = fetch_user_equity(mt5_login) or Decimal("0.00")

        if initial_balance > 0:
            growth_percent = ((live_equity - initial_balance) / initial_balance) * 100
        else:
            growth_percent = Decimal("0.00")

        total_trades = MT5Trade.objects.filter(
            mt5_login=mt5_login,
            trade_type="deal"
        ).count()

        profile = getattr(reg.user, "client_profile", None)
        if profile:
            first = (profile.address_info or {}).get("first_name", "")
            last = (profile.address_info or {}).get("last_name", "")
            trader_name = f"{first} {last}".strip() or reg.user.username
        else:
            trader_name = reg.user.username

        rows.append({
            "user": reg.user,
            "mt5_login": str(mt5_login),
            "initial_balance": initial_balance,
            "equity": live_equity,
            "balance": live_balance,
            "growth_percent": growth_percent.quantize(Decimal("0.01")),
            "total_trades": int(total_trades),
            "trader_name": trader_name,
        })

    rows.sort(key=lambda x: x["growth_percent"], reverse=True)

    for idx, row in enumerate(rows, start=1):
        row["rank"] = idx

    return rows


def prize_for_rank(competition, rank: int) -> str | None:
    prize = (
        CompetitionPrize.objects
        .filter(competition=competition, rank_from__lte=rank, rank_to__gte=rank)
        .order_by("rank_from")
        .first()
    )
    return prize.description if prize else None


def save_final_snapshots(competition, rows):
    # Replace existing snapshots for this competition (unique_together: competition+user)
    CompetitionRankingSnapshot.objects.filter(competition=competition).delete()

    objs = []
    for row in rows:
        objs.append(
            CompetitionRankingSnapshot(
                competition=competition,
                user=row["user"],
                mt5_login=row["mt5_login"],
                rank=row["rank"],
                growth_percent=row["growth_percent"],
                total_trades=row["total_trades"],
                equity=row["equity"],
                balance=row["balance"],
                captured_at=timezone.now(),
            )
        )

    CompetitionRankingSnapshot.objects.bulk_create(objs, batch_size=500)
