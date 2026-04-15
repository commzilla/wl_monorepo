"""
Economic Calendar Sync Tasks

Syncs high-impact economic events from Forex Factory API.
Runs daily at midnight UTC via Celery Beat.
"""

import logging
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Optional

import requests
from celery import shared_task
from django.db import transaction
from django.utils import timezone

from wefund.models import EconomicEvent, EconomicCalendarSyncSchedule

logger = logging.getLogger(__name__)

FOREX_FACTORY_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

# Time window in minutes based on impact level
IMPACT_TIME_WINDOWS = {
    'high': 5,
    'medium': 3,
    'low': 2,
}


def get_time_window(impact: str) -> int:
    """Get time window minutes based on impact level"""
    return IMPACT_TIME_WINDOWS.get(impact.lower(), 5)


def normalize_impact(impact: str) -> str:
    """Normalize impact value to lowercase"""
    if not impact:
        return 'low'
    impact_lower = impact.lower()
    if impact_lower in ['high', 'medium', 'low']:
        return impact_lower
    # Handle variations
    if 'high' in impact_lower:
        return 'high'
    if 'medium' in impact_lower or 'med' in impact_lower:
        return 'medium'
    return 'low'


def parse_forex_factory_datetime(date_str: str) -> Optional[datetime]:
    """
    Parse Forex Factory ISO datetime string into a datetime object.
    Format: "2026-02-08T01:00:00-05:00"
    Returns None if parsing fails.
    """
    if not date_str:
        logger.debug("Empty date string received")
        return None

    try:
        # Python 3.7+ handles ISO 8601 with timezone via fromisoformat()
        # But it doesn't handle the 'Z' suffix, so we replace it
        date_str_clean = date_str.replace('Z', '+00:00')

        # Parse ISO datetime string using built-in Python
        parsed = datetime.fromisoformat(date_str_clean)

        # Convert to UTC (naive datetime)
        if parsed.tzinfo is not None:
            parsed = parsed.astimezone(dt_timezone.utc).replace(tzinfo=None)

        logger.debug(f"Parsed datetime: {date_str} -> {parsed}")
        return parsed
    except ValueError as e:
        logger.warning(f"Failed to parse datetime: date={date_str}, error={e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error parsing datetime: date={date_str}, error={e}")
        return None


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_economic_calendar(self, force: bool = False) -> dict:
    """
    Sync economic calendar events from Forex Factory API.

    Args:
        force: If True, sync even if not due based on schedule

    Returns:
        Dict with sync results: created, updated, skipped counts
    """
    logger.info("Starting economic calendar sync | force=%s", force)

    # Get or create sync schedule
    schedule, created = EconomicCalendarSyncSchedule.objects.get_or_create(
        id='economic_calendar',
        defaults={'sync_interval_hours': 24, 'is_enabled': True}
    )

    # Check if sync is needed (unless forced)
    if not force:
        if not schedule.is_enabled:
            logger.info("Economic calendar sync is disabled")
            return {'status': 'skipped', 'reason': 'sync_disabled'}

        if schedule.next_sync_at and timezone.now() < schedule.next_sync_at:
            logger.info("Economic calendar sync not due yet | next=%s", schedule.next_sync_at)
            return {'status': 'skipped', 'reason': 'not_due'}

    result = {
        'status': 'success',
        'created': 0,
        'updated': 0,
        'skipped': 0,
        'errors': [],
    }

    try:
        # Fetch from Forex Factory API
        response = requests.get(FOREX_FACTORY_URL, timeout=30)
        response.raise_for_status()

        # Check for rate limiting (API returns HTML instead of JSON)
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type and 'text/html' in content_type:
            logger.warning("Forex Factory API rate limited - received HTML instead of JSON")
            result['status'] = 'error'
            result['error_message'] = 'Rate limited by Forex Factory. Please wait 5 minutes before trying again.'
            schedule.last_sync_result = result
            schedule.save()
            return result

        try:
            events_data = response.json()
        except ValueError as json_error:
            logger.error("Failed to parse JSON from Forex Factory: %s", json_error)
            result['status'] = 'error'
            result['error_message'] = 'Invalid JSON response from Forex Factory API (possibly rate limited)'
            schedule.last_sync_result = result
            schedule.save()
            return result

        if not isinstance(events_data, list):
            raise ValueError(f"Expected list of events from Forex Factory API, got {type(events_data)}")

        logger.info("Fetched %d events from Forex Factory", len(events_data))

        # Log first event for debugging
        if events_data:
            first_event = events_data[0]
            logger.info("Sample event: title=%s, date=%s, impact=%s",
                       first_event.get('title'), first_event.get('date'), first_event.get('impact'))

        # Process events
        with transaction.atomic():
            for event_data in events_data:
                try:
                    processed = process_forex_factory_event(event_data)
                    if processed == 'created':
                        result['created'] += 1
                    elif processed == 'updated':
                        result['updated'] += 1
                    else:
                        result['skipped'] += 1
                except Exception as e:
                    error_msg = f"Error processing event: {event_data.get('title', 'unknown')}: {str(e)}"
                    logger.warning(error_msg)
                    result['errors'].append(error_msg)

        # Update sync schedule
        schedule.last_sync_at = timezone.now()
        schedule.next_sync_at = timezone.now() + timedelta(hours=schedule.sync_interval_hours)
        schedule.last_sync_result = result
        schedule.save()

        logger.info(
            "Economic calendar sync completed | created=%d, updated=%d, skipped=%d",
            result['created'], result['updated'], result['skipped']
        )

    except requests.RequestException as e:
        result['status'] = 'error'
        result['error_message'] = f"API request failed: {str(e)}"
        logger.error("Forex Factory API request failed: %s", e)

        # Update schedule with error
        schedule.last_sync_result = result
        schedule.save()

        # Retry the task
        raise self.retry(exc=e)

    except Exception as e:
        result['status'] = 'error'
        result['error_message'] = str(e)
        logger.exception("Economic calendar sync failed")

        # Update schedule with error
        schedule.last_sync_result = result
        schedule.save()

    return result


def process_forex_factory_event(event_data: dict) -> str:
    """
    Process a single event from Forex Factory API.

    Returns: 'created', 'updated', or 'skipped'
    """
    # Extract fields
    title = event_data.get('title', '').strip()
    country = event_data.get('country', '').strip()  # This is actually the currency (e.g., "USD", "JPY")
    date_str = event_data.get('date', '')  # ISO 8601 format: "2026-02-08T01:00:00-05:00"
    impact = event_data.get('impact', 'Low')
    forecast = event_data.get('forecast', '')
    previous = event_data.get('previous', '')
    actual = event_data.get('actual', '')

    if not title or not country:
        return 'skipped'

    # Parse datetime (already includes timezone info)
    event_datetime = parse_forex_factory_datetime(date_str)
    if not event_datetime:
        return 'skipped'

    # Make datetime timezone-aware (it's already converted to UTC in parser)
    if timezone.is_naive(event_datetime):
        event_datetime = timezone.make_aware(event_datetime, dt_timezone.utc)

    # Normalize impact
    normalized_impact = normalize_impact(impact)

    # Calculate time window based on impact
    time_window = get_time_window(normalized_impact)

    # Country field is actually the currency code (USD, EUR, JPY, etc.)
    currency = country.upper()

    # Upsert the event
    event, created = EconomicEvent.objects.update_or_create(
        event_name=title,
        event_datetime=event_datetime,
        source='forex_factory',
        defaults={
            'currency': currency,
            'impact': normalized_impact,
            'time_window_minutes': time_window,
            'forecast_value': forecast if forecast else None,
            'previous_value': previous if previous else None,
            'actual_value': actual if actual else None,
            'is_active': True,
        }
    )

    return 'created' if created else 'updated'
