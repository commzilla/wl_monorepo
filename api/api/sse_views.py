import json
import time
from datetime import timedelta
from django.utils import timezone
from zoneinfo import ZoneInfo
from django.http import StreamingHttpResponse
from .permissions import HasPermission
from django.views import View

from wefund.models import ChallengeEnrollment, ChallengePhase, MT5DailySnapshot, MT5Trade
from wefund.mt5_controller.utils import fetch_user_equity, fetch_user_balance

class EnrollmentManualBreachScanSSEView(View):
    """
    SSE endpoint to stream manual breach scan results rule-by-rule.
    Bypasses DRF's renderer negotiation.
    """

    def dispatch(self, request, *args, **kwargs):
        # optional: enforce your custom permission manually
        if not request.user.is_authenticated or not request.user.has_perm_code('support.view'):
            return StreamingHttpResponse(
                self.event_stream([{"error": "Permission denied."}]),
                content_type="text/event-stream"
            )
        return super().dispatch(request, *args, **kwargs)

    def get(self, request, enrollment_id):
        enrollment = ChallengeEnrollment.objects.select_related(
            "challenge", "client__user"
        ).filter(id=enrollment_id).first()
        if not enrollment:
            return StreamingHttpResponse(
                self.event_stream([{"error": "Invalid enrollment."}]),
                content_type="text/event-stream"
            )

        if not enrollment.mt5_account_id:
            return StreamingHttpResponse(
                self.event_stream([{"error": "No MT5 account linked."}]),
                content_type="text/event-stream"
            )

        # --- Event generator ---
        def generate():
            phase_type = enrollment.get_current_phase_type()
            if not phase_type:
                yield self.format_event({"error": "No active phase."})
                return

            try:
                phase = ChallengePhase.objects.get(
                    challenge=enrollment.challenge, phase_type=phase_type
                )
            except ChallengePhase.DoesNotExist:
                yield self.format_event({"error": "Phase config not found."})
                return

            account_id = int(enrollment.mt5_account_id)
            equity = fetch_user_equity(account_id)
            balance = fetch_user_balance(account_id)

            today = timezone.now().astimezone(ZoneInfo("Etc/GMT-2")).date()
            has_trades = MT5Trade.objects.filter(account_id=account_id).exists()

            # --- Rule 1: Max Daily Loss ---
            yield self.format_event({"checking": "Max Daily Loss"})
            time.sleep(0.5)  # simulate progressive output
            if has_trades:
                snapshot = MT5DailySnapshot.objects.filter(
                    enrollment=enrollment, date=today
                ).first()
                start_balance = float(snapshot.starting_balance) if snapshot else float(enrollment.account_size)
                current_equity = float(equity or start_balance)
                max_daily_loss_percent = float(phase.max_daily_loss)
                max_loss_amount = start_balance * (max_daily_loss_percent / 100.0)
                threshold = start_balance - max_loss_amount

                if current_equity < threshold:
                    yield self.format_event({
                        "rule": "Max Daily Loss",
                        "status": "breached",
                        "reason": (
                            f"Equity dropped below permitted daily threshold.\n"
                            f"Start Balance: ${start_balance:.2f}\n"
                            f"Allowed Max Drop ({max_daily_loss_percent}%): -${max_loss_amount:.2f}\n"
                            f"Current Equity: ${current_equity:.2f}\n"
                            f"Threshold: ${threshold:.2f}"
                        )
                    })
                else:
                    yield self.format_event({
                        "rule": "Max Daily Loss",
                        "status": "passed",
                        "stats": {
                            "start_balance": start_balance,
                            "current_equity": current_equity,
                            "threshold": threshold
                        }
                    })
            else:
                yield self.format_event({
                    "rule": "Max Daily Loss",
                    "status": "skipped",
                    "reason": "No trades found for this account."
                })

            # --- Rule 2: Max Total Loss ---
            yield self.format_event({"checking": "Max Total Loss"})
            time.sleep(0.5)
            if has_trades:
                account_size = float(enrollment.account_size)
                max_loss_percent = float(phase.max_loss)
                threshold_equity = account_size * (1 - max_loss_percent / 100.0)
                current_equity = float(equity or 0.0)

                if current_equity < threshold_equity:
                    yield self.format_event({
                        "rule": "Max Total Loss",
                        "status": "breached",
                        "reason": (
                            f"Max Total Loss breached: Equity ${current_equity:.2f} "
                            f"fell below threshold ${threshold_equity:.2f} "
                            f"(Max Loss {max_loss_percent}%)"
                        )
                    })
                else:
                    yield self.format_event({
                        "rule": "Max Total Loss",
                        "status": "passed",
                        "stats": {
                            "account_size": account_size,
                            "current_equity": current_equity,
                            "threshold": threshold_equity
                        }
                    })
            else:
                yield self.format_event({
                    "rule": "Max Total Loss",
                    "status": "skipped",
                    "reason": "No trades found for this account."
                })

            # --- Rule 3: Inactivity ---
            yield self.format_event({"checking": "Inactivity"})
            time.sleep(0.5)
            last_trade = MT5Trade.objects.filter(account_id=account_id).order_by("-close_time").first()
            if last_trade:
                last_trade_time = last_trade.close_time
                days_inactive = (timezone.now().date() - last_trade_time.date()).days
                if days_inactive >= 30:
                    yield self.format_event({
                        "rule": "Inactivity",
                        "status": "breached",
                        "reason": (
                            f"No trade activity in the last 30 days.\n"
                            f"Last Trade Date: {last_trade_time.strftime('%Y-%m-%d')}\n"
                            f"Days Inactive: {days_inactive} days"
                        )
                    })
                else:
                    yield self.format_event({
                        "rule": "Inactivity",
                        "status": "passed",
                        "stats": {
                            "last_trade_date": last_trade_time.strftime('%Y-%m-%d'),
                            "days_inactive": days_inactive
                        }
                    })
            else:
                yield self.format_event({
                    "rule": "Inactivity",
                    "status": "breached",
                    "reason": "No trades found at all."
                })

            # --- End of stream ---
            yield self.format_event({"done": True})

        return StreamingHttpResponse(generate(), content_type="text/event-stream")

    @staticmethod
    def format_event(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    @staticmethod
    def event_stream(messages):
        for m in messages:
            yield f"data: {json.dumps(m)}\n\n"
