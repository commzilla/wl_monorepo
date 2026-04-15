import requests
import logging
from datetime import datetime, timedelta
from urllib.parse import urlencode
from django.conf import settings

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'


def get_auth_url(meeting_profile_id):
    """Generate Google OAuth consent URL."""
    params = {
        'client_id': settings.GOOGLE_CALENDAR_CLIENT_ID,
        'redirect_uri': settings.GOOGLE_CALENDAR_REDIRECT_URI,
        'response_type': 'code',
        'scope': SCOPES,
        'access_type': 'offline',
        'prompt': 'consent',
        'state': str(meeting_profile_id),
    }
    return f'{GOOGLE_AUTH_URL}?{urlencode(params)}'


def handle_callback(code, state):
    """
    Exchange authorization code for tokens and save to MeetingProfile.
    Returns the updated MeetingProfile.
    """
    from wefund.models import MeetingProfile

    payload = {
        'code': code,
        'client_id': settings.GOOGLE_CALENDAR_CLIENT_ID,
        'client_secret': settings.GOOGLE_CALENDAR_CLIENT_SECRET,
        'redirect_uri': settings.GOOGLE_CALENDAR_REDIRECT_URI,
        'grant_type': 'authorization_code',
    }

    resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    profile = MeetingProfile.objects.get(id=state)
    profile.google_access_token = data['access_token']
    profile.google_refresh_token = data.get('refresh_token', profile.google_refresh_token)
    profile.google_token_expiry = datetime.utcnow() + timedelta(seconds=data.get('expires_in', 3600))
    profile.google_calendar_connected = True
    if not profile.google_calendar_id:
        profile.google_calendar_id = 'primary'
    profile.save()

    logger.info(f"Google Calendar connected for profile {profile.slug}")
    return profile


def refresh_token_if_needed(meeting_profile):
    """Check expiry and refresh via Google API if needed."""
    if not meeting_profile.google_refresh_token:
        return False

    if meeting_profile.google_token_expiry and meeting_profile.google_token_expiry > datetime.utcnow():
        return True

    payload = {
        'client_id': settings.GOOGLE_CALENDAR_CLIENT_ID,
        'client_secret': settings.GOOGLE_CALENDAR_CLIENT_SECRET,
        'refresh_token': meeting_profile.google_refresh_token,
        'grant_type': 'refresh_token',
    }

    try:
        resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        meeting_profile.google_access_token = data['access_token']
        meeting_profile.google_token_expiry = datetime.utcnow() + timedelta(seconds=data.get('expires_in', 3600))
        meeting_profile.save(update_fields=['google_access_token', 'google_token_expiry', 'updated_at'])
        return True
    except requests.RequestException as e:
        logger.error(f"Failed to refresh Google token: {e}")
        return False


def get_busy_times(meeting_profile, date_start, date_end):
    """
    Fetch FreeBusy from Google Calendar API.
    Returns list of (start, end) datetime tuples representing busy periods.
    """
    if not meeting_profile.google_calendar_connected:
        return []

    if not refresh_token_if_needed(meeting_profile):
        logger.warning(f"Cannot refresh Google token for {meeting_profile.slug}")
        return []

    headers = {
        'Authorization': f'Bearer {meeting_profile.google_access_token}',
        'Content-Type': 'application/json',
    }

    calendar_id = meeting_profile.google_calendar_id or 'primary'

    payload = {
        'timeMin': date_start.isoformat() + 'Z' if not date_start.tzinfo else date_start.isoformat(),
        'timeMax': date_end.isoformat() + 'Z' if not date_end.tzinfo else date_end.isoformat(),
        'items': [{'id': calendar_id}],
    }

    try:
        resp = requests.post(
            f'{GOOGLE_CALENDAR_API}/freeBusy',
            json=payload,
            headers=headers,
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()

        busy_periods = []
        calendars = data.get('calendars', {})
        calendar_data = calendars.get(calendar_id, {})
        for busy in calendar_data.get('busy', []):
            start = datetime.fromisoformat(busy['start'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(busy['end'].replace('Z', '+00:00'))
            busy_periods.append((start, end))

        return busy_periods
    except requests.RequestException as e:
        logger.error(f"Failed to fetch Google Calendar busy times: {e}")
        return []
