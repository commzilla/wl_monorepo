"""Celery tasks for automated trading report generation and Slack notifications."""

import logging
from datetime import date, timedelta
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def generate_weekly_report():
    """
    Generate a weekly Top-5 trading report for the previous 7 days.
    Checks TradingReportConfig to see if weekly auto-generation is enabled.
    Runs via Celery Beat (registered dynamically through config).
    """
    from wefund.models import TradingReportConfig
    from api.analytics.trading_reports import generate_trading_report

    try:
        config = TradingReportConfig.objects.get(pk='trading_report')
    except TradingReportConfig.DoesNotExist:
        logger.info("TradingReportConfig not found, skipping weekly report.")
        return {"status": "skipped", "reason": "config_not_found"}

    if not config.is_enabled or not config.auto_weekly:
        logger.info("Weekly auto-report disabled, skipping.")
        return {"status": "skipped", "reason": "disabled"}

    today = date.today()
    period_end = today - timedelta(days=1)
    period_start = period_end - timedelta(days=6)

    try:
        report = generate_trading_report(
            period_start=period_start,
            period_end=period_end,
            period_type='weekly',
            user=None,
            is_auto=True,
        )
    except Exception:
        logger.exception("Failed to generate weekly trading report for %s – %s", period_start, period_end)
        return {"status": "error", "reason": "generation_failed"}

    if config.slack_enabled and config.slack_webhook_url:
        send_slack_notification.delay(report.id)

    logger.info("Weekly report %s generated for %s – %s", report.id, period_start, period_end)
    return {"status": "success", "report_id": report.id}


@shared_task
def generate_monthly_report():
    """
    Generate a monthly Top-5 trading report for the previous calendar month.
    Checks TradingReportConfig to see if monthly auto-generation is enabled.
    """
    from wefund.models import TradingReportConfig
    from api.analytics.trading_reports import generate_trading_report

    try:
        config = TradingReportConfig.objects.get(pk='trading_report')
    except TradingReportConfig.DoesNotExist:
        logger.info("TradingReportConfig not found, skipping monthly report.")
        return {"status": "skipped", "reason": "config_not_found"}

    if not config.is_enabled or not config.auto_monthly:
        logger.info("Monthly auto-report disabled, skipping.")
        return {"status": "skipped", "reason": "disabled"}

    today = date.today()
    # Previous calendar month
    first_of_current = today.replace(day=1)
    period_end = first_of_current - timedelta(days=1)
    period_start = period_end.replace(day=1)

    try:
        report = generate_trading_report(
            period_start=period_start,
            period_end=period_end,
            period_type='monthly',
            user=None,
            is_auto=True,
        )
    except Exception:
        logger.exception("Failed to generate monthly trading report for %s – %s", period_start, period_end)
        return {"status": "error", "reason": "generation_failed"}

    if config.slack_enabled and config.slack_webhook_url:
        send_slack_notification.delay(report.id)

    logger.info("Monthly report %s generated for %s – %s", report.id, period_start, period_end)
    return {"status": "success", "report_id": report.id}


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def send_slack_notification(self, report_id):
    """Send a Slack message with the report summary."""
    from wefund.models import TradingReport, TradingReportConfig
    from api.utils.slack import send_slack_message, format_trading_report_blocks

    try:
        report = TradingReport.objects.get(pk=report_id)
    except TradingReport.DoesNotExist:
        logger.error("TradingReport %s not found for Slack notification.", report_id)
        return {"status": "error", "reason": "report_not_found"}

    try:
        config = TradingReportConfig.objects.get(pk='trading_report')
    except TradingReportConfig.DoesNotExist:
        logger.error("TradingReportConfig not found, cannot send Slack notification.")
        return {"status": "error", "reason": "config_not_found"}

    if not config.slack_enabled or not config.slack_webhook_url:
        return {"status": "skipped", "reason": "slack_disabled"}

    blocks = format_trading_report_blocks(report)
    try:
        success = send_slack_message(config.slack_webhook_url, blocks)
    except Exception as exc:
        logger.warning("Slack notification error for report %s, retrying...", report_id, exc_info=True)
        raise self.retry(exc=exc)

    if success:
        report.slack_sent = True
        report.save(update_fields=['slack_sent'])
        logger.info("Slack notification sent for report %s", report_id)
        return {"status": "success"}
    else:
        logger.warning("Slack notification failed for report %s, retrying...", report_id)
        raise self.retry(exc=RuntimeError(f"Slack webhook returned non-200 for report {report_id}"))
