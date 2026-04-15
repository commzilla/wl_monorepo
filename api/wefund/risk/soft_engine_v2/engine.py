from wefund.models import TraderPayout
from wefund.models import ChallengeEnrollment
from .rules import (
    daily_profit_limit,
    single_trade_profit_limit,
    lot_size_consistency,
    min_trade_duration,
    trade_aggregation,
)
from .soft_breach_handler import handle_soft_breach

RULES = [
    trade_aggregation,
    daily_profit_limit,
    single_trade_profit_limit,
    lot_size_consistency,
    min_trade_duration,
]

def run_soft_breach_engine(payout_id):
    """
    Run soft breach engine for a specific payout.
    Each soft breach is tied to this payout period.
    """
    try:
        payout = TraderPayout.objects.select_related(
            'challenge_enrollment__client',
            'challenge_enrollment__challenge'
        ).get(id=payout_id)
    except TraderPayout.DoesNotExist:
        return

    enrollment = payout.challenge_enrollment
    account_id = enrollment.mt5_account_id
    if not account_id:
        return

    # Determine payout period
    previous_payout = TraderPayout.objects.filter(
        challenge_enrollment=enrollment
    ).exclude(id=payout.id).order_by('-requested_at').first()

    start_time = previous_payout.requested_at if previous_payout else enrollment.start_date
    end_time = payout.requested_at

    total_pnl = float(payout.profit)
    excluded_profit = 0.0

    for rule in RULES:
        breaches = rule.run(enrollment, account_id=account_id, start_time=start_time, end_time=end_time)
        if breaches:
            for breach_data in breaches:
                handle_soft_breach(enrollment, account_id, breach_data, payout=payout)
                excluded_profit += float(breach_data.get("value", 0))

    # Update payout after exclusions
    payout.amount = max(total_pnl - excluded_profit, 0)
    payout.net_profit = (payout.amount * payout.profit_share) / 100
    payout.save()
