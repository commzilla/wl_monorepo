"""
Serializers for website API endpoints.
"""

from rest_framework import serializers
from wefund.models import (
    WebsiteProduct,
    WebsiteProductVariant,
    WebsiteProductAddon,
    DiscountCode,
    WebsiteOrder,
)


# ==========================================
# Public Serializers
# ==========================================

class WebsiteProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProductVariant
        fields = [
            'id', 'account_size', 'price', 'entry_fee', 'original_price',
            'sku', 'broker_type', 'currency', 'is_active', 'sort_order',
        ]


class WebsiteProductVariantAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for variant CRUD - includes product field."""
    class Meta:
        model = WebsiteProductVariant
        fields = [
            'id', 'product', 'account_size', 'price', 'entry_fee', 'original_price',
            'sku', 'broker_type', 'currency', 'is_active', 'sort_order',
        ]


class WebsiteProductAddonSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProductAddon
        fields = [
            'id', 'name', 'description', 'price_type', 'price_value',
            'is_active', 'sort_order',
        ]


class WebsiteProductAddonReadSerializer(serializers.ModelSerializer):
    """Admin read serializer for addons nested inside product responses."""
    class Meta:
        model = WebsiteProductAddon
        fields = [
            'id', 'name', 'description', 'price_type', 'price_value',
            'is_active', 'sort_order', 'effect_type', 'effect_value',
            'effect_from_payout',
        ]


class WebsiteProductAddonAdminSerializer(serializers.ModelSerializer):
    """Admin serializer for addon CRUD - includes products M2M field."""
    class Meta:
        model = WebsiteProductAddon
        fields = [
            'id', 'name', 'description', 'price_type', 'price_value',
            'is_active', 'sort_order', 'products', 'effect_type',
            'effect_value', 'effect_from_payout',
        ]


class WebsiteProductCatalogSerializer(serializers.ModelSerializer):
    """Public product catalog with nested variants and addons."""
    variants = serializers.SerializerMethodField()
    addons = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteProduct
        fields = [
            'id', 'name', 'slug', 'description', 'challenge_type',
            'is_pay_after_pass', 'pap_addon_flat_fee', 'is_active', 'sort_order', 'variants', 'addons',
        ]

    def get_variants(self, obj):
        active_variants = obj.variants.filter(is_active=True)
        return WebsiteProductVariantSerializer(active_variants, many=True).data

    def get_addons(self, obj):
        active_addons = obj.addons.filter(is_active=True)
        return WebsiteProductAddonSerializer(active_addons, many=True).data


class DiscountCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_type', 'discount_value',
            'max_uses', 'current_uses', 'usage_limit_per_user',
            'min_order_amount', 'valid_from', 'valid_until', 'is_active',
            'bogo_challenge_types',
        ]


# ==========================================
# Order Creation Serializer
# ==========================================

class WebsiteOrderCreateSerializer(serializers.Serializer):
    """Validates website checkout form data."""
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    country = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    address = serializers.DictField(required=False, default=dict)
    variant_id = serializers.IntegerField()
    addon_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    discount_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(
        choices=['card', 'crypto', 'paypal'],
        required=False,
        default='card',
    )
    referral_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    # PAP completion: optional enrollment ID for post-pass payment
    enrollment_id = serializers.UUIDField(required=False, default=None)


# ==========================================
# Order Status Serializer
# ==========================================

class WebsiteOrderStatusSerializer(serializers.ModelSerializer):
    """Returns order status details for the thank-you page."""
    product_name = serializers.SerializerMethodField()
    account_size = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()
    addons_list = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteOrder
        fields = [
            'id', 'order_number', 'status', 'payment_method',
            'total', 'subtotal', 'addon_total', 'currency', 'discount_amount',
            'product_name', 'account_size', 'addons_list',
            'customer_email', 'customer_first_name', 'customer_last_name',
            'created_at', 'paid_at',
        ]

    def get_product_name(self, obj):
        if obj.variant and obj.variant.product:
            return obj.variant.product.name
        return ''

    def get_account_size(self, obj):
        if obj.variant:
            return obj.variant.account_size
        return None

    def get_order_number(self, obj):
        if obj.order_number:
            return str(obj.order_number)
        return str(obj.id)[:8].upper()

    def get_addons_list(self, obj):
        return [
            {'id': a.id, 'name': a.name, 'price': str(a.price_value), 'price_type': a.price_type}
            for a in obj.addons.all()
        ]


# ==========================================
# Admin Serializers (for CRM)
# ==========================================

class WebsiteProductAdminSerializer(serializers.ModelSerializer):
    """Full admin serializer for product CRUD."""
    variants = WebsiteProductVariantSerializer(many=True, read_only=True)
    addons = WebsiteProductAddonReadSerializer(many=True, read_only=True)

    class Meta:
        model = WebsiteProduct
        fields = '__all__'


class DiscountCodeAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = '__all__'


class WebsiteOrderAdminSerializer(serializers.ModelSerializer):
    """Admin view of website orders with computed fields."""
    product_name = serializers.SerializerMethodField()
    account_size = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()
    discount_code_text = serializers.SerializerMethodField()
    addons_list = serializers.SerializerMethodField()
    linked_order_id = serializers.SerializerMethodField()
    challenge_type = serializers.SerializerMethodField()
    broker_type = serializers.SerializerMethodField()

    class Meta:
        model = WebsiteOrder
        fields = '__all__'

    def get_product_name(self, obj):
        if obj.variant and obj.variant.product:
            return obj.variant.product.name
        return ''

    def get_account_size(self, obj):
        if obj.variant:
            return obj.variant.account_size
        return None

    def get_order_number(self, obj):
        return obj.order_number

    def get_discount_code_text(self, obj):
        if obj.discount_code:
            return obj.discount_code.code
        return ''

    def get_addons_list(self, obj):
        return [
            {'id': a.id, 'name': a.name, 'price': str(a.price_value), 'price_type': a.price_type}
            for a in obj.addons.all()
        ]

    def get_linked_order_id(self, obj):
        if obj.order_id:
            return obj.order_id
        return None

    def get_challenge_type(self, obj):
        if obj.variant and obj.variant.product:
            return obj.variant.product.challenge_type
        return ''

    def get_broker_type(self, obj):
        if obj.variant:
            return obj.variant.broker_type
        return ''


class WebsiteOrderStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating website order status."""
    status = serializers.ChoiceField(choices=WebsiteOrder.STATUS_CHOICES)

    class Meta:
        model = WebsiteOrder
        fields = ['status']
