"""
Management command to check system health and send Slack alerts on status changes.

SETUP (required per environment — staging, production, etc.):
  1. Add to .env:        SLACK_HEALTH_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
  2. Restart Django:     supervisorctl restart wefund
  3. Add cron job:       */2 * * * * cd /home/stg-api/app/src && /home/stg-api/app/venv/bin/python3.13 manage.py health_alert >> /var/log/health_alert.log 2>&1
     (adjust paths for production venv/app directory)

IMPORTANT: This runs via cron, NOT Celery — so it can detect when Celery itself is down.

Usage:
    python manage.py health_alert              # Normal run (alerts on changes only)
    python manage.py health_alert --force      # Force alert even if status unchanged
    python manage.py health_alert --dry-run    # Test without sending Slack message
"""

import json
import logging
import os
import time
from datetime import datetime

from django.conf import settings
from django.core.management.base import BaseCommand

from api.health_views import SystemHealthView
from api.utils.slack import send_slack_message

logger = logging.getLogger(__name__)

STATE_FILE = "/tmp/health_alert_state.json"


def _load_state():
    try:
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"status": None, "failed_checks": [], "last_alert": None}


def _save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def _run_health_checks():
    """Run health checks directly (same logic as SystemHealthView)."""
    view = SystemHealthView()

    class FakeRequest:
        pass

    response = view.get(FakeRequest())
    return response.data


def _build_alert_blocks(health_data, previous_status):
    """Build Slack Block Kit blocks for a health status change alert."""
    status = health_data["status"]
    summary = health_data["summary"]
    checks = health_data["checks"]
    timestamp = health_data["timestamp"]

    # Status emoji and color
    status_config = {
        "healthy": {"emoji": ":white_check_mark:", "color": "#36a64f"},
        "degraded": {"emoji": ":warning:", "color": "#daa520"},
        "critical": {"emoji": ":rotating_light:", "color": "#ff0000"},
    }
    config = status_config.get(status, status_config["critical"])

    # Header
    transition = ""
    if previous_status and previous_status != status:
        prev_emoji = status_config.get(previous_status, {}).get("emoji", ":grey_question:")
        transition = f"  {prev_emoji} {previous_status} → {config['emoji']} *{status.upper()}*"
    else:
        transition = f"  {config['emoji']} *{status.upper()}*"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"System Health Alert — {status.upper()}",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    f"*Status Change*:{transition}\n"
                    f"*Summary*: {summary['ok']} OK  |  {summary.get('warn', 0)} Warnings  |  {summary.get('critical', 0)} Critical"
                ),
            },
        },
        {"type": "divider"},
    ]

    # List failed checks
    failed = {k: v for k, v in checks.items() if v["status"] != "ok"}
    if failed:
        lines = [":mag: *Failing Checks:*"]
        for key, check in failed.items():
            emoji = ":x:" if check["status"] == "critical" else ":warning:"
            detail = check.get("detail", "")
            if check.get("stale_seconds") and check.get("threshold_seconds"):
                age = check["stale_seconds"]
                age_str = f"{age}s" if age < 60 else f"{round(age / 60)}m" if age < 3600 else f"{round(age / 3600)}h"
                detail = f"Last run {age_str} ago (threshold: {check['threshold_seconds']}s)"
            lines.append(f"  {emoji} `{key}` — {check['status'].upper()}: {detail}")

        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n".join(lines)},
        })
    else:
        blocks.append({
            "type": "section",
            "text": {"type": "mrkdwn", "text": ":white_check_mark: All checks passing."},
        })

    # Recovered checks
    blocks.append({"type": "divider"})
    blocks.append({
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": f"Checked at {timestamp[:19].replace('T', ' ')} UTC"}],
    })

    return blocks


class Command(BaseCommand):
    help = "Check system health and send Slack alerts on status changes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Send alert even if status hasn't changed",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Run checks but don't send Slack message",
        )

    def handle(self, *args, **options):
        webhook_url = getattr(settings, "SLACK_HEALTH_WEBHOOK_URL", None)
        if not webhook_url:
            self.stderr.write(
                self.style.WARNING(
                    "SLACK_HEALTH_WEBHOOK_URL not set. Skipping alert."
                )
            )
            return

        force = options["force"]
        dry_run = options["dry_run"]

        # Run health checks
        try:
            health_data = _run_health_checks()
        except Exception as e:
            logger.exception("Health check failed: %s", e)
            self.stderr.write(self.style.ERROR(f"Health check error: {e}"))
            # Send emergency alert for check failure itself
            blocks = [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "System Health Alert — CHECK FAILURE"},
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f":fire: *Health check itself failed to execute*\n```{str(e)[:500]}```",
                    },
                },
            ]
            if not dry_run:
                send_slack_message(webhook_url, blocks)
            return

        current_status = health_data["status"]
        current_failed = sorted(
            k for k, v in health_data["checks"].items() if v["status"] != "ok"
        )

        # Load previous state
        state = _load_state()
        previous_status = state.get("status")
        previous_failed = state.get("failed_checks", [])

        # Determine if alert is needed
        status_changed = current_status != previous_status
        checks_changed = current_failed != previous_failed
        should_alert = force or status_changed or checks_changed

        self.stdout.write(
            f"Status: {current_status} (was: {previous_status or 'unknown'}) | "
            f"Failed: {current_failed or 'none'} | "
            f"Alert: {'YES' if should_alert else 'no'}"
        )

        if should_alert:
            blocks = _build_alert_blocks(health_data, previous_status)

            if dry_run:
                self.stdout.write(self.style.WARNING("DRY RUN — Slack message not sent"))
                self.stdout.write(json.dumps(blocks, indent=2))
            else:
                success = send_slack_message(webhook_url, blocks)
                if success:
                    self.stdout.write(self.style.SUCCESS("Slack alert sent"))
                else:
                    self.stderr.write(self.style.ERROR("Failed to send Slack alert"))

        # Save state
        _save_state({
            "status": current_status,
            "failed_checks": current_failed,
            "last_alert": datetime.utcnow().isoformat() if should_alert else state.get("last_alert"),
            "last_check": datetime.utcnow().isoformat(),
        })
