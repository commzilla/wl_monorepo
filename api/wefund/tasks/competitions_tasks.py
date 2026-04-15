from celery import shared_task
from decimal import Decimal
from django.db import transaction

from wefund.models import (
    Competition,
    CompetitionRegistration,
    CompetitionRankingSnapshot,
    MT5Trade,
)

from wefund.mt5_controller.utils import (
    fetch_user_balance,
    fetch_user_equity,
)


# ============================================================
# DISPATCHER TASK (CALLED BY CELERY BEAT)
# ============================================================

@shared_task
def run_all_competition_snapshots():
    """
    Dispatch snapshot updates for all ongoing competitions.
    One periodic task → many async snapshot jobs.
    """

    competitions = Competition.objects.filter(status="ongoing")

    for competition in competitions:
        update_competition_ranking_snapshot.delay(str(competition.id))


# ============================================================
# SNAPSHOT TASK (PER COMPETITION)
# ============================================================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 30},
)
def update_competition_ranking_snapshot(self, competition_id):
    """
    Updates leaderboard snapshot for a competition.
    One row per (competition, user).
    """

    try:
        competition = Competition.objects.get(
            id=competition_id,
            status="ongoing",
        )
    except Competition.DoesNotExist:
        return

    registrations = (
        CompetitionRegistration.objects
        .filter(
            competition=competition,
            challenge_enrollment__isnull=False,
            status="active",
            user__hidden_from_leaderboard=False,
        )
        .select_related(
            "user",
            "challenge_enrollment",
            "user__client_profile",
        )
    )

    leaderboard_rows = []

    # ------------------------------------------------
    # COLLECT LIVE DATA
    # ------------------------------------------------
    for reg in registrations:
        enrollment = reg.challenge_enrollment

        if not enrollment or not enrollment.mt5_account_id:
            continue

        try:
            account_id = int(enrollment.mt5_account_id)
        except (ValueError, TypeError):
            continue

        initial_balance = enrollment.account_size

        balance = fetch_user_balance(account_id) or Decimal("0.00")
        equity = fetch_user_equity(account_id) or Decimal("0.00")

        if initial_balance > 0:
            growth_percent = (
                (equity - initial_balance) / initial_balance
            ) * 100
        else:
            growth_percent = Decimal("0.00")

        total_trades = MT5Trade.objects.filter(
            account_id=account_id,
            is_closed=True,
        ).count()

        leaderboard_rows.append({
            "user": reg.user,
            "mt5_login": account_id,
            "equity": equity,
            "balance": balance,
            "growth_percent": round(growth_percent, 2),
            "total_trades": total_trades,
        })

    # ------------------------------------------------
    # SORT BY GROWTH (DESC)
    # ------------------------------------------------
    leaderboard_rows.sort(
        key=lambda x: x["growth_percent"],
        reverse=True,
    )

    # ------------------------------------------------
    # UPSERT SNAPSHOTS
    # ------------------------------------------------
    with transaction.atomic():
        for idx, row in enumerate(leaderboard_rows, start=1):
            CompetitionRankingSnapshot.objects.update_or_create(
                competition=competition,
                user=row["user"],
                defaults={
                    "rank": idx,
                    "mt5_login": str(row["mt5_login"]),
                    "equity": row["equity"],
                    "balance": row["balance"],
                    "growth_percent": row["growth_percent"],
                    "total_trades": row["total_trades"],
                },
            )