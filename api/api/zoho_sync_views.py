import datetime

from django.core.exceptions import ValidationError
from rest_framework import status
from api.permissions import HasPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from wefund.models import ZohoSyncJob
from wefund.tasks.zoho_sync_tasks import run_zoho_sync


class ZohoSyncTriggerView(APIView):
    """POST /admin/zoho-sync/trigger/ — Start a new Zoho Books sync job."""
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def post(self, request):
        date_from = request.data.get("date_from")
        date_to = request.data.get("date_to")
        start_invoice_number = request.data.get("start_invoice_number")

        if not date_from or not date_to:
            return Response(
                {"error": "date_from and date_to are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date_from = datetime.datetime.strptime(date_from, "%Y-%m-%d").date()
            date_to = datetime.datetime.strptime(date_to, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid date format, use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not start_invoice_number:
            from api.zoho_export_views import get_next_invoice_number
            start_invoice_number = get_next_invoice_number()
        else:
            try:
                start_invoice_number = int(start_invoice_number)
            except (ValueError, TypeError):
                return Response(
                    {"error": "start_invoice_number must be a valid integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Prevent concurrent syncs
        active = ZohoSyncJob.objects.filter(
            status__in=["pending", "syncing_contacts", "syncing_invoices", "syncing_payments"]
        ).exists()
        if active:
            return Response(
                {"error": "A sync job is already running. Please wait for it to finish."},
                status=status.HTTP_409_CONFLICT,
            )

        job = ZohoSyncJob.objects.create(
            date_from=date_from,
            date_to=date_to,
            start_invoice_number=start_invoice_number,
            triggered_by=request.user,
        )

        task = run_zoho_sync.delay(str(job.id))
        job.celery_task_id = task.id
        job.save(update_fields=["celery_task_id"])

        return Response({
            "job_id": str(job.id),
            "status": job.status,
            "message": "Sync job started",
        }, status=status.HTTP_201_CREATED)


class ZohoSyncStatusView(APIView):
    """GET /admin/zoho-sync/status/<job_id>/ — Poll sync job progress."""
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def get(self, request, job_id):
        try:
            job = ZohoSyncJob.objects.get(id=job_id)
        except (ZohoSyncJob.DoesNotExist, ValueError, ValidationError):
            return Response({"error": "Sync job not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "job_id": str(job.id),
            "status": job.status,
            "progress_percent": job.progress_percent,
            "total_orders": job.total_orders,
            "contacts": {
                "synced": job.contacts_synced,
                "skipped": job.contacts_skipped,
                "failed": job.contacts_failed,
            },
            "invoices": {
                "synced": job.invoices_synced,
                "skipped": job.invoices_skipped,
                "failed": job.invoices_failed,
            },
            "payments": {
                "synced": job.payments_synced,
                "skipped": job.payments_skipped,
                "failed": job.payments_failed,
            },
            "errors": job.errors[-20:],
            "started_at": job.started_at,
            "completed_at": job.completed_at,
        })


class ZohoSyncHistoryView(APIView):
    """GET /admin/zoho-sync/history/ — List recent sync jobs."""
    permission_classes = [HasPermission]
    required_permissions = ['system.zoho_export']

    def get(self, request):
        jobs = ZohoSyncJob.objects.all()[:20]
        data = [
            {
                "job_id": str(j.id),
                "status": j.status,
                "date_from": str(j.date_from),
                "date_to": str(j.date_to),
                "total_orders": j.total_orders,
                "progress_percent": j.progress_percent,
                "contacts_synced": j.contacts_synced,
                "invoices_synced": j.invoices_synced,
                "payments_synced": j.payments_synced,
                "error_count": len(j.errors),
                "triggered_by": j.triggered_by.email if j.triggered_by else "",
                "created_at": j.created_at,
                "completed_at": j.completed_at,
            }
            for j in jobs
        ]
        return Response(data)
