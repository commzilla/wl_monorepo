"""
Event Logger Utility

Simple logging utility for tracking events in the application.
"""
import logging

logger = logging.getLogger(__name__)


def log_event(event_type: str, **kwargs):
    """
    Log an event with optional metadata.

    Args:
        event_type: Type/name of the event
        **kwargs: Additional event data
    """
    logger.info(f"[Event] {event_type}: {kwargs}")
