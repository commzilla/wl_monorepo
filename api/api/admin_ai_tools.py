"""
Admin AI Assistant — Tool Execution Engine.
Handles execution of read and write tools called by Gemini.
"""
import logging
from typing import Dict, Any, Optional
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Value
from django.db.models.functions import Concat

logger = logging.getLogger(__name__)


class AdminAIToolExecutor:
    """
    Executes tool calls from the admin AI assistant.
    Handles permission checks, confirmation gates, and actual execution.
    """

    # Write tools that are considered dangerous
    WRITE_TOOLS = {
        'mt5_deposit', 'mt5_withdraw', 'mt5_activate_trading',
        'mt5_disable_trading', 'mt5_enable_account', 'mt5_disable_account',
        'mt5_close_trades', 'mt5_change_password', 'mt5_change_group',
    }

    # These actions ALWAYS require confirmation regardless of config.
    # This is a hardcoded safety net that cannot be bypassed via the admin UI.
    ALWAYS_REQUIRE_CONFIRMATION = {
        'mt5_deposit', 'mt5_withdraw', 'mt5_close_trades',
        'mt5_disable_account', 'mt5_change_password', 'mt5_change_group',
    }

    @classmethod
    def execute_tool(
        cls,
        tool_name: str,
        params: dict,
        admin_user,
        config,
    ) -> Dict[str, Any]:
        """
        Execute a tool call with permission checking.

        Returns:
            dict: {success, data, error, needs_confirmation, action_description}
        """
        # Check if tool is a write action
        is_write = tool_name in cls.WRITE_TOOLS

        # Role-based enforcement: only admin-role users can execute write tools
        if is_write:
            user_role = getattr(admin_user, 'role', None)
            if user_role != 'admin':
                return {
                    "success": False,
                    "error": "Write actions are only available to admin-role users.",
                    "needs_confirmation": False,
                }

        # Permission check — empty allowed list means NO tools are permitted (safe default)
        if is_write:
            if not config.write_actions_enabled:
                return {
                    "success": False,
                    "error": "Write actions are disabled in the admin AI configuration.",
                    "needs_confirmation": False,
                }
            allowed = config.allowed_write_actions or []
            if tool_name not in allowed:
                return {
                    "success": False,
                    "error": f"Action '{tool_name}' is not in the allowed write actions list.",
                    "needs_confirmation": False,
                }
            # Check if confirmation is required (hardcoded safety net + config)
            confirmation_required = config.confirmation_required_actions or []
            if tool_name in cls.ALWAYS_REQUIRE_CONFIRMATION or tool_name in confirmation_required:
                return {
                    "success": False,
                    "needs_confirmation": True,
                    "action_description": cls._describe_action(tool_name, params),
                    "tool_name": tool_name,
                    "params": params,
                }
        else:
            if not config.read_actions_enabled:
                return {
                    "success": False,
                    "error": "Read actions are disabled in the admin AI configuration.",
                    "needs_confirmation": False,
                }
            allowed = config.allowed_read_actions or []
            if tool_name not in allowed:
                return {
                    "success": False,
                    "error": f"Action '{tool_name}' is not in the allowed read actions list.",
                    "needs_confirmation": False,
                }

        # Dispatch to handler
        handler = getattr(cls, f'_execute_{tool_name}', None)
        if not handler:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}",
                "needs_confirmation": False,
            }

        try:
            result = handler(params, admin_user)
            # Log write actions
            if is_write and result.get('success'):
                cls._log_write_action(tool_name, params, result, admin_user)
            return result
        except Exception as e:
            logger.error(f"Tool execution error ({tool_name}): {e}", exc_info=True)
            return {
                "success": False,
                "error": f"Error executing {tool_name}. Please try again.",
                "needs_confirmation": False,
            }

    @classmethod
    def execute_confirmed_tool(cls, tool_name: str, params: dict, admin_user) -> Dict[str, Any]:
        """Execute a tool that has been confirmed by the admin. Re-validates config and role permissions."""
        # Re-validate admin role — only admin-role users can execute confirmed write actions
        user_role = getattr(admin_user, 'role', None)
        if user_role != 'admin':
            return {"success": False, "error": "Only admin-role users can execute write actions."}

        from wefund.models import AdminAIConfig
        config = AdminAIConfig.get_config()

        # Re-validate write permissions even for confirmed actions
        if not config.write_actions_enabled:
            return {"success": False, "error": "Write actions have been disabled since this action was queued."}

        allowed = config.allowed_write_actions or []
        if tool_name not in allowed:
            return {"success": False, "error": f"Action '{tool_name}' is no longer in the allowed write actions list."}

        handler = getattr(cls, f'_execute_{tool_name}', None)
        if not handler:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

        try:
            result = handler(params, admin_user)
            if result.get('success'):
                cls._log_write_action(tool_name, params, result, admin_user)
            return result
        except Exception as e:
            logger.error(f"Confirmed tool execution error ({tool_name}): {e}", exc_info=True)
            return {"success": False, "error": f"Error executing {tool_name}. Please try again."}

    # ===================================================================
    # READ TOOL IMPLEMENTATIONS
    # ===================================================================

    @classmethod
    def _execute_lookup_enrollment(cls, params: dict, admin_user) -> dict:
        from wefund.models import ChallengeEnrollment

        enrollment = None
        if params.get('enrollment_id'):
            enrollment = ChallengeEnrollment.objects.select_related(
                'challenge', 'client__user'
            ).filter(id=params['enrollment_id']).first()
        elif params.get('mt5_account_id'):
            enrollment = ChallengeEnrollment.objects.select_related(
                'challenge', 'client__user'
            ).filter(mt5_account_id=str(params['mt5_account_id'])).first()

        if not enrollment:
            return {"success": True, "data": {"found": False, "message": "Enrollment not found."}}

        data = {
            "found": True,
            "id": str(enrollment.id),
            "mt5_account_id": enrollment.mt5_account_id,
            "status": enrollment.status,
            "challenge_name": enrollment.challenge.name if enrollment.challenge else "N/A",
            "account_size": str(enrollment.account_size) if enrollment.account_size else "N/A",
            "trader_email": enrollment.client.user.email if enrollment.client and enrollment.client.user else "N/A",
            "trader_name": enrollment.client.user.get_full_name() if enrollment.client and enrollment.client.user else "N/A",
            "created_at": enrollment.created_at.isoformat() if enrollment.created_at else None,
        }

        # Add phase info if available
        if hasattr(enrollment, 'get_current_phase_type'):
            data["current_phase"] = enrollment.get_current_phase_type()

        return {"success": True, "data": data}

    @classmethod
    def _execute_lookup_trader(cls, params: dict, admin_user) -> dict:
        from django.contrib.auth import get_user_model
        from wefund.models import ChallengeEnrollment

        User = get_user_model()
        user = None

        if params.get('user_id'):
            user = User.objects.filter(id=params['user_id']).first()
        elif params.get('email'):
            user = User.objects.filter(email__iexact=params['email']).first()
        elif params.get('name'):
            name = params['name']
            user = User.objects.annotate(
                full_name=Concat('first_name', Value(' '), 'last_name')
            ).filter(
                Q(first_name__icontains=name) |
                Q(last_name__icontains=name) |
                Q(full_name__icontains=name) |
                Q(client_profile__address_info__first_name__icontains=name) |
                Q(client_profile__address_info__last_name__icontains=name)
            ).first()

        if not user:
            return {"success": True, "data": {"found": False, "message": "Trader not found."}}

        data = {
            "found": True,
            "id": str(user.id),
            "email": user.email,
            "name": user.get_full_name(),
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
            "is_active": user.is_active,
            "role": getattr(user, 'role', 'N/A'),
        }

        # Get enrollments
        profile = getattr(user, 'client_profile', None)
        if profile:
            enrollments = ChallengeEnrollment.objects.filter(
                client=profile
            ).select_related('challenge').order_by('-created_at')[:10]

            data["enrollments"] = [{
                "id": str(e.id),
                "mt5_account_id": e.mt5_account_id,
                "status": e.status,
                "challenge": e.challenge.name if e.challenge else "N/A",
                "account_size": str(e.account_size) if e.account_size else "N/A",
            } for e in enrollments]

        return {"success": True, "data": data}

    @classmethod
    def _execute_lookup_payout(cls, params: dict, admin_user) -> dict:
        from wefund.models import TraderPayout

        payouts = TraderPayout.objects.select_related('trader', 'challenge_enrollment')

        if params.get('payout_id'):
            payouts = payouts.filter(id=params['payout_id'])
        elif params.get('trader_email'):
            payouts = payouts.filter(trader__email__iexact=params['trader_email'])
        else:
            return {"success": True, "data": {"found": False, "message": "Provide payout_id or trader_email."}}

        payouts = payouts.order_by('-requested_at')[:10]

        if not payouts.exists():
            return {"success": True, "data": {"found": False, "message": "No payouts found."}}

        data = {
            "found": True,
            "payouts": [{
                "id": str(p.id),
                "trader_email": p.trader.email if p.trader else "N/A",
                "amount": str(p.amount) if p.amount else "0",
                "status": p.status,
                "requested_at": p.requested_at.isoformat() if p.requested_at else None,
                "mt5_account_id": p.challenge_enrollment.mt5_account_id if p.challenge_enrollment else None,
            } for p in payouts],
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_mt5_account_details(cls, params: dict, admin_user) -> dict:
        account_id = params.get('account_id')
        if not account_id:
            return {"success": False, "error": "account_id is required"}

        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        result = client.get_account_details(int(account_id))
        return {"success": result.get('success', False), "data": result}

    @classmethod
    def _execute_get_mt5_open_trades(cls, params: dict, admin_user) -> dict:
        account_id = params.get('account_id')
        if not account_id:
            return {"success": False, "error": "account_id is required"}

        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        trades = client.get_open_trades(int(account_id))
        return {"success": True, "data": {"trades": trades, "count": len(trades)}}

    @classmethod
    def _execute_get_breach_history(cls, params: dict, admin_user) -> dict:
        from wefund.models import BreachHistory

        breaches = BreachHistory.objects.select_related('enrollment')

        if params.get('enrollment_id'):
            breaches = breaches.filter(enrollment_id=params['enrollment_id'])
        elif params.get('user_id'):
            breaches = breaches.filter(user_id=params['user_id'])
        elif params.get('mt5_account_id'):
            breaches = breaches.filter(enrollment__mt5_account_id=str(params['mt5_account_id']))
        else:
            return {"success": True, "data": {"found": False, "message": "Provide enrollment_id, user_id, or mt5_account_id."}}

        breaches = breaches.order_by('-breached_at')[:20]

        if not breaches.exists():
            return {"success": True, "data": {"found": False, "message": "No breaches found."}}

        data = {
            "found": True,
            "breaches": [{
                "rule": b.rule,
                "reason": b.reason,
                "breached_at": b.breached_at.isoformat() if b.breached_at else None,
                "mt5_account_id": b.enrollment.mt5_account_id if b.enrollment else None,
                "previous_state": b.previous_state,
            } for b in breaches],
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_breach_statistics(cls, params: dict, admin_user) -> dict:
        from django.db.models import Count, Q
        from django.utils import timezone
        from wefund.models import BreachHistory

        days = min(int(params.get('days', 30)), 365)
        limit = min(int(params.get('limit', 10)), 25)
        phase = params.get('phase', 'all')

        since = timezone.now() - timezone.timedelta(days=days)
        qs = BreachHistory.objects.filter(breached_at__gte=since)

        if phase and phase != 'all':
            phase_map = {
                'phase_1': ['phase_1_in_progress', 'phase_1_passed'],
                'phase_2': ['phase_2_in_progress', 'phase_2_passed'],
                'live': ['live_in_progress', 'completed'],
            }
            statuses = phase_map.get(phase)
            if statuses:
                qs = qs.filter(enrollment__status__in=statuses)

        total = qs.count()

        # Top breach types
        by_rule = list(
            qs.values('rule')
            .annotate(count=Count('id'))
            .order_by('-count')[:limit]
        )

        # Breakdown by phase
        by_phase = list(
            qs.values('enrollment__status')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        data = {
            "period_days": days,
            "phase_filter": phase,
            "total_breaches": total,
            "by_rule": [{"rule": r['rule'], "count": r['count']} for r in by_rule],
            "by_phase": [{"phase": p['enrollment__status'], "count": p['count']} for p in by_phase],
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_trade_history(cls, params: dict, admin_user) -> dict:
        from wefund.models import MT5Trade

        account_id = params.get('account_id')
        if not account_id:
            return {"success": False, "error": "account_id is required"}

        limit = min(int(params.get('limit', 20)), 100)
        trades = MT5Trade.objects.filter(
            account_id=int(account_id)
        ).order_by('-close_time')[:limit]

        data = {
            "trades": [{
                "order": t.order,
                "symbol": t.symbol,
                "cmd": "BUY" if t.cmd == 0 else "SELL" if t.cmd == 1 else str(t.cmd),
                "volume": str(t.volume) if t.volume else "N/A",
                "open_price": str(t.open_price) if t.open_price else "N/A",
                "close_price": str(t.close_price) if t.close_price else "N/A",
                "profit": str(t.profit) if t.profit is not None else "N/A",
                "close_time": t.close_time.isoformat() if t.close_time else None,
                "is_closed": t.is_closed,
            } for t in trades],
            "count": trades.count(),
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_account_metrics(cls, params: dict, admin_user) -> dict:
        from wefund.models import MT5DailySnapshot, ChallengeEnrollment

        enrollment = None
        if params.get('enrollment_id'):
            enrollment = ChallengeEnrollment.objects.filter(id=params['enrollment_id']).first()
        elif params.get('mt5_account_id'):
            enrollment = ChallengeEnrollment.objects.filter(
                mt5_account_id=str(params['mt5_account_id'])
            ).first()

        if not enrollment:
            return {"success": True, "data": {"found": False, "message": "Enrollment not found."}}

        snapshot = MT5DailySnapshot.objects.filter(
            enrollment=enrollment
        ).order_by('-date').first()

        if not snapshot:
            return {"success": True, "data": {"found": True, "message": "No snapshot data available.", "enrollment_id": str(enrollment.id)}}

        data = {
            "found": True,
            "enrollment_id": str(enrollment.id),
            "mt5_account_id": enrollment.mt5_account_id,
            "status": enrollment.status,
            "account_size": str(enrollment.account_size) if enrollment.account_size else "N/A",
            "snapshot_date": str(snapshot.date),
            "starting_balance": str(snapshot.starting_balance) if snapshot.starting_balance is not None else "N/A",
            "ending_balance": str(snapshot.ending_balance) if snapshot.ending_balance is not None else "N/A",
            "ending_equity": str(snapshot.ending_equity) if snapshot.ending_equity is not None else "N/A",
            "total_profit": str(snapshot.total_profit) if snapshot.total_profit is not None else "N/A",
            "today_profit": str(snapshot.today_profit) if snapshot.today_profit is not None else "N/A",
            "daily_loss_used": str(snapshot.daily_loss_used) if snapshot.daily_loss_used is not None else "N/A",
            "total_loss_used": str(snapshot.total_loss_used) if snapshot.total_loss_used is not None else "N/A",
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_kyc_status(cls, params: dict, admin_user) -> dict:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = None

        if params.get('user_id'):
            user = User.objects.filter(id=params['user_id']).first()
        elif params.get('email'):
            user = User.objects.filter(email__iexact=params['email']).first()

        if not user:
            return {"success": True, "data": {"found": False, "message": "User not found."}}

        profile = getattr(user, 'client_profile', None)
        if not profile:
            return {"success": True, "data": {"found": True, "status": "no_profile", "message": "No client profile."}}

        kyc = getattr(profile, 'kyc_session', None)
        if not kyc:
            return {"success": True, "data": {"found": True, "status": "not_started", "message": "KYC not initiated."}}

        data = {
            "found": True,
            "status": kyc.status,
            "operator_remark": kyc.operator_remark or "",
            "rise_invite_sent": kyc.rise_invite_sent,
            "rise_invite_accepted": kyc.rise_invite_accepted,
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_order_history(cls, params: dict, admin_user) -> dict:
        from django.contrib.auth import get_user_model
        from wefund.models import Order

        User = get_user_model()
        user = None

        if params.get('user_id'):
            user = User.objects.filter(id=params['user_id']).first()
        elif params.get('email'):
            user = User.objects.filter(email__iexact=params['email']).first()

        if not user:
            return {"success": True, "data": {"found": False, "message": "User not found."}}

        limit = min(int(params.get('limit', 10)), 100)
        orders = Order.objects.filter(user=user).order_by('-date_created')[:limit]

        data = {
            "found": True,
            "orders": [{
                "id": o.id,
                "product_name": o.product_name or "N/A",
                "order_total_usd": str(o.order_total_usd) if o.order_total_usd else "0",
                "payment_status": o.payment_status,
                "status": o.status,
                "date_created": o.date_created.isoformat() if o.date_created else None,
                "mt5_account_id": o.mt5_account_id,
            } for o in orders],
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_event_logs(cls, params: dict, admin_user) -> dict:
        from django.contrib.auth import get_user_model
        from wefund.models import EventLog

        user_id = params.get('user_id')
        if not user_id and params.get('email'):
            User = get_user_model()
            user = User.objects.filter(email__iexact=params['email']).first()
            if not user:
                return {"success": False, "error": f"No user found with email {params['email']}"}
            user_id = str(user.id)
        if not user_id:
            return {"success": False, "error": "user_id or email is required"}

        limit = min(int(params.get('limit', 30)), 100)
        events = EventLog.objects.filter(user_id=user_id).order_by('-timestamp')[:limit]

        data = {
            "events": [{
                "category": e.category,
                "event_type": e.event_type,
                "description": e.description[:200] if e.description else "",
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            } for e in events],
            "count": len(events),
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_soft_breaches(cls, params: dict, admin_user) -> dict:
        from wefund.models import SoftBreach

        breaches = SoftBreach.objects.all()

        if params.get('user_id'):
            breaches = breaches.filter(user_id=params['user_id'])
        elif params.get('account_id'):
            breaches = breaches.filter(account_id=int(params['account_id']))
        else:
            return {"success": False, "error": "Provide user_id or account_id"}

        breaches = breaches.order_by('-detected_at')[:20]

        data = {
            "breaches": [{
                "rule": b.rule,
                "severity": b.severity,
                "resolved": b.resolved,
                "description": b.description[:200] if b.description else "",
                "detected_at": b.detected_at.isoformat() if b.detected_at else None,
                "account_id": b.account_id,
            } for b in breaches],
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_payout_config(cls, params: dict, admin_user) -> dict:
        from wefund.models import PayoutConfiguration

        enrollment_id = params.get('enrollment_id')
        if not enrollment_id:
            return {"success": False, "error": "enrollment_id is required"}

        configs = PayoutConfiguration.objects.filter(enrollment_id=enrollment_id)

        if not configs.exists():
            return {"success": True, "data": {"found": False, "message": "No payout config found."}}

        data = {
            "found": True,
            "configs": [{
                "id": str(c.id),
                "config_type": c.config_type,
                "profit_share_percent": str(c.profit_share_percent) if c.profit_share_percent is not None else "N/A",
                "payment_cycle": c.payment_cycle or "N/A",
            } for c in configs],
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_search_traders(cls, params: dict, admin_user) -> dict:
        from django.contrib.auth import get_user_model
        from wefund.models import ChallengeEnrollment

        User = get_user_model()
        query = params.get('query', '')
        limit = min(int(params.get('limit', 10)), 100)

        if not query or len(query) < 2:
            return {"success": False, "error": "Search query must be at least 2 characters."}

        # Search by email, name (including full name and address_info), or MT5 account ID
        users = User.objects.annotate(
            full_name=Concat('first_name', Value(' '), 'last_name')
        ).filter(
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(full_name__icontains=query) |
            Q(client_profile__address_info__first_name__icontains=query) |
            Q(client_profile__address_info__last_name__icontains=query)
        ).distinct()[:limit]

        # Also search by MT5 account ID
        enrollment_matches = ChallengeEnrollment.objects.filter(
            mt5_account_id__icontains=query
        ).select_related('client__user')[:limit]

        results = []
        seen_ids = set()

        for u in users:
            if u.id not in seen_ids:
                seen_ids.add(u.id)
                results.append({
                    "id": str(u.id),
                    "email": u.email,
                    "name": u.get_full_name(),
                    "match_type": "user",
                })

        for e in enrollment_matches:
            if e.client and e.client.user and e.client.user.id not in seen_ids:
                seen_ids.add(e.client.user.id)
                results.append({
                    "id": str(e.client.user.id),
                    "email": e.client.user.email,
                    "name": e.client.user.get_full_name(),
                    "mt5_account_id": e.mt5_account_id,
                    "match_type": "mt5_account",
                })

        return {"success": True, "data": {"results": results[:limit], "count": len(results)}}

    @classmethod
    def _execute_get_enrollment_snapshots(cls, params: dict, admin_user) -> dict:
        from wefund.models import MT5DailySnapshot

        enrollment_id = params.get('enrollment_id')
        if not enrollment_id:
            return {"success": False, "error": "enrollment_id is required"}

        days = min(int(params.get('days', 7)), 100)
        snapshots = MT5DailySnapshot.objects.filter(
            enrollment_id=enrollment_id
        ).order_by('-date')[:days]

        data = {
            "snapshots": [{
                "date": str(s.date),
                "starting_balance": str(s.starting_balance) if s.starting_balance is not None else "N/A",
                "ending_balance": str(s.ending_balance) if s.ending_balance is not None else "N/A",
                "ending_equity": str(s.ending_equity) if s.ending_equity is not None else "N/A",
                "total_profit": str(s.total_profit) if s.total_profit is not None else "N/A",
                "today_profit": str(s.today_profit) if s.today_profit is not None else "N/A",
                "daily_loss_used": str(s.daily_loss_used) if s.daily_loss_used is not None else "N/A",
                "total_loss_used": str(s.total_loss_used) if s.total_loss_used is not None else "N/A",
            } for s in snapshots],
            "count": snapshots.count(),
        }

        return {"success": True, "data": data}

    @classmethod
    def _execute_get_consistency_report(cls, params: dict, admin_user) -> dict:
        from wefund.models import RiskScanReport

        payout_id = params.get('payout_id')
        if not payout_id:
            return {"success": False, "error": "payout_id is required"}

        try:
            report = RiskScanReport.objects.select_related('payout').get(payout_id=payout_id)
        except RiskScanReport.DoesNotExist:
            return {"success": True, "data": {"found": False, "message": "No consistency scan report found for this payout. It may not have been run yet."}}

        r = report.report or {}
        summary = r.get("summary", {})

        data = {
            "found": True,
            "payout_id": str(report.payout_id),
            "generated_at": report.generated_at.isoformat() if report.generated_at else None,
            "global_score": report.global_score,
            "max_severity": report.max_severity,
            "recommended_action": report.recommended_action,
            "scan_window": r.get("scan_window", {}),
            "account_ids": r.get("account_ids", []),
            "account_size": r.get("account_size"),
            "currency": r.get("currency"),
            "summary": {
                "total_violations": summary.get("total_violations", 0),
                "total_affected_pnl": summary.get("total_affected_pnl"),
                "global_score": summary.get("global_score"),
                "max_severity": summary.get("max_severity"),
                "recommended_action": summary.get("recommended_action"),
            },
            "violations": [
                {
                    "rule_code": v.get("rule_code"),
                    "rule_name": v.get("rule_name"),
                    "category": v.get("category"),
                    "severity": v.get("severity"),
                    "order_id": v.get("order_id"),
                    "symbol": v.get("symbol"),
                    "account_id": v.get("account_id"),
                    "affected_pnl": v.get("affected_pnl"),
                    "description": v.get("description"),
                    "meta": v.get("meta", {}),
                }
                for v in r.get("violations", [])
            ],
        }

        return {"success": True, "data": data}

    # ===================================================================
    # WRITE TOOL IMPLEMENTATIONS
    # ===================================================================

    MAX_DEPOSIT_AMOUNT = 100000  # Safety cap for AI-initiated deposits
    MAX_WITHDRAW_AMOUNT = 100000  # Safety cap for AI-initiated withdrawals

    @classmethod
    def _validate_mt5_amount(cls, amount, max_amount: float) -> tuple:
        """Validate MT5 financial amount. Returns (valid: bool, error: str|None, amount: float)."""
        if amount is None:
            return False, "Amount is required", 0.0
        try:
            amount_f = float(amount)
        except (ValueError, TypeError):
            return False, f"Invalid amount: {amount}", 0.0
        if amount_f <= 0:
            return False, f"Amount must be positive, got {amount_f}", 0.0
        if amount_f > max_amount:
            return False, f"Amount {amount_f} exceeds maximum allowed ({max_amount})", 0.0
        return True, None, amount_f

    @classmethod
    def _validate_mt5_account_id(cls, account_id) -> tuple:
        """Validate MT5 account ID. Returns (valid: bool, error: str|None, account_id: int)."""
        if not account_id:
            return False, "Account ID is required", 0
        try:
            acct = int(account_id)
        except (ValueError, TypeError):
            return False, f"Invalid account ID: {account_id}", 0
        if acct <= 0:
            return False, f"Account ID must be positive, got {acct}", 0
        return True, None, acct

    @classmethod
    def _execute_mt5_deposit(cls, params: dict, admin_user) -> dict:
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}

        valid, err, amount = cls._validate_mt5_amount(params.get('amount'), cls.MAX_DEPOSIT_AMOUNT)
        if not valid:
            return {"success": False, "error": err}

        comment = params.get('comment', 'Admin AI deposit')
        result = client.deposit_funds(account_id, amount, comment)
        return {"success": result.get('success', False), "data": result}

    @classmethod
    def _execute_mt5_withdraw(cls, params: dict, admin_user) -> dict:
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}

        valid, err, amount = cls._validate_mt5_amount(params.get('amount'), cls.MAX_WITHDRAW_AMOUNT)
        if not valid:
            return {"success": False, "error": err}

        comment = params.get('comment', 'Admin AI withdrawal')
        result = client.withdraw_profit(account_id, amount, comment)
        return {"success": result.get('success', False), "data": result}

    @classmethod
    def _execute_mt5_activate_trading(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        success = client.activate_trading(account_id)
        return {"success": success, "data": {"activated": success}}

    @classmethod
    def _execute_mt5_disable_trading(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        success = client.disable_trading(account_id)
        return {"success": success, "data": {"disabled": success}}

    @classmethod
    def _execute_mt5_enable_account(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        success = client.enable_account(account_id)
        return {"success": success, "data": {"enabled": success}}

    @classmethod
    def _execute_mt5_disable_account(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        success = client.disable_account(account_id)
        return {"success": success, "data": {"disabled": success}}

    @classmethod
    def _execute_mt5_close_trades(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        result = client.close_open_trades(account_id)
        return {"success": result.get('success', False), "data": result}

    @classmethod
    def _execute_mt5_change_password(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        new_password = params.get('new_password')
        if not new_password or len(new_password) < 6:
            return {"success": False, "error": "Password must be at least 6 characters."}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        mode = params.get('mode', 'main')

        if mode == 'main':
            success = client.change_password(account_id, main_password=new_password, mode='main')
        elif mode == 'investor':
            success = client.change_password(account_id, investor_password=new_password, mode='investor')
        else:
            success = client.change_password(account_id, main_password=new_password, investor_password=new_password, mode='both')

        return {"success": success, "data": {"password_changed": success}}

    @classmethod
    def _execute_mt5_change_group(cls, params: dict, admin_user) -> dict:
        valid, err, account_id = cls._validate_mt5_account_id(params.get('account_id'))
        if not valid:
            return {"success": False, "error": err}
        new_group = params.get('new_group')
        if not new_group or not isinstance(new_group, str):
            return {"success": False, "error": "New group name is required."}
        client = cls._get_mt5_client()
        if not client:
            return {"success": False, "error": "MT5 client not configured"}

        success = client.change_group(account_id, new_group)
        return {"success": success, "data": {"group_changed": success}}

    # ===================================================================
    # HELPERS
    # ===================================================================

    @classmethod
    def _get_mt5_client(cls):
        """Get MT5Client instance."""
        from api.services.mt5_client import MT5Client

        api_url = getattr(settings, 'MT5_API_URL', '')
        api_key = getattr(settings, 'MT5_API_KEY', '')

        if not api_url or not api_key:
            return None

        return MT5Client(api_url, api_key)

    @classmethod
    def _describe_action(cls, tool_name: str, params: dict) -> str:
        """Generate human-readable description of a write action."""
        descriptions = {
            'mt5_deposit': f"Deposit ${params.get('amount', '?')} into MT5 account {params.get('account_id', '?')}",
            'mt5_withdraw': f"Withdraw ${params.get('amount', '?')} from MT5 account {params.get('account_id', '?')}",
            'mt5_activate_trading': f"Activate trading for MT5 account {params.get('account_id', '?')}",
            'mt5_disable_trading': f"Disable trading for MT5 account {params.get('account_id', '?')}",
            'mt5_enable_account': f"Enable MT5 account {params.get('account_id', '?')}",
            'mt5_disable_account': f"Disable MT5 account {params.get('account_id', '?')}",
            'mt5_close_trades': f"Close all open trades for MT5 account {params.get('account_id', '?')}",
            'mt5_change_password': f"Change password for MT5 account {params.get('account_id', '?')} (mode: {params.get('mode', 'main')})",
            'mt5_change_group': f"Change group for MT5 account {params.get('account_id', '?')} to '{params.get('new_group', '?')}'",
        }
        return descriptions.get(tool_name, f"Execute {tool_name}")

    # Fields that must never be persisted to logs
    SENSITIVE_PARAM_KEYS = {'new_password', 'password', 'investor_password', 'main_password'}

    @classmethod
    def _redact_params(cls, params: dict) -> dict:
        """Return a copy of params with sensitive fields redacted."""
        if not params:
            return params
        redacted = dict(params)
        for key in cls.SENSITIVE_PARAM_KEYS:
            if key in redacted:
                redacted[key] = '***REDACTED***'
        return redacted

    @classmethod
    def _log_write_action(cls, tool_name: str, params: dict, result: dict, admin_user):
        """Log write actions to EventLog for database audit trail."""
        try:
            from wefund.models import EventLog
            EventLog.objects.create(
                user=admin_user,
                category='admin',
                event_type='admin_action',
                metadata={
                    'source': 'admin_ai',
                    'tool_name': tool_name,
                    'params': cls._redact_params(params),
                    'result_success': result.get('success', False),
                    'result_error': result.get('error', ''),
                },
                description=f"Admin AI executed {tool_name} by {admin_user.email}",
            )
        except Exception as e:
            logger.warning(f"Failed to log write action to EventLog: {e}")
