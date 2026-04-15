# wefund/risk/rules/min_trade_duration.py
from datetime import timedelta
from django.utils import timezone
from wefund.risk.base_rule import BaseRule
from trading.models import MT5Trade

class MinimumTradeDurationRule(BaseRule):
    """
    Soft breach rule:
    - During payout review, exclude any trade closed in less than 60 seconds.
    """

    MIN_DURATION = timedelta(seconds=60)

    def __init__(self, challenge_enrollment):
        """
        :param challenge_enrollment: ChallengeEnrollment instance for the account
        """
        self.challenge_enrollment = challenge_enrollment

    def check(self):
        """
        Run the rule and return list of trades to exclude.
        Only relevant for payout calculation.
        """
        if not self.challenge_enrollment.mt5_account_id:
            return []

        # Fetch all closed trades for this MT5 account
        trades = MT5Trade.objects.filter(
            account_id=self.challenge_enrollment.mt5_account_id
        )

        short_trades = []
        for trade in trades:
            duration = trade.close_time - trade.open_time
            if duration < self.MIN_DURATION:
                short_trades.append(trade)

        return short_trades

    def apply_to_payout(self, payout):
        """
        Adjust payout by excluding profits from short-duration trades.
        """
        short_trades = self.check()
        excluded_profit = sum([float(t.profit) for t in short_trades])

        payout.profit -= excluded_profit
        payout.net_profit = (payout.profit * payout.profit_share) / 100
        payout.save()

        return {
            "excluded_trade_count": len(short_trades),
            "excluded_profit": excluded_profit
        }
