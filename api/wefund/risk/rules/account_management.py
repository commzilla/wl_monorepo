from datetime import timedelta
from django.utils import timezone
from wefund.models import LoginHistory
from wefund.risk.breach_handler import handle_breach

def run(enrollment):
    """
    Detects account management violations based on suspicious login activity.
    """
    try:
        user = getattr(getattr(enrollment, "client", None), "user", None)
        if not user:
            return  # No user to check

        DAYS_TO_CHECK = 30
        MAX_UNIQUE_IPS = 3
        MAX_UNIQUE_DEVICES = 3

        since = timezone.now() - timedelta(days=DAYS_TO_CHECK)

        recent_logins = LoginHistory.objects.filter(
            user=user,
            login_time__gte=since
        )

        unique_ips_count = (
            recent_logins.values_list('ip_address', flat=True)
            .exclude(ip_address__isnull=True)
            .exclude(ip_address__exact="")
            .distinct()
            .count()
        )

        unique_devices_count = (
            recent_logins.values_list('device_fingerprint', flat=True)
            .exclude(device_fingerprint__isnull=True)
            .exclude(device_fingerprint__exact="")
            .distinct()
            .count()
        )

        if unique_ips_count > MAX_UNIQUE_IPS or unique_devices_count > MAX_UNIQUE_DEVICES:
            reason = (
                f"Account Management Breach: User {user.username} logged in from "
                f"{unique_ips_count} unique IPs and {unique_devices_count} unique devices "
                f"in the past {DAYS_TO_CHECK} days."
            )
            handle_breach(enrollment, rule="Account Management", reason=reason)

    except Exception as e:
        # Log error but don't stop other rules from running
        import logging
        logging.exception(f"Error in account management rule for enrollment {enrollment.id}: {e}")
