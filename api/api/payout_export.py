import csv
import datetime
from django.http import StreamingHttpResponse
from django.utils.timezone import make_aware
from rest_framework.views import APIView
from api.permissions import HasPermission
from django.db.models import Q

from wefund.models import TraderPayout, Order


class Echo:
    """A small helper class used to stream CSV rows"""

    def write(self, value):
        return value


class ExportPayoutCSVView(APIView):
    """
    Admin Export View — return filtered payout records as downloadable CSV.

    Filters supported:
      - status=<status>
      - from=<YYYY-MM-DD>
      - to=<YYYY-MM-DD>
      - quick=<today|yesterday|last_7_days|last_30_days>
      - challenge=<name>
      - mt5_account=<account_id>
      - client=<search term>
    """

    permission_classes = [HasPermission]
    required_permissions = ['payouts.export']

    def get(self, request, *args, **kwargs):

        queryset = TraderPayout.objects.select_related(
            "trader",
            "challenge_enrollment",
            "challenge_enrollment__challenge",
            "challenge_enrollment__order"
        ).all()

        # -------------------------
        # 💠 Status Filter
        # -------------------------
        status = request.GET.get("status")
        if status and status != "all":
            queryset = queryset.filter(status=status)

        # -------------------------
        # 💠 Quick Date Filters
        # -------------------------
        quick = request.GET.get("quick")
        today = datetime.date.today()

        if quick:
            if quick == "today":
                queryset = queryset.filter(requested_at__date=today)

            if quick == "yesterday":
                queryset = queryset.filter(requested_at__date=today - datetime.timedelta(days=1))

            if quick == "last_7_days":
                queryset = queryset.filter(
                    requested_at__date__gte=today - datetime.timedelta(days=7)
                )

            if quick == "last_30_days":
                queryset = queryset.filter(
                    requested_at__date__gte=today - datetime.timedelta(days=30)
                )

        # -------------------------
        # 💠 From–To Date Range Filter
        # -------------------------
        date_from = request.GET.get("from")
        date_to = request.GET.get("to")

        if date_from:
            date_from = make_aware(datetime.datetime.strptime(date_from, "%Y-%m-%d"))
            queryset = queryset.filter(requested_at__gte=date_from)

        if date_to:
            date_to = make_aware(datetime.datetime.strptime(date_to, "%Y-%m-%d"))
            queryset = queryset.filter(requested_at__lte=date_to)

        # -------------------------
        # 💠 Challenge Name Filter
        # -------------------------
        challenge = request.GET.get("challenge")
        if challenge:
            queryset = queryset.filter(
                challenge_enrollment__challenge__name__icontains=challenge
            )

        # -------------------------
        # 💠 MT5 Account Filter
        # -------------------------
        mt5 = request.GET.get("mt5_account")
        if mt5:
            queryset = queryset.filter(
                challenge_enrollment__mt5_account_id__icontains=mt5
            )

        # -------------------------
        # 💠 Client Name Search
        # -------------------------
        client = request.GET.get("client")
        if client:
            queryset = queryset.filter(
                Q(trader__username__icontains=client)
                | Q(trader__first_name__icontains=client)
                | Q(trader__last_name__icontains=client)
                | Q(challenge_enrollment__order__customer_name__icontains=client)
            )

        # =======================================================
        # 🟦 Prepare CSV Headers
        # =======================================================
        header = [
            "Payout ID",
            "Client Name",
            "Email",
            "Challenge Name",
            "MT5 Account ID",
            "Profit",
            "Profit Share %",
            "Net Profit",
            "Requested Amount",
            "Released Fund",
            "Status",
            "Payout Method",
            "Requested At",
            "Paid At",
        ]

        # Streaming CSV
        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)

        # =======================================================
        # 🟦 StreamingHttpResponse
        # =======================================================
        response = StreamingHttpResponse(
            (writer.writerow(row) for row in self.iter_rows(queryset, writer, header)),
            content_type="text/csv"
        )

        response["Content-Disposition"] = (
            "attachment; filename=payouts_export.csv"
        )

        return response

    # ----------------------------------------------------------
    # 🟦 CSV ROW GENERATOR
    # ----------------------------------------------------------
    def iter_rows(self, queryset, writer, header):
        yield header

        for payout in queryset:
            enrollment = payout.challenge_enrollment
            order = None
            client_name = ""

            if enrollment:
                order = enrollment.order

            # -------------------------
            # Resolve Client Name
            # -------------------------
            if order and order.customer_name:
                client_name = order.customer_name
            else:
                # fallback to user full name
                client_name = payout.trader.get_full_name() or payout.trader.username

            # -------------------------
            # Build Each CSV Row
            # -------------------------
            row = [
                str(payout.id),
                client_name,
                payout.trader.email,
                enrollment.challenge.name if enrollment else "",
                enrollment.mt5_account_id if enrollment else "",
                float(payout.profit or 0),
                float(payout.profit_share or 0),
                float(payout.net_profit or 0),
                float(payout.amount or 0),
                float(payout.released_fund or 0),
                payout.status,
                payout.method,
                payout.requested_at.strftime("%Y-%m-%d %H:%M") if payout.requested_at else "",
                payout.paid_at.strftime("%Y-%m-%d %H:%M") if payout.paid_at else "",
            ]

            yield row
