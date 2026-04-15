from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.utils.timezone import now
from wefund.models import LoginHistory

def get_client_ip(request):
    """Extract client IP address from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

@receiver(user_logged_in)
def create_login_history(sender, request, user, **kwargs):
    ip_address = get_client_ip(request)
    device_fingerprint = request.META.get('HTTP_USER_AGENT', '')[:255]  # Trim if too long
    
    LoginHistory.objects.create(
        user=user,
        login_time=now(),
        ip_address=ip_address,
        device_fingerprint=device_fingerprint,
    )
