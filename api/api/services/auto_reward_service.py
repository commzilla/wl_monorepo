import logging
from decimal import Decimal
from django.db import transaction
from wefund.models import (
    AutoRewardRule,
    AutoRewardGrant,
    WeCoinWallet,
    WeCoinTransaction,
    Order,
    TraderPayout,
)

logger = logging.getLogger(__name__)


def check_and_grant_auto_rewards(user, trigger_type):
    """
    Check if the user has hit any auto-reward milestones for the given
    trigger_type ('purchase' or 'payout_approved') and grant WeCoins
    for any newly-reached thresholds.
    """
    # Count the user's lifetime events for this trigger
    if trigger_type == 'purchase':
        count = Order.objects.filter(
            user=user,
            status='completed',
            payment_status='paid',
        ).count()
    elif trigger_type == 'payout_approved':
        count = TraderPayout.objects.filter(
            trader=user,
            status='approved',
        ).count()
    else:
        logger.warning(f"Unknown auto-reward trigger_type: {trigger_type}")
        return

    # Find active rules the user qualifies for but hasn't been granted yet
    eligible_rules = (
        AutoRewardRule.objects
        .filter(trigger_type=trigger_type, is_active=True, threshold__lte=count)
        .exclude(grants__user=user)
        .order_by('threshold')
    )

    if not eligible_rules.exists():
        return

    for rule in eligible_rules:
        try:
            with transaction.atomic():
                # Double-check uniqueness inside transaction
                _, created = AutoRewardGrant.objects.get_or_create(
                    user=user,
                    rule=rule,
                )
                if not created:
                    continue

                wallet, _ = WeCoinWallet.objects.get_or_create(user=user)
                wallet.balance += Decimal(str(rule.reward_amount))
                wallet.save(update_fields=['balance'])

                WeCoinTransaction.objects.create(
                    wallet=wallet,
                    type='earn',
                    amount=rule.reward_amount,
                    description=f"Auto reward: {rule.title}",
                )
                logger.info(
                    f"Auto reward granted: {user.email} → {rule.reward_amount} WeCoins "
                    f"for '{rule.title}' (trigger={trigger_type}, threshold={rule.threshold})"
                )
        except Exception:
            logger.exception(
                f"Failed to grant auto reward '{rule.title}' to {user.email}"
            )
