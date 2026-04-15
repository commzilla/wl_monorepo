import django_filters
from wefund.models import AffiliateWalletTransaction, Order

class AffiliateWalletTransactionFilter(django_filters.FilterSet):
    created_at__gte = django_filters.DateFilter(field_name="created_at", lookup_expr='gte')
    created_at__lte = django_filters.DateFilter(field_name="created_at", lookup_expr='lte')
    transaction_type = django_filters.CharFilter(lookup_expr='iexact')
    status = django_filters.CharFilter(lookup_expr='iexact')

    class Meta:
        model = AffiliateWalletTransaction
        fields = ['transaction_type', 'status', 'created_at__gte', 'created_at__lte']

class OrderExportFilter(django_filters.FilterSet):
    # Dates (model field) — use date lookup so a plain date string includes the whole day
    date_created_after = django_filters.DateFilter(field_name="date_created", lookup_expr="date__gte")
    date_created_before = django_filters.DateFilter(field_name="date_created", lookup_expr="date__lte")

    # Basic fields
    status = django_filters.CharFilter(field_name="status")
    payment_status = django_filters.CharFilter(field_name="payment_status")
    payment_method = django_filters.CharFilter(field_name="payment_method", lookup_expr="icontains")

    customer_email = django_filters.CharFilter(field_name="customer_email", lookup_expr="icontains")
    customer_name = django_filters.CharFilter(field_name="customer_name", lookup_expr="icontains")

    woo_order_id = django_filters.NumberFilter(field_name="woo_order_id")
    woo_order_number = django_filters.CharFilter(field_name="woo_order_number", lookup_expr="icontains")
    transaction_id = django_filters.CharFilter(field_name="transaction_id", lookup_expr="icontains")

    referral_code = django_filters.CharFilter(field_name="referral_code", lookup_expr="iexact")
    affiliate_id = django_filters.NumberFilter(field_name="affiliate_id")

    challenge_name = django_filters.CharFilter(field_name="challenge_name", lookup_expr="icontains")
    challenge_broker_type = django_filters.CharFilter(field_name="challenge_broker_type", lookup_expr="iexact")
    challenge_account_size = django_filters.CharFilter(field_name="challenge_account_size", lookup_expr="icontains")

    currency = django_filters.CharFilter(field_name="currency", lookup_expr="iexact")

    class Meta:
        model = Order
        fields = []