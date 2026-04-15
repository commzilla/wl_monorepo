import logging

from celery import shared_task
from django.utils import timezone

from api.services.zoho_books_service import (
    ZohoBooksRateLimitError,
    ZohoBooksSyncError,
    ZohoBooksService,
)
from api.zoho_export_views import assign_invoice_numbers, get_base_queryset
from wefund.models import ZohoSyncJob

logger = logging.getLogger(__name__)


def _add_error(job, phase, order, error_msg):
    """Append an error entry to the job's errors list."""
    job.errors.append({
        "phase": phase,
        "order_id": str(order.id),
        "email": order.customer_email,
        "error": str(error_msg)[:500],
    })
    # Keep only last 100 errors to avoid unbounded growth
    if len(job.errors) > 100:
        job.errors = job.errors[-100:]


@shared_task(
    bind=True,
    autoretry_for=(ZohoBooksRateLimitError,),
    retry_kwargs={"max_retries": 10},
    retry_backoff=True,
    retry_backoff_max=300,
    default_retry_delay=65,
    time_limit=3600,
    soft_time_limit=3300,
)
def run_zoho_sync(self, sync_job_id):
    """Orchestrate 3-phase Zoho Books sync: contacts → invoices → payments."""
    try:
        job = ZohoSyncJob.objects.get(id=sync_job_id)
    except ZohoSyncJob.DoesNotExist:
        logger.error("ZohoSyncJob %s not found", sync_job_id)
        return

    if job.status in ("completed", "failed"):
        logger.info("ZohoSyncJob %s already %s, skipping", sync_job_id, job.status)
        return

    job.started_at = timezone.now()
    job.celery_task_id = self.request.id or ""
    job.save(update_fields=["started_at", "celery_task_id"])

    service = ZohoBooksService()

    # Get and prepare orders
    qs = get_base_queryset(job.date_from, job.date_to)
    assign_invoice_numbers(qs, job.start_invoice_number)
    orders = list(get_base_queryset(job.date_from, job.date_to))

    job.total_orders = len(orders)
    job.save(update_fields=["total_orders"])

    try:
        # ── Phase 1: Contacts ───────────────────────────────────────
        job.status = "syncing_contacts"
        job.save(update_fields=["status"])

        # Deduplicate by email - process each unique email once
        email_to_orders = {}
        for order in orders:
            email_lower = order.customer_email.lower().strip()
            if email_lower not in email_to_orders:
                email_to_orders[email_lower] = []
            email_to_orders[email_lower].append(order)

        for email, email_orders in email_to_orders.items():
            representative = email_orders[0]

            # Skip if already has a contact ID
            if representative.zoho_contact_id:
                job.contacts_skipped += len(email_orders)
                job.save(update_fields=["contacts_skipped"])
                continue

            try:
                contact_id, created = service.find_or_create_contact(representative)
                # Update all orders with this email
                for o in email_orders:
                    o.zoho_contact_id = contact_id
                    o.save(update_fields=["zoho_contact_id"])

                if created:
                    job.contacts_synced += len(email_orders)
                else:
                    job.contacts_skipped += len(email_orders)
                job.save(update_fields=["contacts_synced", "contacts_skipped"])

            except ZohoBooksSyncError as e:
                logger.warning("Contact sync failed for %s: %s", email, e)
                _add_error(job, "contacts", representative, e)
                job.contacts_failed += len(email_orders)
                job.save(update_fields=["contacts_failed", "errors"])

        # ── Phase 2: Invoices ───────────────────────────────────────
        job.status = "syncing_invoices"
        job.save(update_fields=["status"])

        # Refresh orders from DB to get updated zoho_contact_id
        orders = list(get_base_queryset(job.date_from, job.date_to))

        for order in orders:
            if not order.zoho_contact_id:
                job.invoices_failed += 1
                _add_error(job, "invoices", order, "No zoho_contact_id, skipping invoice")
                job.save(update_fields=["invoices_failed", "errors"])
                continue

            if order.zoho_invoice_id:
                job.invoices_skipped += 1
                job.save(update_fields=["invoices_skipped"])
                continue

            try:
                invoice_id, created = service.find_or_create_invoice(order, order.zoho_contact_id)
                order.zoho_invoice_id = invoice_id
                order.save(update_fields=["zoho_invoice_id"])

                if created:
                    job.invoices_synced += 1
                else:
                    job.invoices_skipped += 1
                job.save(update_fields=["invoices_synced", "invoices_skipped"])

            except ZohoBooksSyncError as e:
                logger.warning("Invoice sync failed for order %s: %s", order.id, e)
                _add_error(job, "invoices", order, e)
                job.invoices_failed += 1
                job.save(update_fields=["invoices_failed", "errors"])

        # ── Phase 3: Payments ───────────────────────────────────────
        job.status = "syncing_payments"
        job.save(update_fields=["status"])

        # Refresh and filter to paid/completed only
        orders = list(
            get_base_queryset(job.date_from, job.date_to)
            .filter(status__in=["paid", "completed"])
        )

        for order in orders:
            if not order.zoho_invoice_id:
                job.payments_failed += 1
                _add_error(job, "payments", order, "No zoho_invoice_id, skipping payment")
                job.save(update_fields=["payments_failed", "errors"])
                continue

            if order.zoho_payment_id:
                job.payments_skipped += 1
                job.save(update_fields=["payments_skipped"])
                continue

            try:
                payment_id = service.create_customer_payment(
                    order, order.zoho_contact_id, order.zoho_invoice_id
                )
                order.zoho_payment_id = payment_id
                order.save(update_fields=["zoho_payment_id"])
                job.payments_synced += 1
                job.save(update_fields=["payments_synced"])

            except ZohoBooksSyncError as e:
                logger.warning("Payment sync failed for order %s: %s", order.id, e)
                _add_error(job, "payments", order, e)
                job.payments_failed += 1
                job.save(update_fields=["payments_failed", "errors"])

        # ── Done ────────────────────────────────────────────────────
        job.status = "completed"
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "completed_at"])
        logger.info("ZohoSyncJob %s completed successfully", sync_job_id)

    except ZohoBooksRateLimitError:
        # Let Celery autoretry handle this
        raise

    except Exception as e:
        logger.exception("ZohoSyncJob %s failed with unexpected error", sync_job_id)
        job.status = "failed"
        job.completed_at = timezone.now()
        job.errors.append({"phase": "unknown", "order_id": "", "email": "", "error": str(e)[:500]})
        job.save(update_fields=["status", "completed_at", "errors"])
