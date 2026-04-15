from decimal import Decimal
from django.utils import timezone
from zoneinfo import ZoneInfo

from wefund.models import MT5DailySnapshot

# Fixed broker timezone (GMT+2, no DST)
BROKER_TZ = ZoneInfo("Etc/GMT-2")


def get_starting_balance_for_today(enrollment) -> Decimal:
    account_id = None
    if enrollment.mt5_account_id:
        try:
            account_id = int(enrollment.mt5_account_id)
        except ValueError:
            account_id = None

    today = timezone.now().astimezone(BROKER_TZ).date()

    if account_id:
        try:
            snapshot = MT5DailySnapshot.objects.get(enrollment=enrollment, account_id=account_id, date=today)
            return snapshot.starting_balance
        except MT5DailySnapshot.DoesNotExist:
            pass

    fallback = Decimal(enrollment.account_size)
    print(
        f"[Snapshot Lookup] No snapshot for {account_id or 'N/A'} on {today}, "
        f"using enrollment.account_size = {fallback} as fallback."
    )
    return fallback