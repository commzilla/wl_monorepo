import uuid
import hashlib
import json
import math
import random
import logging
from datetime import datetime, timedelta, date
from decimal import Decimal
from collections import defaultdict

from django.conf import settings
from django.db.models import (
    Sum, Avg, Count, Max, Min, F, Q, Case, When, Value, BooleanField,
    FloatField, Subquery, OuterRef, Exists
)
from django.db.models.functions import TruncDate, TruncHour, ExtractHour, ExtractWeekDay
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser

from wefund.models import (
    ChallengeEnrollment, MT5Trade, MT5DailySnapshot, User,
    TagCategory, TradeTag, TradeJournalEntry, TradingSession,
    JournalInsight, JournalConfig, MentorAccess, JournalShareLink,
    ChallengePhase, BreachHistory, SoftBreach
)
from wefund.mt5_controller.utils import fetch_user_balance
from .journal_serializers import (
    TagCategorySerializer, TradeTagSerializer, TradeTagCreateSerializer,
    TradeJournalEntrySerializer, TradingSessionSerializer,
    JournalInsightSerializer, JournalConfigSerializer, MentorAccessSerializer,
    JournalDashboardSerializer, BulkUpdateSerializer, AIChatSerializer,
    TradeListItemSerializer
)
from .utils.bunnycdn import upload_to_bunnycdn

logger = logging.getLogger(__name__)


# ─── Helpers ────────────────────────────────────────────────────────

def get_enrollment(user, request):
    """Get enrollment from query param or default to first available."""
    enroll_qs = ChallengeEnrollment.objects.filter(
        client__user=user
    ).exclude(mt5_account_id__isnull=True)

    enroll_param = (
        request.query_params.get("enrollment")
        or request.query_params.get("enrollment_id")
    )
    if enroll_param:
        try:
            return enroll_qs.get(pk=enroll_param), enroll_qs
        except ChallengeEnrollment.DoesNotExist:
            return None, enroll_qs
    return enroll_qs.first(), enroll_qs


def get_available_enrollments(enroll_qs):
    return [
        {
            "enrollment_id": str(e.pk),
            "account_id": e.mt5_account_id,
            "challenge_name": getattr(e.challenge, "name", None),
            "account_size": float(e.account_size) if e.account_size else 0,
            "currency": e.currency,
        }
        for e in enroll_qs
    ]


def safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def safe_div(a, b, default=0.0):
    return a / b if b else default


# ─── Pagination ─────────────────────────────────────────────────────

class JournalPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


# ─── Dashboard ──────────────────────────────────────────────────────

class JournalDashboardView(APIView):
    """Aggregated dashboard data for the journal."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollment, enroll_qs = get_enrollment(user, request)

        if not enrollment:
            return Response({"detail": "No active challenge accounts found."}, status=404)

        account_id = enrollment.mt5_account_id
        trades_qs = MT5Trade.objects.filter(account_id=account_id, is_closed=True)
        total_trades = trades_qs.count()

        # Core metrics
        starting_balance = safe_float(enrollment.account_size)
        live_balance = fetch_user_balance(account_id)
        if live_balance is not None:
            current_balance = safe_float(live_balance)
        else:
            total_pnl = safe_float(trades_qs.aggregate(s=Sum('profit'))['s'])
            current_balance = starting_balance + total_pnl
        net_pnl = current_balance - starting_balance

        wins = trades_qs.filter(profit__gt=0)
        losses = trades_qs.filter(profit__lt=0)
        win_count = wins.count()
        loss_count = losses.count()
        total_winners = safe_float(wins.aggregate(s=Sum('profit'))['s'])
        total_losers = safe_float(losses.aggregate(s=Sum('profit'))['s'])

        win_rate = safe_div(win_count, total_trades) * 100
        avg_win = safe_div(total_winners, win_count)
        avg_loss = safe_div(total_losers, loss_count)
        profit_factor = safe_div(total_winners, abs(total_losers))
        avg_rr = safe_div(avg_win, abs(avg_loss))
        expectancy = (win_rate / 100 * avg_win) + ((1 - win_rate / 100) * avg_loss)

        # Sharpe ratio (daily returns)
        daily_pnl = trades_qs.values('close_time__date').annotate(
            day_pnl=Sum('profit')
        ).order_by('close_time__date')
        daily_returns = [safe_float(d['day_pnl']) for d in daily_pnl]
        if len(daily_returns) > 1:
            mean_ret = sum(daily_returns) / len(daily_returns)
            std_ret = (sum((r - mean_ret) ** 2 for r in daily_returns) / (len(daily_returns) - 1)) ** 0.5
            sharpe_ratio = safe_div(mean_ret, std_ret) * (252 ** 0.5) if std_ret else 0
        else:
            sharpe_ratio = 0

        # Streaks
        max_win_streak = max_loss_streak = cur_win = cur_loss = 0
        for d in daily_pnl:
            val = safe_float(d['day_pnl'])
            if val > 0:
                cur_win += 1
                max_win_streak = max(max_win_streak, cur_win)
                cur_loss = 0
            elif val < 0:
                cur_loss += 1
                max_loss_streak = max(max_loss_streak, cur_loss)
                cur_win = 0
            else:
                cur_win = cur_loss = 0

        # Journal streak (consecutive days with journal entries)
        journal_dates = set(
            TradeJournalEntry.objects.filter(
                user=user, enrollment=enrollment
            ).values_list('created_at__date', flat=True)
        )
        journal_streak = 0
        check_date = date.today()
        while check_date in journal_dates:
            journal_streak += 1
            check_date -= timedelta(days=1)

        trades_journaled = TradeJournalEntry.objects.filter(
            user=user, enrollment=enrollment
        ).count()

        # Compliance
        phase = None
        try:
            challenge = enrollment.challenge
            if 'phase_1' in enrollment.status:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='phase-1').first()
            elif 'phase_2' in enrollment.status:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='phase-2').first()
            else:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='live-trader').first()
        except Exception:
            pass

        daily_loss_used_pct = 0
        total_loss_used_pct = 0
        profit_target_progress_pct = 0

        if phase:
            max_daily_loss_pct = safe_float(phase.max_daily_loss)
            max_loss_pct = safe_float(phase.max_loss)

            # Today's P&L
            today = date.today()
            today_pnl = safe_float(
                trades_qs.filter(close_time__date=today).aggregate(s=Sum('profit'))['s']
            )
            daily_loss_limit = starting_balance * (max_daily_loss_pct / 100)
            daily_loss_used_pct = safe_div(abs(min(today_pnl, 0)), daily_loss_limit) * 100

            total_loss_limit = starting_balance * (max_loss_pct / 100)
            total_loss_used_pct = safe_div(abs(min(net_pnl, 0)), total_loss_limit) * 100

            profit_target_val = safe_float(phase.profit_target)
            if profit_target_val > 0:
                target_amount = starting_balance * (profit_target_val / 100)
                profit_target_progress_pct = safe_div(max(net_pnl, 0), target_amount) * 100

        # Calendar heatmap (current month)
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        calendar_trades = trades_qs.filter(close_time__gte=month_start).values(
            'close_time__date'
        ).annotate(
            day_pnl=Sum('profit'),
            trade_count=Count('id')
        ).order_by('close_time__date')

        calendar_data = [
            {
                'date': str(d['close_time__date']),
                'pnl': safe_float(d['day_pnl']),
                'trades': d['trade_count']
            }
            for d in calendar_trades
        ]

        # Equity curve from snapshots
        snapshots = MT5DailySnapshot.objects.filter(
            enrollment=enrollment
        ).order_by('date').values('date', 'ending_balance', 'ending_equity', 'total_max_drawdown')

        equity_curve = [
            {
                'date': str(s['date']),
                'balance': safe_float(s['ending_balance']),
                'equity': safe_float(s['ending_equity']),
                'drawdown': safe_float(s['total_max_drawdown']),
            }
            for s in snapshots
        ]

        # Top tags
        top_tags_qs = TradeTag.objects.filter(
            user=user, journal_entries__enrollment=enrollment
        ).annotate(
            pnl=Sum('journal_entries__trade__profit'),
            count=Count('journal_entries')
        ).order_by('-count')[:10]

        top_tags = [
            {
                'id': str(t.id),
                'name': t.name,
                'color': t.color,
                'count': t.count,
                'pnl': safe_float(t.pnl)
            }
            for t in top_tags_qs
        ]

        # Recent trades (last 10)
        recent_raw = trades_qs.order_by('-close_time')[:10]
        recent_trades = []
        for t in recent_raw:
            je = getattr(t, 'journal_entry', None)
            try:
                je = TradeJournalEntry.objects.get(trade=t)
            except TradeJournalEntry.DoesNotExist:
                je = None

            trade_data = {
                'order': t.order,
                'symbol': t.symbol,
                'cmd': t.cmd,
                'volume': t.volume,
                'open_time': t.open_time,
                'close_time': t.close_time,
                'open_price': t.open_price,
                'close_price': t.close_price,
                'profit': t.profit,
                'sl': t.sl,
                'tp': t.tp,
                'has_journal': je is not None,
                'journal_id': str(je.id) if je else None,
                'rating': je.rating if je else None,
                'tags': [{'id': str(tag.id), 'name': tag.name, 'color': tag.color}
                         for tag in je.tags.all()] if je else [],
                'emotional_state': je.emotional_state if je else '',
            }
            recent_trades.append(trade_data)

        # Quick AI insight (cached)
        quick_insight = None
        cached = JournalInsight.objects.filter(
            user=user, enrollment=enrollment,
            insight_type='daily_summary',
            status='completed',
            period_start=date.today()
        ).first()
        if cached:
            quick_insight = cached.content

        data = {
            'net_pnl': round(net_pnl, 2),
            'win_rate': round(win_rate, 2),
            'profit_factor': round(profit_factor, 2),
            'expectancy': round(expectancy, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'avg_rr': round(avg_rr, 2),
            'total_trades': total_trades,
            'trades_journaled': trades_journaled,
            'daily_loss_used_pct': round(min(daily_loss_used_pct, 100), 1),
            'total_loss_used_pct': round(min(total_loss_used_pct, 100), 1),
            'profit_target_progress_pct': round(min(profit_target_progress_pct, 100), 1),
            'journal_streak': journal_streak,
            'win_streak': max_win_streak,
            'loss_streak': max_loss_streak,
            'calendar_data': calendar_data,
            'recent_trades': recent_trades,
            'top_tags': top_tags,
            'equity_curve': equity_curve,
            'quick_insight': quick_insight,
            'available_enrollments': get_available_enrollments(enroll_qs),
            'selected_enrollment': {
                'enrollment_id': str(enrollment.pk),
                'account_id': enrollment.mt5_account_id,
                'challenge_name': getattr(enrollment.challenge, 'name', None),
                'account_size': safe_float(enrollment.account_size),
                'currency': enrollment.currency,
            }
        }
        return Response(data)


# ─── Journal Entries (Trades) ───────────────────────────────────────

class JournalEntryListView(generics.ListCreateAPIView):
    """List trades with journal data, create journal entry for a trade."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeJournalEntrySerializer
    pagination_class = JournalPagination

    def list(self, request, *args, **kwargs):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No active challenge accounts found."}, status=404)

        account_id = enrollment.mt5_account_id
        trades_qs = MT5Trade.objects.filter(account_id=account_id, is_closed=True)

        # Filters
        symbol = request.query_params.get('symbol')
        side = request.query_params.get('side')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        has_notes = request.query_params.get('has_notes')
        tag_ids = request.query_params.getlist('tags')
        min_profit = request.query_params.get('min_profit')
        max_profit = request.query_params.get('max_profit')
        rating = request.query_params.get('rating')

        if symbol:
            trades_qs = trades_qs.filter(symbol__icontains=symbol)
        if side:
            cmd = 0 if side == 'buy' else 1
            trades_qs = trades_qs.filter(cmd=cmd)
        if date_from:
            trades_qs = trades_qs.filter(close_time__date__gte=date_from)
        if date_to:
            trades_qs = trades_qs.filter(close_time__date__lte=date_to)
        if min_profit:
            trades_qs = trades_qs.filter(profit__gte=min_profit)
        if max_profit:
            trades_qs = trades_qs.filter(profit__lte=max_profit)

        # Journal-specific filters
        if has_notes == 'true':
            journal_orders = TradeJournalEntry.objects.filter(
                user=user, enrollment=enrollment
            ).exclude(notes='').values_list('trade__order', flat=True)
            trades_qs = trades_qs.filter(order__in=journal_orders)
        elif has_notes == 'false':
            journal_orders = TradeJournalEntry.objects.filter(
                user=user, enrollment=enrollment
            ).exclude(notes='').values_list('trade__order', flat=True)
            trades_qs = trades_qs.exclude(order__in=journal_orders)

        if tag_ids:
            tag_orders = TradeJournalEntry.objects.filter(
                user=user, enrollment=enrollment,
                tags__id__in=tag_ids
            ).values_list('trade__order', flat=True)
            trades_qs = trades_qs.filter(order__in=tag_orders)

        if rating:
            rated_orders = TradeJournalEntry.objects.filter(
                user=user, enrollment=enrollment, rating=int(rating)
            ).values_list('trade__order', flat=True)
            trades_qs = trades_qs.filter(order__in=rated_orders)

        trades_qs = trades_qs.order_by('-close_time')

        # Paginate
        page = self.paginate_queryset(trades_qs)
        trade_list = page if page is not None else trades_qs

        # Get journal entries for these trades
        trade_orders = [t.order for t in trade_list]
        journal_map = {}
        journal_entries = TradeJournalEntry.objects.filter(
            user=user, trade__order__in=trade_orders
        ).select_related('trade').prefetch_related('tags')
        for je in journal_entries:
            journal_map[je.trade.order] = je

        results = []
        for t in trade_list:
            je = journal_map.get(t.order)
            results.append({
                'order': t.order,
                'symbol': t.symbol,
                'cmd': t.cmd,
                'volume': t.volume,
                'open_time': t.open_time,
                'close_time': t.close_time,
                'open_price': str(t.open_price),
                'close_price': str(t.close_price),
                'profit': str(t.profit),
                'sl': str(t.sl),
                'tp': str(t.tp),
                'has_journal': je is not None,
                'journal_id': str(je.id) if je else None,
                'rating': je.rating if je else None,
                'tags': [{'id': str(tag.id), 'name': tag.name, 'color': tag.color}
                         for tag in je.tags.all()] if je else [],
                'emotional_state': je.emotional_state if je else '',
            })

        return self.get_paginated_response(results)

    def create(self, request, *args, **kwargs):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No active challenge accounts found."}, status=404)

        trade_order = request.data.get('trade_order')
        if not trade_order:
            return Response({"detail": "trade_order is required."}, status=400)

        try:
            trade = MT5Trade.objects.get(
                order=trade_order, account_id=enrollment.mt5_account_id
            )
        except MT5Trade.DoesNotExist:
            return Response({"detail": "Trade not found."}, status=404)

        # Check if entry already exists
        existing = TradeJournalEntry.objects.filter(trade=trade).first()
        if existing:
            return Response({"detail": "Journal entry already exists.", "id": str(existing.id)}, status=400)

        serializer = TradeJournalEntrySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save(user=user, enrollment=enrollment, trade=trade)

        return Response(TradeJournalEntrySerializer(entry).data, status=201)


class JournalEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Single trade journal entry CRUD by trade order number."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeJournalEntrySerializer

    def get_object(self):
        user = self.request.user
        order = self.kwargs['order']
        try:
            return TradeJournalEntry.objects.select_related('trade').prefetch_related('tags').get(
                user=user, trade__order=order
            )
        except TradeJournalEntry.DoesNotExist:
            return None

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            # Return trade data without journal entry
            enrollment, _ = get_enrollment(request.user, request)
            if not enrollment:
                return Response({"detail": "Not found."}, status=404)
            try:
                trade = MT5Trade.objects.get(
                    order=self.kwargs['order'], account_id=enrollment.mt5_account_id
                )
            except MT5Trade.DoesNotExist:
                return Response({"detail": "Trade not found."}, status=404)

            return Response({
                'trade_order': trade.order,
                'trade_symbol': trade.symbol,
                'trade_cmd': trade.cmd,
                'trade_volume': trade.volume,
                'trade_open_time': trade.open_time,
                'trade_close_time': trade.close_time,
                'trade_open_price': str(trade.open_price),
                'trade_close_price': str(trade.close_price),
                'trade_profit': str(trade.profit),
                'trade_sl': str(trade.sl),
                'trade_tp': str(trade.tp),
                'has_journal': False,
            })
        return Response(TradeJournalEntrySerializer(obj).data)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            # Auto-create entry if it doesn't exist
            enrollment, _ = get_enrollment(request.user, request)
            if not enrollment:
                return Response({"detail": "Not found."}, status=404)
            try:
                trade = MT5Trade.objects.get(
                    order=self.kwargs['order'], account_id=enrollment.mt5_account_id
                )
            except MT5Trade.DoesNotExist:
                return Response({"detail": "Trade not found."}, status=404)

            serializer = TradeJournalEntrySerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            obj = serializer.save(user=request.user, enrollment=enrollment, trade=trade)
            return Response(TradeJournalEntrySerializer(obj).data, status=201)

        serializer = TradeJournalEntrySerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        obj = self.get_object()
        if not obj:
            return Response({"detail": "Not found."}, status=404)
        obj.delete()
        return Response(status=204)


class JournalEntryBulkUpdateView(APIView):
    """Bulk tag/rate trades."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = BulkUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No active challenge accounts found."}, status=404)

        trade_orders = data['trade_orders']
        trades = MT5Trade.objects.filter(
            order__in=trade_orders, account_id=enrollment.mt5_account_id
        )

        updated = 0
        for trade in trades:
            entry, created = TradeJournalEntry.objects.get_or_create(
                trade=trade, defaults={'user': user, 'enrollment': enrollment}
            )
            if 'rating' in data:
                entry.rating = data['rating']
            if 'emotional_state' in data:
                entry.emotional_state = data['emotional_state']
            entry.save()

            if 'tag_ids' in data:
                tags = TradeTag.objects.filter(id__in=data['tag_ids'], user=user)
                entry.tags.add(*tags)
            updated += 1

        return Response({"updated": updated})


# ─── Screenshot Upload ──────────────────────────────────────────────

class JournalScreenshotUploadView(APIView):
    """Upload trade screenshots to BunnyCDN."""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
    MAX_SIZE = 5 * 1024 * 1024  # 5MB

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"detail": "No file provided."}, status=400)

        if file.content_type not in self.ALLOWED_TYPES:
            return Response({"detail": "Only JPEG, PNG, and WebP images are allowed."}, status=400)

        if file.size > self.MAX_SIZE:
            return Response({"detail": "File size exceeds 5MB limit."}, status=400)

        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else 'jpg'
        filename = f"journal/{request.user.id}/{uuid.uuid4()}.{ext}"

        try:
            cdn_url = upload_to_bunnycdn(file, filename)
        except Exception as e:
            logger.error(f"BunnyCDN upload failed: {e}")
            return Response({"detail": "Upload failed."}, status=500)

        return Response({"url": cdn_url}, status=201)


# ─── Tags ───────────────────────────────────────────────────────────

class TagCategoryListView(generics.ListAPIView):
    """List all tag categories."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TagCategorySerializer
    queryset = TagCategory.objects.all()
    pagination_class = None


class TradeTagListCreateView(generics.ListCreateAPIView):
    """List user's tags + create new ones."""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TradeTagCreateSerializer
        return TradeTagSerializer

    def get_queryset(self):
        return TradeTag.objects.filter(
            user=self.request.user
        ).select_related('category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TradeTagDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Update/delete a tag."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradeTagSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return TradeTag.objects.filter(user=self.request.user)


# ─── Sessions ───────────────────────────────────────────────────────

class TradingSessionListCreateView(generics.ListCreateAPIView):
    """List/create trading sessions."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradingSessionSerializer
    pagination_class = JournalPagination

    def get_queryset(self):
        user = self.request.user
        enrollment, _ = get_enrollment(user, self.request)
        if not enrollment:
            return TradingSession.objects.none()
        return TradingSession.objects.filter(user=user, enrollment=enrollment)

    def perform_create(self, serializer):
        user = self.request.user
        enrollment, _ = get_enrollment(user, self.request)
        serializer.save(user=user, enrollment=enrollment)


class TradingSessionDetailView(generics.RetrieveUpdateAPIView):
    """Get/update session by date."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TradingSessionSerializer

    def get_object(self):
        user = self.request.user
        enrollment, _ = get_enrollment(user, self.request)
        session_date = self.kwargs['date']

        session, _ = TradingSession.objects.get_or_create(
            user=user, enrollment=enrollment, date=session_date,
            defaults={}
        )
        return session


# ─── Analytics ──────────────────────────────────────────────────────

class JournalCalendarView(APIView):
    """Monthly P&L heatmap data."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        month = request.query_params.get('month')  # YYYY-MM format
        if not month:
            now = timezone.now()
            month = f"{now.year}-{now.month:02d}"

        year, mo = map(int, month.split('-'))
        start = date(year, mo, 1)
        if mo == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, mo + 1, 1)

        account_id = enrollment.mt5_account_id
        daily = MT5Trade.objects.filter(
            account_id=account_id, is_closed=True,
            close_time__date__gte=start, close_time__date__lt=end
        ).values('close_time__date').annotate(
            pnl=Sum('profit'),
            trade_count=Count('id'),
            wins=Count('id', filter=Q(profit__gt=0)),
            losses=Count('id', filter=Q(profit__lt=0)),
        ).order_by('close_time__date')

        # Session data overlay
        sessions = TradingSession.objects.filter(
            user=user, enrollment=enrollment,
            date__gte=start, date__lt=end
        ).values('date', 'energy_level', 'discipline_score', 'market_conditions')
        session_map = {str(s['date']): s for s in sessions}

        # Breach data overlay
        breaches = BreachHistory.objects.filter(
            enrollment=enrollment,
            breached_at__date__gte=start, breached_at__date__lt=end
        ).values('breached_at__date').annotate(count=Count('id'))
        breach_map = {str(b['breached_at__date']): b['count'] for b in breaches}

        calendar_data = []
        for d in daily:
            dt = str(d['close_time__date'])
            session = session_map.get(dt, {})
            calendar_data.append({
                'date': dt,
                'pnl': safe_float(d['pnl']),
                'trades': d['trade_count'],
                'wins': d['wins'],
                'losses': d['losses'],
                'win_rate': safe_div(d['wins'], d['trade_count']) * 100,
                'has_session': dt in session_map,
                'energy_level': session.get('energy_level'),
                'discipline_score': session.get('discipline_score'),
                'market_conditions': session.get('market_conditions', ''),
                'breaches': breach_map.get(dt, 0),
            })

        return Response({
            'month': month,
            'data': calendar_data,
        })


class SymbolPerformanceView(APIView):
    """Per-symbol breakdown."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).values('symbol').annotate(
            total_pnl=Sum('profit'),
            trade_count=Count('id'),
            wins=Count('id', filter=Q(profit__gt=0)),
            avg_profit=Avg('profit'),
            total_volume=Sum('volume'),
        ).order_by('-total_pnl')

        results = []
        for t in trades:
            results.append({
                'symbol': t['symbol'],
                'pnl': safe_float(t['total_pnl']),
                'trades': t['trade_count'],
                'wins': t['wins'],
                'win_rate': safe_div(t['wins'], t['trade_count']) * 100,
                'avg_profit': safe_float(t['avg_profit']),
                'volume': safe_float(t['total_volume']),
            })
        return Response(results)


class TimePerformanceView(APIView):
    """Hour + day-of-week heatmap."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).annotate(
            hour=ExtractHour('open_time'),
            weekday=ExtractWeekDay('open_time')
        ).values('hour', 'weekday').annotate(
            pnl=Sum('profit'),
            count=Count('id'),
            wins=Count('id', filter=Q(profit__gt=0)),
        ).order_by('weekday', 'hour')

        # Build heatmap grid
        heatmap = []
        for t in trades:
            heatmap.append({
                'hour': t['hour'],
                'weekday': t['weekday'],
                'pnl': safe_float(t['pnl']),
                'trades': t['count'],
                'win_rate': safe_div(t['wins'], t['count']) * 100,
            })

        return Response(heatmap)


class TagPerformanceView(APIView):
    """P&L by tag."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        tags = TradeTag.objects.filter(
            user=user,
            journal_entries__enrollment=enrollment
        ).annotate(
            total_pnl=Sum('journal_entries__trade__profit'),
            trade_count=Count('journal_entries'),
            wins=Count('journal_entries', filter=Q(journal_entries__trade__profit__gt=0)),
            avg_pnl=Avg('journal_entries__trade__profit'),
        ).order_by('-total_pnl')

        results = []
        for t in tags:
            results.append({
                'id': str(t.id),
                'name': t.name,
                'color': t.color,
                'category': t.category.name,
                'pnl': safe_float(t.total_pnl),
                'trades': t.trade_count,
                'wins': t.wins,
                'win_rate': safe_div(t.wins, t.trade_count) * 100,
                'avg_pnl': safe_float(t.avg_pnl),
            })
        return Response(results)


class EquityCurveView(APIView):
    """Equity + drawdown data from snapshots."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        period = request.query_params.get('period', '30d')
        days = int(period.replace('d', '')) if period.endswith('d') else 30
        start_date = date.today() - timedelta(days=days)

        snapshots = MT5DailySnapshot.objects.filter(
            enrollment=enrollment, date__gte=start_date
        ).order_by('date')

        data = []
        starting_balance = safe_float(enrollment.account_size)
        for s in snapshots:
            balance = safe_float(s.ending_balance)
            data.append({
                'date': str(s.date),
                'balance': balance,
                'equity': safe_float(s.ending_equity),
                'drawdown_pct': safe_div(
                    starting_balance - balance, starting_balance
                ) * 100 if balance < starting_balance else 0,
                'pnl': balance - starting_balance,
            })

        return Response(data)


class MFEMAEAnalysisView(APIView):
    """MFE/MAE scatter data - approximated from SL/TP vs actual P&L."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).order_by('-close_time')[:500]

        data = []
        for t in trades:
            # Approximate MFE/MAE from trade data
            open_p = safe_float(t.open_price)
            close_p = safe_float(t.close_price)
            sl = safe_float(t.sl)
            tp = safe_float(t.tp)

            if t.cmd == 0:  # Buy
                mae = (sl - open_p) * t.volume * 100000 if sl > 0 else 0
                mfe = (tp - open_p) * t.volume * 100000 if tp > 0 else safe_float(t.profit) * 2
            else:  # Sell
                mae = (open_p - sl) * t.volume * 100000 if sl > 0 else 0
                mfe = (open_p - tp) * t.volume * 100000 if tp > 0 else safe_float(t.profit) * 2

            data.append({
                'order': t.order,
                'symbol': t.symbol,
                'profit': safe_float(t.profit),
                'mfe': abs(mfe) if mfe > 0 else safe_float(t.profit) * 1.5,
                'mae': -abs(mae) if mae < 0 else safe_float(t.profit) * -0.5,
                'volume': t.volume,
            })

        return Response(data)


class ComplianceDashboardView(APIView):
    """Prop firm rule compliance status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        account_id = enrollment.mt5_account_id
        trades_qs = MT5Trade.objects.filter(account_id=account_id, is_closed=True)
        starting_balance = safe_float(enrollment.account_size)
        live_balance = fetch_user_balance(account_id)
        if live_balance is not None:
            current_balance = safe_float(live_balance)
        else:
            total_pnl = safe_float(trades_qs.aggregate(s=Sum('profit'))['s'])
            current_balance = starting_balance + total_pnl
        net_pnl = current_balance - starting_balance

        # Phase rules
        phase = None
        try:
            challenge = enrollment.challenge
            if 'phase_1' in enrollment.status:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='phase-1').first()
            elif 'phase_2' in enrollment.status:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='phase-2').first()
            else:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='live-trader').first()
        except Exception:
            pass

        rules = []
        if phase:
            # Daily loss
            today_pnl = safe_float(
                MT5Trade.objects.filter(
                    account_id=account_id, is_closed=True,
                    close_time__date=date.today()
                ).aggregate(s=Sum('profit'))['s']
            )
            daily_limit = starting_balance * (safe_float(phase.max_daily_loss) / 100)
            rules.append({
                'name': 'Daily Loss Limit',
                'limit': round(daily_limit, 2),
                'current': round(abs(min(today_pnl, 0)), 2),
                'used_pct': round(safe_div(abs(min(today_pnl, 0)), daily_limit) * 100, 1),
                'status': 'safe' if abs(min(today_pnl, 0)) < daily_limit * 0.8 else
                          'warning' if abs(min(today_pnl, 0)) < daily_limit else 'breached',
            })

            # Total loss
            total_limit = starting_balance * (safe_float(phase.max_loss) / 100)
            rules.append({
                'name': 'Total Loss Limit',
                'limit': round(total_limit, 2),
                'current': round(abs(min(net_pnl, 0)), 2),
                'used_pct': round(safe_div(abs(min(net_pnl, 0)), total_limit) * 100, 1),
                'status': 'safe' if abs(min(net_pnl, 0)) < total_limit * 0.8 else
                          'warning' if abs(min(net_pnl, 0)) < total_limit else 'breached',
            })

            # Profit target
            profit_target_pct = safe_float(phase.profit_target)
            if profit_target_pct > 0:
                target = starting_balance * (profit_target_pct / 100)
                rules.append({
                    'name': 'Profit Target',
                    'target': round(target, 2),
                    'current': round(max(net_pnl, 0), 2),
                    'progress_pct': round(safe_div(max(net_pnl, 0), target) * 100, 1),
                    'status': 'achieved' if net_pnl >= target else 'in_progress',
                })

        # Breach history
        breaches = BreachHistory.objects.filter(
            enrollment=enrollment
        ).order_by('-breached_at')[:10]

        breach_data = [
            {
                'date': str(b.breached_at.date()) if b.breached_at else '',
                'type': b.rule,
                'severity': 'hard',
                'description': b.reason or '',
            }
            for b in breaches
        ]

        # Soft breaches
        soft_breaches = SoftBreach.objects.filter(
            enrollment=enrollment
        ).order_by('-detected_at')[:10]

        soft_data = [
            {
                'date': str(sb.detected_at.date()) if sb.detected_at else '',
                'type': sb.rule or '',
                'message': sb.description or '',
            }
            for sb in soft_breaches
        ]

        return Response({
            'rules': rules,
            'breaches': breach_data,
            'soft_breaches': soft_data,
            'enrollment_status': enrollment.status,
        })


class WinLossDistributionView(APIView):
    """P&L histogram data."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).values_list('profit', flat=True)

        profits = [safe_float(p) for p in trades]
        if not profits:
            return Response({'bins': [], 'stats': {}})

        min_p = min(profits)
        max_p = max(profits)
        bin_count = 20
        bin_width = (max_p - min_p) / bin_count if max_p != min_p else 1

        bin_objects = []
        for i in range(bin_count):
            lo = min_p + i * bin_width
            hi = lo + bin_width
            count = sum(1 for p in profits if lo <= p < hi)
            bin_objects.append({
                'range': f"${lo:,.0f} - ${hi:,.0f}",
                'range_min': round(lo, 2),
                'range_max': round(hi, 2),
                'count': count,
            })

        mean_val = sum(profits) / len(profits)
        sorted_profits = sorted(profits)

        return Response({
            'bins': bin_objects,
            'stats': {
                'mean': round(mean_val, 2),
                'median': round(sorted_profits[len(profits) // 2], 2),
                'std_dev': round(
                    (sum((p - mean_val) ** 2 for p in profits) / len(profits)) ** 0.5, 2
                ),
                'total_trades': len(profits),
            },
        })


class HoldingTimeView(APIView):
    """Duration vs P&L analysis."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).order_by('-close_time')[:500]

        # Aggregate into time buckets
        buckets_def = [
            ('< 1 min', 0, 1),
            ('1-5 min', 1, 5),
            ('5-15 min', 5, 15),
            ('15-30 min', 15, 30),
            ('30-60 min', 30, 60),
            ('1-4 hrs', 60, 240),
            ('4-24 hrs', 240, 1440),
            ('> 24 hrs', 1440, float('inf')),
        ]
        bucket_data = {label: {'trades': 0, 'pnl': 0.0, 'wins': 0} for label, _, _ in buckets_def}

        for t in trades:
            duration = (t.close_time - t.open_time).total_seconds() / 60
            profit = safe_float(t.profit)
            for label, lo, hi in buckets_def:
                if lo <= duration < hi:
                    bucket_data[label]['trades'] += 1
                    bucket_data[label]['pnl'] += profit
                    if profit > 0:
                        bucket_data[label]['wins'] += 1
                    break

        result = []
        for label, _, _ in buckets_def:
            b = bucket_data[label]
            if b['trades'] > 0:
                result.append({
                    'label': label,
                    'trades': b['trades'],
                    'pnl': round(b['pnl'], 2),
                    'win_rate': round(b['wins'] / b['trades'] * 100, 1),
                })

        return Response(result)


class MonteCarloView(APIView):
    """Monte Carlo simulation results."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = list(MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).values_list('profit', flat=True))

        if len(trades) < 10:
            return Response({"detail": "Need at least 10 trades for simulation."}, status=400)

        profits = [safe_float(p) for p in trades]
        starting_balance = safe_float(enrollment.account_size)
        num_sims = 1000
        num_trades = len(profits)

        # Run simulations
        final_balances = []
        max_drawdowns = []
        target_reached = 0

        # Get profit target
        phase = None
        try:
            challenge = enrollment.challenge
            if 'phase_1' in enrollment.status:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='phase-1').first()
            elif 'phase_2' in enrollment.status:
                phase = ChallengePhase.objects.filter(challenge=challenge, phase_type='phase-2').first()
        except Exception:
            pass

        profit_target = starting_balance * 1.08  # default 8%
        if phase and phase.profit_target:
            profit_target = starting_balance * (1 + safe_float(phase.profit_target) / 100)

        percentile_curves = {5: [], 25: [], 50: [], 75: [], 95: []}
        all_curves = []

        for _ in range(num_sims):
            balance = starting_balance
            peak = balance
            max_dd = 0
            curve = [balance]

            sampled = random.choices(profits, k=num_trades)
            for p in sampled:
                balance += p
                peak = max(peak, balance)
                dd = (peak - balance) / peak if peak > 0 else 0
                max_dd = max(max_dd, dd)
                curve.append(balance)

            final_balances.append(balance)
            max_drawdowns.append(max_dd * 100)
            if balance >= profit_target:
                target_reached += 1
            all_curves.append(curve)

        # Calculate percentile curves
        for step in range(num_trades + 1):
            values = sorted([c[step] for c in all_curves])
            for pct in percentile_curves:
                idx = int(len(values) * pct / 100)
                idx = min(idx, len(values) - 1)
                percentile_curves[pct].append(round(values[idx], 2))

        final_balances.sort()
        max_drawdowns.sort()

        return Response({
            'simulations': num_sims,
            'trade_count': num_trades,
            'starting_balance': starting_balance,
            'profit_target': profit_target,
            'percentile_curves': percentile_curves,
            'probability_target': round(target_reached / num_sims * 100, 1),
            'risk_of_ruin': round(sum(1 for b in final_balances if b <= 0) / num_sims * 100, 1),
            'median_final': round(final_balances[num_sims // 2], 2),
            'p5_final': round(final_balances[int(num_sims * 0.05)], 2),
            'p95_final': round(final_balances[int(num_sims * 0.95)], 2),
            'avg_max_drawdown': round(sum(max_drawdowns) / num_sims, 1),
            'median_max_drawdown': round(max_drawdowns[num_sims // 2], 1),
        })


class StreakAnalysisView(APIView):
    """Win/loss streak analysis."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        enrollment, _ = get_enrollment(request.user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        trades = MT5Trade.objects.filter(
            account_id=enrollment.mt5_account_id, is_closed=True
        ).order_by('close_time').values_list('profit', 'close_time')

        streaks = []
        current_type = None
        current_count = 0
        current_pnl = 0
        current_start = None

        for profit, close_time in trades:
            p = safe_float(profit)
            t = 'win' if p > 0 else 'loss' if p < 0 else None
            if t is None:
                continue

            if t == current_type:
                current_count += 1
                current_pnl += p
            else:
                if current_type and current_count > 0:
                    streaks.append({
                        'type': current_type,
                        'count': current_count,
                        'pnl': round(current_pnl, 2),
                        'start': str(current_start),
                        'end': str(close_time),
                    })
                current_type = t
                current_count = 1
                current_pnl = p
                current_start = close_time

        if current_type and current_count > 0:
            streaks.append({
                'type': current_type,
                'count': current_count,
                'pnl': round(current_pnl, 2),
                'start': str(current_start),
            })

        # Stats
        win_streaks = [s for s in streaks if s['type'] == 'win']
        loss_streaks = [s for s in streaks if s['type'] == 'loss']

        return Response({
            'streaks': streaks[-50:],  # Last 50 streaks
            'max_win_streak': max((s['count'] for s in win_streaks), default=0),
            'max_loss_streak': max((s['count'] for s in loss_streaks), default=0),
            'avg_win_streak': round(safe_div(
                sum(s['count'] for s in win_streaks), len(win_streaks)
            ), 1),
            'avg_loss_streak': round(safe_div(
                sum(s['count'] for s in loss_streaks), len(loss_streaks)
            ), 1),
            'current_streak': streaks[-1] if streaks else None,
        })


# ─── AI Endpoints ───────────────────────────────────────────────────

class AIDailySummaryView(APIView):
    """AI daily performance summary."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        summary_date = request.query_params.get('date', str(date.today()))

        # Check cache
        cached = JournalInsight.objects.filter(
            user=user, enrollment=enrollment,
            insight_type='daily_summary',
            status='completed',
            period_start=summary_date
        ).first()

        if cached and cached.expires_at and cached.expires_at > timezone.now():
            return Response(cached.content)

        # Generate new insight
        account_id = enrollment.mt5_account_id
        trades = MT5Trade.objects.filter(
            account_id=account_id, is_closed=True,
            close_time__date=summary_date
        )

        if not trades.exists():
            return Response({
                'summary': 'No trades found for this day.',
                'strength': '',
                'improvement': '',
                'actionable_tip': '',
                'risk_alert': '',
            })

        # Build context for Gemini
        trade_data = []
        for t in trades:
            trade_data.append({
                'symbol': t.symbol,
                'side': 'buy' if t.cmd == 0 else 'sell',
                'volume': t.volume,
                'profit': safe_float(t.profit),
                'open_time': str(t.open_time),
                'close_time': str(t.close_time),
            })

        total_pnl = sum(t['profit'] for t in trade_data)
        win_count = sum(1 for t in trade_data if t['profit'] > 0)
        total = len(trade_data)

        try:
            from wefund.ai_analysis.journal_ai import generate_daily_summary
            content = generate_daily_summary(
                trade_data=trade_data,
                total_pnl=total_pnl,
                win_rate=safe_div(win_count, total) * 100,
                date_str=summary_date,
            )
        except Exception as e:
            logger.error(f"AI daily summary failed: {e}")
            content = {
                'summary': f'Today you made {total} trades with a net P&L of ${total_pnl:.2f}. '
                           f'Win rate: {safe_div(win_count, total) * 100:.0f}%.',
                'strength': 'Active trading day.' if total > 3 else 'Selective trading.',
                'improvement': 'Review your losing trades for patterns.',
                'actionable_tip': 'Focus on your best setups tomorrow.',
                'risk_alert': '' if total_pnl >= 0 else 'Net loss day - review risk management.',
            }

        # Cache result
        JournalInsight.objects.update_or_create(
            user=user, enrollment=enrollment,
            insight_type='daily_summary',
            period_start=summary_date,
            defaults={
                'status': 'completed',
                'content': content,
                'expires_at': timezone.now() + timedelta(hours=6),
            }
        )

        return Response(content)


class AIChatView(APIView):
    """Natural language Q&A about trading performance."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        serializer = AIChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        question = serializer.validated_data['question']
        enrollment_id = serializer.validated_data.get('enrollment_id')

        if enrollment_id:
            try:
                enrollment = ChallengeEnrollment.objects.get(
                    pk=enrollment_id, client__user=user
                )
            except ChallengeEnrollment.DoesNotExist:
                return Response({"detail": "Enrollment not found."}, status=404)
        else:
            enrollment, _ = get_enrollment(user, request)

        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        # Rate limiting (5/hour)
        from django.core.cache import cache
        rate_key = f"journal_ai_chat:{user.id}"
        count = cache.get(rate_key, 0)
        if count >= 5:
            return Response(
                {"detail": "Rate limit exceeded. Max 5 AI queries per hour."},
                status=429
            )

        # Check cache
        prompt_hash = hashlib.sha256(
            f"{user.id}:{enrollment.pk}:{question}".encode()
        ).hexdigest()[:32]

        cached = JournalInsight.objects.filter(
            prompt_hash=prompt_hash,
            status='completed',
            expires_at__gt=timezone.now()
        ).first()

        if cached:
            return Response({
                'answer': cached.content.get('answer', ''),
                'cached': True,
                'remaining_queries': 5 - count,
            })

        # Build context and call Gemini
        account_id = enrollment.mt5_account_id
        trades_qs = MT5Trade.objects.filter(
            account_id=account_id, is_closed=True
        ).order_by('-close_time')
        trades = trades_qs[:100]

        trade_summary = {
            'total_trades': trades_qs.count(),
            'net_pnl': safe_float(trades_qs[:100].aggregate(s=Sum('profit'))['s']),
            'symbols': list(set(t.symbol for t in trades))[:10],
        }

        try:
            from wefund.ai_analysis.journal_ai import answer_journal_question
            answer = answer_journal_question(
                question=question,
                trade_summary=trade_summary,
                trades=[{
                    'symbol': t.symbol,
                    'side': 'buy' if t.cmd == 0 else 'sell',
                    'profit': safe_float(t.profit),
                    'volume': t.volume,
                    'open_time': str(t.open_time),
                    'close_time': str(t.close_time),
                } for t in trades[:50]],
            )
        except Exception as e:
            logger.error(f"AI chat failed: {e}")
            answer = "I'm unable to process your question right now. Please try again later."

        # Cache
        JournalInsight.objects.create(
            user=user, enrollment=enrollment,
            insight_type='chat_response',
            status='completed',
            prompt_hash=prompt_hash,
            question=question,
            content={'answer': answer},
            expires_at=timezone.now() + timedelta(hours=1),
        )

        cache.set(rate_key, count + 1, 3600)

        return Response({
            'answer': answer,
            'cached': False,
            'remaining_queries': 5 - count - 1,
        })


class AIReportView(APIView):
    """Weekly/monthly AI report."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, period):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        if period not in ('weekly', 'monthly'):
            return Response({"detail": "Period must be 'weekly' or 'monthly'."}, status=400)

        # Determine date range
        today = date.today()
        if period == 'weekly':
            start = today - timedelta(days=today.weekday())
            end = today
            insight_type = 'weekly_report'
        else:
            start = today.replace(day=1)
            end = today
            insight_type = 'monthly_report'

        # Check cache
        cached = JournalInsight.objects.filter(
            user=user, enrollment=enrollment,
            insight_type=insight_type,
            status='completed',
            period_start=start,
            period_end=end,
        ).first()

        if cached and cached.expires_at and cached.expires_at > timezone.now():
            return Response(cached.content)

        # Build report data
        account_id = enrollment.mt5_account_id
        trades = MT5Trade.objects.filter(
            account_id=account_id, is_closed=True,
            close_time__date__gte=start,
            close_time__date__lte=end,
        )

        total = trades.count()
        if total == 0:
            return Response({
                'executive_summary': f'No trades during this {period} period.',
                'period': {'start': str(start), 'end': str(end)},
            })

        wins = trades.filter(profit__gt=0).count()
        total_pnl = safe_float(trades.aggregate(s=Sum('profit'))['s'])

        # Daily breakdown
        daily = trades.values('close_time__date').annotate(
            pnl=Sum('profit'), count=Count('id')
        ).order_by('close_time__date')

        best_day = max(daily, key=lambda d: safe_float(d['pnl']), default=None)
        worst_day = min(daily, key=lambda d: safe_float(d['pnl']), default=None)

        try:
            from wefund.ai_analysis.journal_ai import generate_period_report
            content = generate_period_report(
                period=period,
                start=str(start),
                end=str(end),
                total_trades=total,
                win_rate=safe_div(wins, total) * 100,
                net_pnl=total_pnl,
                best_day=str(best_day['close_time__date']) if best_day else '',
                worst_day=str(worst_day['close_time__date']) if worst_day else '',
            )
        except Exception as e:
            logger.error(f"AI report generation failed: {e}")
            content = {
                'executive_summary': f'This {period}: {total} trades, '
                                     f'${total_pnl:.2f} net P&L, '
                                     f'{safe_div(wins, total) * 100:.0f}% win rate.',
                'best_day': str(best_day['close_time__date']) if best_day else 'N/A',
                'worst_day': str(worst_day['close_time__date']) if worst_day else 'N/A',
                'period': {'start': str(start), 'end': str(end)},
            }

        # Cache
        JournalInsight.objects.update_or_create(
            user=user, enrollment=enrollment,
            insight_type=insight_type,
            period_start=start,
            period_end=end,
            defaults={
                'status': 'completed',
                'content': content,
                'expires_at': timezone.now() + timedelta(hours=12),
            }
        )

        return Response(content)


class AIPatternDetectionView(APIView):
    """Detected trading patterns."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        # Check cache
        cached = JournalInsight.objects.filter(
            user=user, enrollment=enrollment,
            insight_type='pattern_detection',
            status='completed',
            expires_at__gt=timezone.now()
        ).first()

        if cached:
            return Response(cached.content)

        # Build pattern data
        account_id = enrollment.mt5_account_id
        trades = MT5Trade.objects.filter(
            account_id=account_id, is_closed=True
        ).order_by('-close_time')[:200]

        if trades.count() < 20:
            return Response({
                'profitable_patterns': [],
                'losing_patterns': [],
                'behavioral_patterns': [],
                'suggestions': ['Complete more trades to enable pattern detection.'],
            })

        try:
            from wefund.ai_analysis.journal_ai import detect_patterns
            content = detect_patterns(
                trades=[{
                    'symbol': t.symbol,
                    'side': 'buy' if t.cmd == 0 else 'sell',
                    'profit': safe_float(t.profit),
                    'volume': t.volume,
                    'open_time': str(t.open_time),
                    'close_time': str(t.close_time),
                    'open_price': safe_float(t.open_price),
                    'close_price': safe_float(t.close_price),
                } for t in trades]
            )
        except Exception as e:
            logger.error(f"Pattern detection failed: {e}")
            content = {
                'profitable_patterns': [],
                'losing_patterns': [],
                'behavioral_patterns': [],
                'suggestions': ['AI pattern detection is temporarily unavailable.'],
            }

        JournalInsight.objects.update_or_create(
            user=user, enrollment=enrollment,
            insight_type='pattern_detection',
            defaults={
                'status': 'completed',
                'content': content,
                'expires_at': timezone.now() + timedelta(hours=24),
            }
        )

        return Response(content)


class AIWhatIfView(APIView):
    """Performance scenario simulator."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        enrollment, _ = get_enrollment(user, request)
        if not enrollment:
            return Response({"detail": "No enrollment found."}, status=404)

        question = request.data.get('question', '')
        if not question:
            return Response({"detail": "question is required."}, status=400)

        account_id = enrollment.mt5_account_id
        trades = MT5Trade.objects.filter(
            account_id=account_id, is_closed=True
        )
        total = trades.count()
        wins = trades.filter(profit__gt=0).count()
        net_pnl = safe_float(trades.aggregate(s=Sum('profit'))['s'])

        try:
            from wefund.ai_analysis.journal_ai import simulate_what_if
            content = simulate_what_if(
                question=question,
                total_trades=total,
                win_rate=safe_div(wins, total) * 100,
                net_pnl=net_pnl,
                starting_balance=safe_float(enrollment.account_size),
            )
        except Exception as e:
            logger.error(f"What-if simulation failed: {e}")
            content = {
                'projected_pnl': net_pnl,
                'projected_win_rate': safe_div(wins, total) * 100,
                'risk_assessment': 'Unable to simulate at this time.',
                'recommendation': 'Try again later.',
            }

        return Response(content)


# ─── Mentor Access ──────────────────────────────────────────────────

class MentorAccessListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MentorAccessSerializer

    def get_queryset(self):
        return MentorAccess.objects.filter(
            trader=self.request.user, is_active=True
        ).select_related('mentor')

    def perform_create(self, serializer):
        serializer.save(trader=self.request.user)


class MentorAccessRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            access = MentorAccess.objects.get(
                pk=pk, trader=request.user
            )
        except MentorAccess.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        access.is_active = False
        access.save()
        return Response(status=204)


class SharedJournalView(APIView):
    """View shared journal as mentor."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            access = MentorAccess.objects.get(
                pk=pk, mentor=request.user, is_active=True
            )
        except MentorAccess.DoesNotExist:
            return Response({"detail": "Access not found or expired."}, status=404)

        if access.expires_at and access.expires_at < timezone.now():
            return Response({"detail": "Access has expired."}, status=403)

        # Return basic stats for the trader
        trader = access.trader
        enrollments = access.shared_enrollments.all()
        if not enrollments.exists():
            enrollments = ChallengeEnrollment.objects.filter(
                client__user=trader
            ).exclude(mt5_account_id__isnull=True)

        data = {
            'trader': trader.username,
            'access_level': access.access_level,
            'enrollments': get_available_enrollments(enrollments),
        }
        return Response(data)


# ─── Share Links ─────────────────────────────────────────────────────

class JournalShareLinkCreateView(APIView):
    """Create or return existing share link for an enrollment."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        enrollment_id = request.data.get('enrollment_id')
        if not enrollment_id:
            return Response({"detail": "enrollment_id is required."}, status=400)

        try:
            enrollment = ChallengeEnrollment.objects.get(
                pk=enrollment_id, client__user=request.user
            )
        except ChallengeEnrollment.DoesNotExist:
            return Response({"detail": "Enrollment not found."}, status=404)

        link, created = JournalShareLink.objects.get_or_create(
            user=request.user,
            enrollment=enrollment,
            defaults={'is_active': True}
        )

        # Reactivate if it was deactivated
        if not link.is_active:
            link.is_active = True
            link.save(update_fields=['is_active'])

        return Response({
            'id': str(link.id),
            'enrollment_id': str(link.enrollment_id),
            'is_active': link.is_active,
            'created_at': link.created_at.isoformat(),
            'expires_at': link.expires_at.isoformat() if link.expires_at else None,
        }, status=201 if created else 200)


class JournalShareLinkListView(APIView):
    """List all share links for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        links = JournalShareLink.objects.filter(
            user=request.user
        ).select_related('enrollment').order_by('-created_at')

        data = [
            {
                'id': str(link.id),
                'enrollment_id': str(link.enrollment_id),
                'account_id': link.enrollment.mt5_account_id,
                'challenge_name': getattr(link.enrollment.challenge, 'name', None),
                'is_active': link.is_active,
                'created_at': link.created_at.isoformat(),
                'expires_at': link.expires_at.isoformat() if link.expires_at else None,
            }
            for link in links
        ]
        return Response(data)


class JournalShareLinkDeactivateView(APIView):
    """Deactivate a share link."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            link = JournalShareLink.objects.get(pk=pk, user=request.user)
        except JournalShareLink.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

        link.is_active = False
        link.save(update_fields=['is_active'])
        return Response(status=204)


class PublicSharedJournalView(APIView):
    """Public endpoint — anyone with the link can view sanitized journal data."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            link = JournalShareLink.objects.select_related(
                'user', 'enrollment', 'enrollment__challenge'
            ).get(pk=token)
        except (JournalShareLink.DoesNotExist, ValueError):
            return Response({"detail": "Journal not found."}, status=404)

        if not link.is_active:
            return Response({"detail": "This share link has been deactivated."}, status=404)

        if link.expires_at and link.expires_at < timezone.now():
            return Response({"detail": "This share link has expired."}, status=410)

        user = link.user
        enrollment = link.enrollment
        account_id = enrollment.mt5_account_id
        trades_qs = MT5Trade.objects.filter(account_id=account_id, is_closed=True)
        total_trades = trades_qs.count()

        # Core metrics
        starting_balance = safe_float(enrollment.account_size)
        live_balance = fetch_user_balance(account_id)
        if live_balance is not None:
            current_balance = safe_float(live_balance)
        else:
            total_pnl = safe_float(trades_qs.aggregate(s=Sum('profit'))['s'])
            current_balance = starting_balance + total_pnl
        net_pnl = current_balance - starting_balance

        wins = trades_qs.filter(profit__gt=0)
        losses = trades_qs.filter(profit__lt=0)
        win_count = wins.count()
        loss_count = losses.count()
        total_winners = safe_float(wins.aggregate(s=Sum('profit'))['s'])
        total_losers = safe_float(losses.aggregate(s=Sum('profit'))['s'])

        win_rate = safe_div(win_count, total_trades) * 100
        avg_win = safe_div(total_winners, win_count)
        avg_loss = safe_div(total_losers, loss_count)
        profit_factor = safe_div(total_winners, abs(total_losers))
        avg_rr = safe_div(avg_win, abs(avg_loss))
        expectancy = (win_rate / 100 * avg_win) + ((1 - win_rate / 100) * avg_loss)

        # Sharpe ratio + daily P&L
        daily_pnl = trades_qs.values('close_time__date').annotate(
            day_pnl=Sum('profit'),
            trade_count=Count('id'),
            day_wins=Count('id', filter=Q(profit__gt=0)),
        ).order_by('close_time__date')
        daily_returns = [safe_float(d['day_pnl']) for d in daily_pnl]
        if len(daily_returns) > 1:
            mean_ret = sum(daily_returns) / len(daily_returns)
            std_ret = (sum((r - mean_ret) ** 2 for r in daily_returns) / (len(daily_returns) - 1)) ** 0.5
            sharpe_ratio = safe_div(mean_ret, std_ret) * (252 ** 0.5) if std_ret else 0
        else:
            sharpe_ratio = 0

        # Streaks
        max_win_streak = max_loss_streak = cur_win = cur_loss = 0
        for d in daily_pnl:
            val = safe_float(d['day_pnl'])
            if val > 0:
                cur_win += 1; max_win_streak = max(max_win_streak, cur_win); cur_loss = 0
            elif val < 0:
                cur_loss += 1; max_loss_streak = max(max_loss_streak, cur_loss); cur_win = 0
            else:
                cur_win = cur_loss = 0

        # Best / worst day
        best_day_pnl = max(daily_returns) if daily_returns else 0
        worst_day_pnl = min(daily_returns) if daily_returns else 0
        avg_daily_pnl = sum(daily_returns) / len(daily_returns) if daily_returns else 0
        trading_days = len(daily_returns)
        winning_days = sum(1 for r in daily_returns if r > 0)
        losing_days = sum(1 for r in daily_returns if r < 0)

        # Calendar heatmap (last 3 months)
        now = timezone.now()
        three_months_ago = (now - timedelta(days=90)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        calendar_trades = trades_qs.filter(close_time__gte=three_months_ago).values(
            'close_time__date'
        ).annotate(
            day_pnl=Sum('profit'),
            trade_count=Count('id'),
            day_wins=Count('id', filter=Q(profit__gt=0)),
        ).order_by('close_time__date')

        calendar_data = [
            {
                'date': str(d['close_time__date']),
                'pnl': safe_float(d['day_pnl']),
                'trades': d['trade_count'],
                'wins': d['day_wins'],
            }
            for d in calendar_trades
        ]

        # Equity curve from snapshots
        snapshots = MT5DailySnapshot.objects.filter(
            enrollment=enrollment
        ).order_by('date').values('date', 'ending_balance', 'ending_equity', 'total_max_drawdown')

        equity_curve = [
            {
                'date': str(s['date']),
                'balance': safe_float(s['ending_balance']),
                'equity': safe_float(s['ending_equity']),
                'drawdown': safe_float(s['total_max_drawdown']),
            }
            for s in snapshots
        ]

        # Symbol performance
        symbol_perf = trades_qs.values('symbol').annotate(
            total_pnl=Sum('profit'),
            trade_count=Count('id'),
            wins=Count('id', filter=Q(profit__gt=0)),
            avg_profit=Avg('profit'),
            total_volume=Sum('volume'),
        ).order_by('-total_pnl')

        symbol_performance = [
            {
                'symbol': s['symbol'],
                'pnl': safe_float(s['total_pnl']),
                'trades': s['trade_count'],
                'wins': s['wins'],
                'win_rate': safe_div(s['wins'], s['trade_count']) * 100,
                'avg_profit': safe_float(s['avg_profit']),
                'volume': safe_float(s['total_volume']),
            }
            for s in symbol_perf
        ]

        # Time heatmap (hour + day-of-week)
        time_data = trades_qs.annotate(
            hour=ExtractHour('open_time'),
            weekday=ExtractWeekDay('open_time')
        ).values('hour', 'weekday').annotate(
            pnl=Sum('profit'),
            count=Count('id'),
            wins=Count('id', filter=Q(profit__gt=0)),
        ).order_by('weekday', 'hour')

        time_heatmap = [
            {
                'hour': t['hour'],
                'weekday': t['weekday'],
                'pnl': safe_float(t['pnl']),
                'trades': t['count'],
                'win_rate': safe_div(t['wins'], t['count']) * 100,
            }
            for t in time_data
        ]

        # Win/loss distribution (P&L histogram)
        all_profits = [safe_float(p) for p in trades_qs.values_list('profit', flat=True)]
        distribution = []
        if all_profits:
            min_p = min(all_profits)
            max_p = max(all_profits)
            bin_count = 20
            bin_width = (max_p - min_p) / bin_count if max_p != min_p else 1
            for i in range(bin_count):
                lo = min_p + i * bin_width
                hi = lo + bin_width
                count = sum(1 for p in all_profits if lo <= p < hi)
                distribution.append({
                    'range_min': round(lo, 2),
                    'range_max': round(hi, 2),
                    'count': count,
                })

        # Holding time buckets
        recent_for_holding = trades_qs.order_by('-close_time')[:500]
        holding_buckets_def = [
            ('< 1 min', 0, 1),
            ('1-5 min', 1, 5),
            ('5-15 min', 5, 15),
            ('15-30 min', 15, 30),
            ('30-60 min', 30, 60),
            ('1-4 hrs', 60, 240),
            ('4-24 hrs', 240, 1440),
            ('> 24 hrs', 1440, float('inf')),
        ]
        bucket_data = {label: {'trades': 0, 'pnl': 0.0, 'wins': 0} for label, _, _ in holding_buckets_def}
        for t in recent_for_holding:
            duration = (t.close_time - t.open_time).total_seconds() / 60
            profit = safe_float(t.profit)
            for label, lo, hi in holding_buckets_def:
                if lo <= duration < hi:
                    bucket_data[label]['trades'] += 1
                    bucket_data[label]['pnl'] += profit
                    if profit > 0:
                        bucket_data[label]['wins'] += 1
                    break

        holding_time = [
            {
                'label': label,
                'trades': b['trades'],
                'pnl': round(b['pnl'], 2),
                'win_rate': round(b['wins'] / b['trades'] * 100, 1) if b['trades'] > 0 else 0,
            }
            for label, _, _ in holding_buckets_def
            if (b := bucket_data[label])['trades'] > 0
        ]

        # Recent trades (last 30, sanitized)
        recent_raw = trades_qs.order_by('-close_time')[:30]
        recent_trades = [
            {
                'order': t.order,
                'symbol': t.symbol,
                'cmd': t.cmd,
                'volume': t.volume,
                'open_time': t.open_time,
                'close_time': t.close_time,
                'open_price': t.open_price,
                'close_price': t.close_price,
                'profit': t.profit,
                'sl': t.sl,
                'tp': t.tp,
            }
            for t in recent_raw
        ]

        data = {
            'trader_first_name': user.first_name or 'Trader',
            'account_id': account_id,
            'challenge_name': getattr(enrollment.challenge, 'name', None),
            'account_size': starting_balance,
            'currency': enrollment.currency,
            'net_pnl': round(net_pnl, 2),
            'win_rate': round(win_rate, 2),
            'profit_factor': round(profit_factor, 2),
            'expectancy': round(expectancy, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'avg_rr': round(avg_rr, 2),
            'total_trades': total_trades,
            'win_count': win_count,
            'loss_count': loss_count,
            'best_day_pnl': round(best_day_pnl, 2),
            'worst_day_pnl': round(worst_day_pnl, 2),
            'avg_daily_pnl': round(avg_daily_pnl, 2),
            'trading_days': trading_days,
            'winning_days': winning_days,
            'losing_days': losing_days,
            'win_streak': max_win_streak,
            'loss_streak': max_loss_streak,
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'largest_win': round(max(all_profits), 2) if all_profits else 0,
            'largest_loss': round(min(all_profits), 2) if all_profits else 0,
            'calendar_data': calendar_data,
            'equity_curve': equity_curve,
            'recent_trades': recent_trades,
            'symbol_performance': symbol_performance,
            'time_heatmap': time_heatmap,
            'distribution': distribution,
            'holding_time': holding_time,
        }
        return Response(data)
