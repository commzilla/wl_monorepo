import logging
import shutil
import time
from datetime import timedelta

from django.conf import settings
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class SystemHealthView(APIView):
    """
    Comprehensive system health endpoint for uptime monitors.

    GET /api/health/
    - No authentication required (accessible by uptime monitors)
    - Returns HTTP 200 if all critical checks pass
    - Returns HTTP 503 if any critical check fails
    """

    authentication_classes = []
    permission_classes = []

    # Task freshness thresholds: (task_name, stale_seconds, is_critical)
    TASK_FRESHNESS = [
        ("run_challenge_engine", 3 * 60, True),
        ("run_risk_evaluation", 10 * 60, True),
        ("fetch_and_store_mt5_trades", 3 * 60, True),
        ("track_stoploss_changes", 2 * 60, False),
        ("create_daily_snapshots", 25 * 3600, False),
    ]

    def get(self, request):
        checks = {}

        # --- Infrastructure ---
        checks["postgresql"] = self._check_postgresql()
        checks["redis"] = self._check_redis()
        checks["disk_space"] = self._check_disk_space()

        # --- Celery ---
        checks["celery_worker"] = self._check_celery_worker()
        checks["celery_beat"] = self._check_celery_beat()

        # --- Task Freshness ---
        for task_name, threshold, _ in self.TASK_FRESHNESS:
            short_name = task_name.replace("fetch_and_store_", "").replace("run_", "")
            key = f"task_{short_name}"
            checks[key] = self._check_task_freshness(task_name, threshold)

        # --- External Services ---
        checks["mt5_api"] = self._check_mt5_api()

        # --- Data Integrity ---
        checks["stuck_enrollments"] = self._check_stuck_enrollments()
        checks["pending_migrations"] = self._check_pending_migrations()

        # --- Aggregate ---
        summary = {"total": len(checks), "ok": 0, "warn": 0, "critical": 0}
        for c in checks.values():
            summary[c["status"]] = summary.get(c["status"], 0) + 1

        has_critical = any(
            checks[k]["status"] == "critical"
            and self._is_critical_check(k)
            for k in checks
        )

        overall = "critical" if has_critical else (
            "degraded" if summary.get("warn") or summary.get("critical") else "healthy"
        )

        payload = {
            "status": overall,
            "timestamp": timezone.now().isoformat(),
            "checks": checks,
            "summary": summary,
        }
        return Response(payload, status=503 if overall == "critical" else 200)

    # ------------------------------------------------------------------
    # Critical-check mapping
    # ------------------------------------------------------------------

    def _is_critical_check(self, key):
        critical_keys = {
            "postgresql", "redis", "celery_worker", "celery_beat",
            "task_challenge_engine", "task_risk_evaluation",
            "task_mt5_trades", "mt5_api",
        }
        return key in critical_keys

    # ------------------------------------------------------------------
    # Infrastructure
    # ------------------------------------------------------------------

    def _check_postgresql(self):
        try:
            start = time.monotonic()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            latency = round((time.monotonic() - start) * 1000, 1)
            return {"status": "ok", "latency_ms": latency}
        except Exception as e:
            return {"status": "critical", "detail": str(e)}

    def _check_redis(self):
        try:
            from django.core.cache import cache

            start = time.monotonic()
            cache.set("_health_ping", "pong", 30)
            ok = cache.get("_health_ping") == "pong"
            latency = round((time.monotonic() - start) * 1000, 1)
            if ok:
                return {"status": "ok", "latency_ms": latency}
            return {"status": "critical", "detail": "set/get roundtrip failed"}
        except Exception as e:
            return {"status": "critical", "detail": str(e)}

    def _check_disk_space(self):
        try:
            usage = shutil.disk_usage("/")
            free_pct = round(usage.free / usage.total * 100, 1)
            if free_pct < 5:
                return {"status": "critical", "free_pct": free_pct}
            if free_pct < 10:
                return {"status": "warn", "free_pct": free_pct}
            return {"status": "ok", "free_pct": free_pct}
        except Exception as e:
            return {"status": "warn", "detail": str(e)}

    # ------------------------------------------------------------------
    # Celery
    # ------------------------------------------------------------------

    def _check_celery_worker(self):
        try:
            from backend.celery import app

            result = app.control.ping(timeout=3)
            if result:
                return {"status": "ok", "workers": len(result)}
            return {"status": "critical", "detail": "No workers responding"}
        except Exception as e:
            return {"status": "critical", "detail": str(e)}

    def _check_celery_beat(self):
        try:
            from django_celery_beat.models import PeriodicTask

            cutoff = timezone.now() - timedelta(minutes=5)
            recent = PeriodicTask.objects.filter(
                enabled=True,
                last_run_at__gte=cutoff,
            ).count()

            if recent > 0:
                return {"status": "ok", "tasks_run_recently": recent}

            # Check if ANY enabled tasks exist at all
            enabled = PeriodicTask.objects.filter(enabled=True).count()
            if enabled == 0:
                return {"status": "warn", "detail": "No enabled periodic tasks"}
            return {
                "status": "critical",
                "detail": f"No tasks run in last 5 min ({enabled} enabled)",
            }
        except Exception as e:
            return {"status": "critical", "detail": str(e)}

    # ------------------------------------------------------------------
    # Task Freshness
    # ------------------------------------------------------------------

    def _check_task_freshness(self, task_suffix, stale_seconds):
        try:
            from django_celery_beat.models import PeriodicTask

            task = PeriodicTask.objects.filter(
                task__endswith=task_suffix, enabled=True
            ).first()

            if not task:
                return {
                    "status": "warn",
                    "detail": f"Task *{task_suffix} not found in schedule",
                }

            if not task.last_run_at:
                return {
                    "status": "warn",
                    "detail": "Never run",
                    "last_run": None,
                }

            age = (timezone.now() - task.last_run_at).total_seconds()
            status = "ok" if age <= stale_seconds else "critical"
            return {
                "status": status,
                "last_run": task.last_run_at.isoformat(),
                "stale_seconds": round(age),
                "threshold_seconds": stale_seconds,
            }
        except Exception as e:
            return {"status": "warn", "detail": str(e)}

    # ------------------------------------------------------------------
    # External Services
    # ------------------------------------------------------------------

    def _check_mt5_api(self):
        try:
            from api.services.mt5_client import MT5Client

            mt5 = MT5Client(settings.MT5_API_URL, settings.MT5_API_KEY)
            result = mt5.health_check()
            if result.get("reachable"):
                return {"status": "ok", "reachable": True}
            return {
                "status": "critical",
                "reachable": False,
                "detail": result.get("error", "unreachable"),
            }
        except Exception as e:
            return {"status": "critical", "reachable": False, "detail": str(e)}

    # ------------------------------------------------------------------
    # Data Integrity
    # ------------------------------------------------------------------

    def _check_stuck_enrollments(self):
        try:
            from wefund.models import ChallengeEnrollment

            cutoff = timezone.now() - timedelta(hours=24)
            stuck = ChallengeEnrollment.objects.filter(
                status__in=["phase_1_passed", "phase_2_passed"],
                is_active=True,
                updated_at__lt=cutoff,
            ).count()

            if stuck == 0:
                return {"status": "ok", "count": 0}
            return {
                "status": "warn",
                "count": stuck,
                "detail": f"{stuck} enrollments in passed state >24h",
            }
        except Exception as e:
            return {"status": "warn", "detail": str(e)}

    def _check_pending_migrations(self):
        try:
            executor = MigrationExecutor(connection)
            plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
            count = len(plan)
            if count == 0:
                return {"status": "ok", "count": 0}
            return {
                "status": "warn",
                "count": count,
                "detail": f"{count} unapplied migrations",
            }
        except Exception as e:
            return {"status": "warn", "detail": str(e)}
