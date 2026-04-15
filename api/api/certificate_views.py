from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from wefund.models import Certificate, MT5Trade, MT5DailySnapshot


def _safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except (TypeError, ValueError):
        return default


def _safe_div(a, b, default=0.0):
    return a / b if b else default


class PublicCertificateVerifyView(APIView):
    """Public endpoint — anyone with the certificate ID can verify it."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, certificate_id):
        qs = Certificate.objects.select_related(
            'user', 'payout', 'enrollment', 'enrollment__challenge'
        )
        try:
            cert = qs.get(pk=certificate_id)
        except (Certificate.DoesNotExist, ValueError):
            # Fallback: try matching by payout ID
            cert = qs.filter(payout_id=certificate_id).first()

        if not cert:
            return Response({"valid": False, "detail": "Certificate not found."}, status=404)

        # Certificate info
        data = {
            "valid": True,
            "certificate": {
                "id": str(cert.id),
                "title": cert.title,
                "certificate_type": cert.certificate_type,
                "issued_date": str(cert.issued_date) if cert.issued_date else None,
                "image_url": cert.image_url,
                "pdf_url": cert.pdf_url,
            },
        }

        # Trader info (sanitized — no email/username/PII)
        user = cert.user
        if user:
            full_name = user.get_full_name()
            initials = ""
            if user.first_name:
                initials += user.first_name[0].upper()
            if user.last_name:
                initials += user.last_name[0].upper()
            data["trader"] = {
                "display_name": full_name or "Trader",
                "initials": initials or "T",
            }

        # Payout info
        payout = cert.payout
        if payout:
            data["payout"] = {
                "released_fund": _safe_float(payout.released_fund),
                "net_profit": _safe_float(payout.net_profit),
                "profit_share_percent": _safe_float(payout.profit_share),
                "status": payout.status,
                "paid_at": payout.paid_at.isoformat() if payout.paid_at else None,
            }

        # Enrollment info
        enrollment = cert.enrollment
        if enrollment:
            data["enrollment"] = {
                "account_size": _safe_float(enrollment.account_size),
                "currency": enrollment.currency,
                "challenge_name": getattr(enrollment.challenge, 'name', None),
                "status": enrollment.status,
            }

            # Trading summary from MT5Trade records
            account_id = enrollment.mt5_account_id
            if account_id:
                trades_qs = MT5Trade.objects.filter(account_id=account_id, is_closed=True)
                total_trades = trades_qs.count()

                wins = trades_qs.filter(profit__gt=0)
                losses = trades_qs.filter(profit__lt=0)
                win_count = wins.count()
                loss_count = losses.count()
                total_winners = _safe_float(wins.aggregate(s=Sum('profit'))['s'])
                total_losers = _safe_float(losses.aggregate(s=Sum('profit'))['s'])

                win_rate = _safe_div(win_count, total_trades) * 100
                avg_win = _safe_div(total_winners, win_count)
                avg_loss = _safe_div(total_losers, loss_count)
                profit_factor = _safe_div(total_winners, abs(total_losers))
                net_pnl = total_winners + total_losers

                data["trading_summary"] = {
                    "total_trades": total_trades,
                    "win_rate": round(win_rate, 2),
                    "profit_factor": round(profit_factor, 2),
                    "net_pnl": round(net_pnl, 2),
                    "avg_win": round(avg_win, 2),
                    "avg_loss": round(avg_loss, 2),
                    "total_winners": win_count,
                    "total_losers": loss_count,
                }

                # Daily P&L for bar chart
                daily_pnl = trades_qs.values('close_time__date').annotate(
                    day_pnl=Sum('profit'),
                ).order_by('close_time__date')

                data["daily_pnl"] = [
                    {
                        "date": str(d['close_time__date']),
                        "pnl": _safe_float(d['day_pnl']),
                    }
                    for d in daily_pnl
                ]

                # Equity curve from MT5DailySnapshot
                snapshots = MT5DailySnapshot.objects.filter(
                    enrollment=enrollment
                ).order_by('date').values('date', 'ending_balance', 'ending_equity')

                data["equity_curve"] = [
                    {
                        "date": str(s['date']),
                        "balance": _safe_float(s['ending_balance']),
                        "equity": _safe_float(s['ending_equity']),
                    }
                    for s in snapshots
                ]

        return Response(data)
