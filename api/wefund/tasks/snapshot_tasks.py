import logging
from decimal import Decimal
from celery import shared_task
from django.utils import timezone
from zoneinfo import ZoneInfo

from wefund.models import ChallengeEnrollment, MT5DailySnapshot
from wefund.mt5_controller.utils import fetch_user_balance, fetch_user_equity

logger = logging.getLogger(__name__)

# Broker timezone (fixed GMT+2 — no DST)
BROKER_TZ = ZoneInfo("Etc/GMT-2")


@shared_task
def create_daily_snapshots():
    """
    Runs at broker midnight.
    Creates MT5DailySnapshot entry for each active enrollment & each MT5 account.
    """
    today = timezone.now().astimezone(BROKER_TZ).date()
    logger.info(f"[SNAPSHOT] Creating snapshots for {today}")

    enrollments = ChallengeEnrollment.objects.filter(is_active=True)

    for enrollment in enrollments:
        # ✅ SUPPORT MULTIPLE ACCOUNTS
        # If you now store accounts separately, replace this line:
        # accounts = enrollment.accounts.values_list("mt5_account_id", flat=True)
        # If still single mt5_account_id, just wrap in a list for now:
        accounts = [enrollment.mt5_account_id] if enrollment.mt5_account_id else []

        for account_id in accounts:
            if not account_id:
                continue

            # ✅ New uniqueness: (enrollment, account_id, date)
            if MT5DailySnapshot.objects.filter(
                enrollment=enrollment, account_id=account_id, date=today
            ).exists():
                continue

            balance = fetch_user_balance(account_id) or Decimal(0)
            equity = fetch_user_equity(account_id) or Decimal(0)

            MT5DailySnapshot.objects.create(
                enrollment=enrollment,
                account_id=account_id,
                date=today,
                starting_balance=balance,
                starting_equity=equity,
                total_profit=balance - enrollment.account_size,
                today_max_drawdown=Decimal(0.00),
                total_max_drawdown=Decimal(0.00),
            )
            logger.info(
                f"[SNAPSHOT] Created snapshot for {account_id} "
                f"(StartBal={balance}, StartEq={equity})"
            )


@shared_task
def update_daily_snapshots():
    """
    Runs at end-of-day broker time.
    Update MT5DailySnapshot entry with ending balance/equity, daily PnL, drawdowns.
    """
    today = timezone.now().astimezone(BROKER_TZ).date()
    logger.info(f"[SNAPSHOT] Updating snapshots for {today}")

    snapshots = MT5DailySnapshot.objects.filter(date=today)

    for snap in snapshots:
        balance = fetch_user_balance(snap.account_id) or Decimal(0)
        equity = fetch_user_equity(snap.account_id) or Decimal(0)

        snap.ending_balance = balance
        snap.ending_equity = equity
        snap.today_profit = balance - snap.starting_balance

        # 🔹 Drawdown vs starting equity
        today_drawdown = equity - snap.starting_equity
        snap.today_max_drawdown = (
            min(snap.today_max_drawdown, today_drawdown)
            if snap.today_max_drawdown else today_drawdown
        )

        snap.total_max_drawdown = (
            min(snap.total_max_drawdown, snap.today_max_drawdown)
            if snap.total_max_drawdown else snap.today_max_drawdown
        )

        snap.total_profit = balance - snap.enrollment.account_size

        # 🔹 Loss usage %
        try:
            phase_type = snap.enrollment.get_current_phase_type()
            phase = snap.enrollment.challenge.phases.get(phase_type=phase_type)

            daily_allowed_loss = (Decimal(phase.max_daily_loss) / Decimal(100)) * snap.starting_balance
            total_allowed_loss = (Decimal(phase.max_loss) / Decimal(100)) * snap.enrollment.account_size

            intraday_loss = abs(min(Decimal(0), snap.today_max_drawdown))
            snap.daily_loss_used = (
                (intraday_loss / daily_allowed_loss * 100) if daily_allowed_loss > 0 else 0
            )

            total_loss = max(Decimal(0), snap.enrollment.account_size - equity)
            snap.total_loss_used = (
                (total_loss / total_allowed_loss * 100) if total_allowed_loss > 0 else 0
            )

        except Exception as e:
            logger.error(f"[SNAPSHOT] Loss usage calc failed for {snap.account_id}: {e}")

        snap.save(update_fields=[
            "ending_balance", "ending_equity", "today_profit",
            "today_max_drawdown", "total_profit", "total_max_drawdown",
            "daily_loss_used", "total_loss_used", "updated_at"
        ])

        logger.info(
            f"[SNAPSHOT] Updated snapshot {snap.account_id} "
            f"(EndBal={balance}, EndEq={equity}, TodayPnL={snap.today_profit}, "
            f"TodayDD={snap.today_max_drawdown}, TotalDD={snap.total_max_drawdown})"
        )
