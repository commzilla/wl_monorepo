import requests
import logging
from datetime import timedelta
from django.conf import settings

logger = logging.getLogger(__name__)

DAILY_API_URL = getattr(settings, 'DAILY_API_URL', 'https://api.daily.co/v1')
DAILY_API_KEY = getattr(settings, 'DAILY_API_KEY', '')


def _headers():
    return {
        'Authorization': f'Bearer {DAILY_API_KEY}',
        'Content-Type': 'application/json',
    }


def create_room(name, duration_minutes, start_time):
    """
    Create a Daily.co room for a meeting.
    Room auto-expires 15 minutes after meeting end time.
    """
    exp = int((start_time + timedelta(minutes=duration_minutes + 15)).timestamp())

    payload = {
        'name': name,
        'properties': {
            'exp': exp,
            'enable_chat': True,
            'enable_screenshare': True,
            'enable_knocking': True,
            'start_video_off': False,
            'start_audio_off': False,
        }
    }

    try:
        resp = requests.post(f'{DAILY_API_URL}/rooms', json=payload, headers=_headers(), timeout=15)
        if resp.status_code == 400:
            error_body = resp.text
            logger.warning(f"Daily.co room creation 400: {error_body}")
            # If room already exists, fetch it
            if 'already exists' in error_body.lower():
                try:
                    get_resp = requests.get(f'{DAILY_API_URL}/rooms/{name}', headers=_headers(), timeout=15)
                    get_resp.raise_for_status()
                    existing = get_resp.json()
                    logger.info(f"Daily.co room fetched (already existed): {existing.get('name')}")
                    return {
                        'name': existing.get('name'),
                        'url': existing.get('url'),
                    }
                except requests.RequestException:
                    pass
            resp.raise_for_status()
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Daily.co room created: {data.get('name')}")
        return {
            'name': data.get('name'),
            'url': data.get('url'),
        }
    except requests.RequestException as e:
        logger.error(f"Failed to create Daily.co room: {e}")
        raise


def generate_meeting_token(room_name, user_name, is_owner=False):
    """
    Create a meeting token for joining a room.
    Owner tokens get host privileges.
    """
    payload = {
        'properties': {
            'room_name': room_name,
            'user_name': user_name,
            'is_owner': is_owner,
        }
    }

    try:
        resp = requests.post(f'{DAILY_API_URL}/meeting-tokens', json=payload, headers=_headers(), timeout=15)
        resp.raise_for_status()
        data = resp.json()
        return data.get('token')
    except requests.RequestException as e:
        logger.error(f"Failed to generate Daily.co token: {e}")
        raise


def delete_room(name):
    """Delete a Daily.co room (for cancelled meetings)."""
    try:
        resp = requests.delete(f'{DAILY_API_URL}/rooms/{name}', headers=_headers(), timeout=15)
        if resp.status_code == 404:
            logger.warning(f"Daily.co room not found for deletion: {name}")
            return
        resp.raise_for_status()
        logger.info(f"Daily.co room deleted: {name}")
    except requests.RequestException as e:
        logger.error(f"Failed to delete Daily.co room: {e}")
        raise
