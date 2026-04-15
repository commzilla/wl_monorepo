import os
from celery import Celery
from celery.schedules import crontab
from kombu import Queue

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")

# Load config from Django settings with CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Ensure the worker consumes from both 'celery' and 'default' queues
app.conf.task_queues = [
    Queue('celery'),
    Queue('default'),
    Queue('trades'),
    Queue('risk'),
]

# Route heavy tasks to dedicated queues/workers
app.conf.task_routes = {
    'wefund.tasks.mt5_tasks.fetch_and_store_mt5_trades': {'queue': 'trades'},
    'wefund.tasks.risk_tasks.run_risk_evaluation': {'queue': 'risk'},
    'wefund.tasks.risk_tasks.evaluate_risk_chunk': {'queue': 'risk'},
}

# Autodiscover tasks from all installed apps
app.autodiscover_tasks()

# Beat schedule for periodic tasks
app.conf.beat_schedule = app.conf.get("beat_schedule", {})
app.conf.beat_schedule.update({
    "generate-daily-journal-insights": {
        "task": "wefund.tasks.journal_tasks.generate_daily_journal_insights",
        "schedule": crontab(hour=23, minute=30),
        "options": {"queue": "default"},
    },
    "check-abandoned-checkouts": {
        "task": "wefund.tasks.klaviyo_tasks.check_abandoned_checkouts",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "default"},
    },
    "capture-approved-paypal-orders": {
        "task": "wefund.tasks.payment_tasks.capture_approved_paypal_orders",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "default"},
    },
    "check-confirmo-payments": {
        "task": "wefund.tasks.payment_tasks.check_confirmo_payments",
        "schedule": crontab(minute="*/10"),
        "options": {"queue": "default"},
    },
    "expire-stale-card-orders": {
        "task": "wefund.tasks.payment_tasks.expire_stale_card_orders",
        "schedule": crontab(minute=0, hour="*/1"),
        "options": {"queue": "default"},
    },
    "retry-stuck-paid-orders": {
        "task": "wefund.tasks.payment_tasks.retry_stuck_paid_orders",
        "schedule": crontab(minute="*/5"),
        "options": {"queue": "default"},
    },
    "auto-extend-pending-payouts": {
        "task": "wefund.tasks.payout_tasks.auto_extend_pending_payouts",
        "schedule": crontab(minute=0, hour="*/1"),
        "options": {"queue": "default"},
    },
})
