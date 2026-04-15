"""
Trade Journal Celery Tasks.
Generates AI-powered daily insights, weekly reports, and pattern detection
for the Trade Journal feature using Gemini.
"""
import time
import logging
from datetime import date, timedelta

from celery import shared_task
from django.db.models import Sum, Count, Q
from django.utils import timezone

from wefund.models import ChallengeEnrollment, MT5Trade, JournalInsight

logger = logging.getLogger(__name__)


def _safe_float(val, default=0.0):
    """Safely convert a value to float."""
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_div(a, b, default=0.0):
    """Safe division."""
    return a / b if b else default


def _build_trade_data(trades_qs):
    """Convert a queryset of MT5Trade into serializable dicts for AI context."""
    trade_data = []
    for t in trades_qs:
        trade_data.append({
            'symbol': t.symbol,
            'side': 'buy' if t.cmd == 0 else 'sell',
            'volume': t.volume,
            'profit': _safe_float(t.profit),
            'open_time': str(t.open_time),
            'close_time': str(t.close_time),
            'open_price': _safe_float(t.open_price),
            'close_price': _safe_float(t.close_price),
        })
    return trade_data


@shared_task(bind=True, time_limit=600, soft_time_limit=540)
def generate_daily_journal_insights(self):
    """
    Generate AI daily summaries for all active enrollments with trades today.
    Runs daily at 23:30 UTC via Celery beat.
    """
    today = date.today()
    logger.info("[JOURNAL] Starting daily journal insights for %s", today)

    enrollments = ChallengeEnrollment.objects.filter(
        is_active=True
    ).exclude(mt5_account_id__isnull=True).select_related('client__user', 'challenge')

    generated = 0
    skipped = 0
    errors = 0

    for enrollment in enrollments:
        account_id = enrollment.mt5_account_id
        user = enrollment.client.user

        try:
            # Check if this enrollment has trades today
            today_trades = MT5Trade.objects.filter(
                account_id=account_id,
                is_closed=True,
                close_time__date=today,
            )

            if not today_trades.exists():
                skipped += 1
                continue

            # Check if insight already exists for today
            existing = JournalInsight.objects.filter(
                user=user,
                enrollment=enrollment,
                insight_type='daily_summary',
                status='completed',
                period_start=today,
            ).first()

            if existing and existing.expires_at and existing.expires_at > timezone.now():
                skipped += 1
                continue

            # Build trade context
            trade_data = _build_trade_data(today_trades)
            total_pnl = sum(t['profit'] for t in trade_data)
            win_count = sum(1 for t in trade_data if t['profit'] > 0)
            total_count = len(trade_data)
            win_rate = _safe_div(win_count, total_count) * 100

            # Call AI to generate summary
            start_time = time.time()
            try:
                from wefund.ai_analysis.journal_ai import generate_daily_summary
                content = generate_daily_summary(
                    trade_data=trade_data,
                    total_pnl=total_pnl,
                    win_rate=win_rate,
                    date_str=str(today),
                )
            except Exception as ai_err:
                logger.warning(
                    "[JOURNAL] AI generation failed for user=%s enrollment=%s: %s",
                    user.id, enrollment.pk, ai_err,
                )
                # Use fallback content
                content = {
                    'summary': (
                        f'Today you took {total_count} trades with '
                        f'${total_pnl:.2f} net P&L and {win_rate:.0f}% win rate.'
                    ),
                    'strength': 'Active trading day.' if total_count > 3 else 'Selective approach.',
                    'improvement': 'Review your losing trades for recurring patterns.',
                    'actionable_tip': 'Focus on your highest probability setups tomorrow.',
                    'risk_alert': '' if total_pnl >= 0 else 'Net loss day - review position sizing.',
                }

            generation_time_ms = int((time.time() - start_time) * 1000)

            # Cache result in JournalInsight
            JournalInsight.objects.update_or_create(
                user=user,
                enrollment=enrollment,
                insight_type='daily_summary',
                period_start=today,
                defaults={
                    'status': 'completed',
                    'content': content,
                    'input_data': {
                        'trade_count': total_count,
                        'total_pnl': total_pnl,
                        'win_rate': round(win_rate, 1),
                    },
                    'generation_time_ms': generation_time_ms,
                    'period_end': today,
                    'expires_at': timezone.now() + timedelta(hours=18),
                }
            )

            generated += 1
            logger.info(
                "[JOURNAL] Daily insight generated | user=%s enrollment=%s trades=%d pnl=%.2f time_ms=%d",
                user.id, enrollment.pk, total_count, total_pnl, generation_time_ms,
            )

        except Exception as exc:
            errors += 1
            logger.exception(
                "[JOURNAL] Error generating daily insight | enrollment=%s error=%s",
                enrollment.pk, exc,
            )

    logger.info(
        "[JOURNAL] Daily insights complete | date=%s generated=%d skipped=%d errors=%d",
        today, generated, skipped, errors,
    )

    return {
        'date': str(today),
        'generated': generated,
        'skipped': skipped,
        'errors': errors,
    }


@shared_task(bind=True, time_limit=300, soft_time_limit=240)
def generate_weekly_journal_report(self, user_id, enrollment_id):
    """
    Generate a comprehensive weekly AI report for a specific enrollment.
    Triggered on-demand from views or other tasks.

    Args:
        user_id: The user's primary key.
        enrollment_id: The ChallengeEnrollment primary key.
    """
    from wefund.models import User

    logger.info(
        "[JOURNAL] Generating weekly report | user=%s enrollment=%s",
        user_id, enrollment_id,
    )

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error("[JOURNAL] User not found | user=%s", user_id)
        return {'error': 'User not found'}

    try:
        enrollment = ChallengeEnrollment.objects.get(pk=enrollment_id)
    except ChallengeEnrollment.DoesNotExist:
        logger.error("[JOURNAL] Enrollment not found | enrollment=%s", enrollment_id)
        return {'error': 'Enrollment not found'}

    # Mark as generating (create pending insight)
    today = date.today()
    start = today - timedelta(days=today.weekday())  # Monday
    end = today

    insight, _ = JournalInsight.objects.update_or_create(
        user=user,
        enrollment=enrollment,
        insight_type='weekly_report',
        period_start=start,
        period_end=end,
        defaults={'status': 'generating'},
    )

    try:
        account_id = enrollment.mt5_account_id
        trades = MT5Trade.objects.filter(
            account_id=account_id,
            is_closed=True,
            close_time__date__gte=start,
            close_time__date__lte=end,
        )

        total = trades.count()
        if total == 0:
            content = {
                'executive_summary': 'No trades during this weekly period.',
                'period': {'start': str(start), 'end': str(end)},
            }
            insight.status = 'completed'
            insight.content = content
            insight.expires_at = timezone.now() + timedelta(hours=12)
            insight.save(update_fields=['status', 'content', 'expires_at', 'updated_at'])
            return {'success': True, 'total_trades': 0}

        wins = trades.filter(profit__gt=0).count()
        total_pnl = _safe_float(trades.aggregate(s=Sum('profit'))['s'])
        win_rate = _safe_div(wins, total) * 100

        # Daily breakdown for best/worst day
        daily = trades.values('close_time__date').annotate(
            pnl=Sum('profit'), count=Count('id')
        ).order_by('close_time__date')

        best_day = max(daily, key=lambda d: _safe_float(d['pnl']), default=None)
        worst_day = min(daily, key=lambda d: _safe_float(d['pnl']), default=None)

        start_time = time.time()
        try:
            from wefund.ai_analysis.journal_ai import generate_period_report
            content = generate_period_report(
                period='weekly',
                start=str(start),
                end=str(end),
                total_trades=total,
                win_rate=win_rate,
                net_pnl=total_pnl,
                best_day=str(best_day['close_time__date']) if best_day else '',
                worst_day=str(worst_day['close_time__date']) if worst_day else '',
            )
        except Exception as ai_err:
            logger.warning(
                "[JOURNAL] AI weekly report failed | user=%s: %s", user_id, ai_err,
            )
            content = {
                'executive_summary': (
                    f'This week: {total} trades, ${total_pnl:.2f} net P&L, '
                    f'{win_rate:.0f}% win rate.'
                ),
                'best_day': str(best_day['close_time__date']) if best_day else 'N/A',
                'worst_day': str(worst_day['close_time__date']) if worst_day else 'N/A',
                'top_pattern': 'Insufficient data for pattern analysis.',
                'psychology_insight': 'Continue maintaining your trading journal for better insights.',
                'rule_compliance_grade': 'N/A',
                'goals_for_next_week': ['Review losing trades', 'Maintain journal consistency'],
                'period': {'start': str(start), 'end': str(end)},
            }

        generation_time_ms = int((time.time() - start_time) * 1000)

        insight.status = 'completed'
        insight.content = content
        insight.input_data = {
            'total_trades': total,
            'net_pnl': total_pnl,
            'win_rate': round(win_rate, 1),
        }
        insight.generation_time_ms = generation_time_ms
        insight.expires_at = timezone.now() + timedelta(hours=12)
        insight.save(update_fields=[
            'status', 'content', 'input_data',
            'generation_time_ms', 'expires_at', 'updated_at',
        ])

        logger.info(
            "[JOURNAL] Weekly report generated | user=%s enrollment=%s trades=%d time_ms=%d",
            user_id, enrollment_id, total, generation_time_ms,
        )

        return {
            'success': True,
            'total_trades': total,
            'net_pnl': total_pnl,
            'generation_time_ms': generation_time_ms,
        }

    except Exception as exc:
        logger.exception(
            "[JOURNAL] Weekly report failed | user=%s enrollment=%s error=%s",
            user_id, enrollment_id, exc,
        )
        insight.status = 'failed'
        insight.save(update_fields=['status', 'updated_at'])
        return {'error': str(exc)[:500]}


@shared_task(bind=True, time_limit=300, soft_time_limit=240)
def detect_trading_patterns(self, user_id, enrollment_id):
    """
    Scan for recurring trading patterns using AI and cache the results.
    Triggered on-demand from views or other tasks.

    Args:
        user_id: The user's primary key.
        enrollment_id: The ChallengeEnrollment primary key.
    """
    from wefund.models import User

    logger.info(
        "[JOURNAL] Detecting trading patterns | user=%s enrollment=%s",
        user_id, enrollment_id,
    )

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.error("[JOURNAL] User not found | user=%s", user_id)
        return {'error': 'User not found'}

    try:
        enrollment = ChallengeEnrollment.objects.get(pk=enrollment_id)
    except ChallengeEnrollment.DoesNotExist:
        logger.error("[JOURNAL] Enrollment not found | enrollment=%s", enrollment_id)
        return {'error': 'Enrollment not found'}

    # Mark as generating
    insight, _ = JournalInsight.objects.update_or_create(
        user=user,
        enrollment=enrollment,
        insight_type='pattern_detection',
        defaults={'status': 'generating'},
    )

    try:
        account_id = enrollment.mt5_account_id
        trades = MT5Trade.objects.filter(
            account_id=account_id,
            is_closed=True,
        ).order_by('-close_time')[:200]

        if trades.count() < 20:
            content = {
                'profitable_patterns': [],
                'losing_patterns': [],
                'behavioral_patterns': [],
                'suggestions': ['Complete more trades to enable pattern detection (minimum 20).'],
            }
            insight.status = 'completed'
            insight.content = content
            insight.expires_at = timezone.now() + timedelta(hours=24)
            insight.save(update_fields=['status', 'content', 'expires_at', 'updated_at'])
            return {'success': True, 'patterns_found': False, 'reason': 'insufficient_trades'}

        trade_data = _build_trade_data(trades)

        start_time = time.time()
        try:
            from wefund.ai_analysis.journal_ai import detect_patterns
            content = detect_patterns(trades=trade_data)
        except Exception as ai_err:
            logger.warning(
                "[JOURNAL] AI pattern detection failed | user=%s: %s", user_id, ai_err,
            )
            content = {
                'profitable_patterns': [],
                'losing_patterns': [],
                'behavioral_patterns': [],
                'suggestions': ['AI pattern detection is temporarily unavailable.'],
            }

        generation_time_ms = int((time.time() - start_time) * 1000)

        insight.status = 'completed'
        insight.content = content
        insight.input_data = {
            'trade_count': len(trade_data),
        }
        insight.generation_time_ms = generation_time_ms
        insight.expires_at = timezone.now() + timedelta(hours=24)
        insight.save(update_fields=[
            'status', 'content', 'input_data',
            'generation_time_ms', 'expires_at', 'updated_at',
        ])

        pattern_count = (
            len(content.get('profitable_patterns', []))
            + len(content.get('losing_patterns', []))
            + len(content.get('behavioral_patterns', []))
        )

        logger.info(
            "[JOURNAL] Pattern detection complete | user=%s enrollment=%s patterns=%d time_ms=%d",
            user_id, enrollment_id, pattern_count, generation_time_ms,
        )

        return {
            'success': True,
            'patterns_found': pattern_count > 0,
            'pattern_count': pattern_count,
            'generation_time_ms': generation_time_ms,
        }

    except Exception as exc:
        logger.exception(
            "[JOURNAL] Pattern detection failed | user=%s enrollment=%s error=%s",
            user_id, enrollment_id, exc,
        )
        insight.status = 'failed'
        insight.save(update_fields=['status', 'updated_at'])
        return {'error': str(exc)[:500]}
