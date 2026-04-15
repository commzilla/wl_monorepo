from rest_framework import serializers
from wefund.models import (
    TagCategory, TradeTag, TradeJournalEntry, TradingSession,
    JournalInsight, JournalConfig, MentorAccess, MT5Trade
)


class TagCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TagCategory
        fields = ['id', 'name', 'category_type', 'color', 'icon', 'is_system']
        read_only_fields = ['id', 'is_system']


class TradeTagSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_type = serializers.CharField(source='category.category_type', read_only=True)

    class Meta:
        model = TradeTag
        fields = [
            'id', 'category', 'category_name', 'category_type',
            'name', 'color', 'usage_count', 'created_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at']


class TradeTagCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeTag
        fields = ['category', 'name', 'color']


class TradeJournalEntrySerializer(serializers.ModelSerializer):
    tags = TradeTagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    # Trade info (read-only from MT5Trade)
    trade_order = serializers.IntegerField(source='trade.order', read_only=True)
    trade_symbol = serializers.CharField(source='trade.symbol', read_only=True)
    trade_cmd = serializers.IntegerField(source='trade.cmd', read_only=True)
    trade_volume = serializers.FloatField(source='trade.volume', read_only=True)
    trade_open_time = serializers.DateTimeField(source='trade.open_time', read_only=True)
    trade_close_time = serializers.DateTimeField(source='trade.close_time', read_only=True)
    trade_open_price = serializers.DecimalField(
        source='trade.open_price', max_digits=15, decimal_places=6, read_only=True
    )
    trade_close_price = serializers.DecimalField(
        source='trade.close_price', max_digits=15, decimal_places=6, read_only=True
    )
    trade_profit = serializers.DecimalField(
        source='trade.profit', max_digits=15, decimal_places=2, read_only=True
    )
    trade_sl = serializers.DecimalField(
        source='trade.sl', max_digits=15, decimal_places=6, read_only=True
    )
    trade_tp = serializers.DecimalField(
        source='trade.tp', max_digits=15, decimal_places=6, read_only=True
    )

    class Meta:
        model = TradeJournalEntry
        fields = [
            'id', 'trade', 'enrollment',
            # Trade data
            'trade_order', 'trade_symbol', 'trade_cmd', 'trade_volume',
            'trade_open_time', 'trade_close_time', 'trade_open_price',
            'trade_close_price', 'trade_profit', 'trade_sl', 'trade_tp',
            # Journal data
            'notes', 'setup_description', 'tags', 'tag_ids', 'rating',
            'planned_entry', 'planned_sl', 'planned_tp', 'followed_plan',
            'emotional_state', 'screenshot_entry', 'screenshot_exit',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'trade', 'enrollment', 'created_at', 'updated_at']

    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        entry = TradeJournalEntry.objects.create(**validated_data)
        if tag_ids:
            entry.tags.set(TradeTag.objects.filter(id__in=tag_ids, user=entry.user))
        return entry

    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tag_ids is not None:
            instance.tags.set(TradeTag.objects.filter(id__in=tag_ids, user=instance.user))
        return instance


class TradeListItemSerializer(serializers.Serializer):
    """Lightweight trade serializer for the trade log list."""
    order = serializers.IntegerField()
    symbol = serializers.CharField()
    cmd = serializers.IntegerField()
    volume = serializers.FloatField()
    open_time = serializers.DateTimeField()
    close_time = serializers.DateTimeField()
    open_price = serializers.DecimalField(max_digits=15, decimal_places=6)
    close_price = serializers.DecimalField(max_digits=15, decimal_places=6)
    profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    sl = serializers.DecimalField(max_digits=15, decimal_places=6)
    tp = serializers.DecimalField(max_digits=15, decimal_places=6)
    # Journal status
    has_journal = serializers.BooleanField(default=False)
    journal_id = serializers.UUIDField(allow_null=True, default=None)
    rating = serializers.IntegerField(allow_null=True, default=None)
    tags = serializers.ListField(child=serializers.DictField(), default=list)
    emotional_state = serializers.CharField(allow_blank=True, default='')


class TradingSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradingSession
        fields = [
            'id', 'enrollment', 'date',
            'pre_session_notes', 'post_session_notes', 'key_lessons',
            'energy_level', 'discipline_score',
            'emotional_state_start', 'emotional_state_end',
            'market_conditions', 'followed_rules', 'rule_violations',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class JournalInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalInsight
        fields = [
            'id', 'insight_type', 'status', 'content', 'question',
            'period_start', 'period_end', 'model_used', 'tokens_used',
            'generation_time_ms', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'content', 'model_used',
                            'tokens_used', 'generation_time_ms', 'created_at']


class JournalConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalConfig
        fields = [
            'auto_tag_enabled', 'ai_insights_enabled', 'daily_reminder_enabled',
            'default_chart_period', 'calendar_view', 'breach_alert_threshold'
        ]


class MentorAccessSerializer(serializers.ModelSerializer):
    mentor_username = serializers.CharField(source='mentor.username', read_only=True)
    trader_username = serializers.CharField(source='trader.username', read_only=True)

    class Meta:
        model = MentorAccess
        fields = [
            'id', 'trader', 'mentor', 'mentor_username', 'trader_username',
            'access_level', 'is_active', 'granted_at', 'expires_at'
        ]
        read_only_fields = ['id', 'granted_at']


class JournalDashboardSerializer(serializers.Serializer):
    """Aggregated dashboard data."""
    # Core metrics
    net_pnl = serializers.FloatField()
    win_rate = serializers.FloatField()
    profit_factor = serializers.FloatField()
    expectancy = serializers.FloatField()
    sharpe_ratio = serializers.FloatField()
    avg_rr = serializers.FloatField()
    total_trades = serializers.IntegerField()
    trades_journaled = serializers.IntegerField()

    # Compliance
    daily_loss_used_pct = serializers.FloatField()
    total_loss_used_pct = serializers.FloatField()
    profit_target_progress_pct = serializers.FloatField()

    # Streaks
    journal_streak = serializers.IntegerField()
    win_streak = serializers.IntegerField()
    loss_streak = serializers.IntegerField()

    # Calendar heatmap
    calendar_data = serializers.ListField(child=serializers.DictField())

    # Recent trades
    recent_trades = TradeListItemSerializer(many=True)

    # Tag usage
    top_tags = serializers.ListField(child=serializers.DictField())

    # Equity curve
    equity_curve = serializers.ListField(child=serializers.DictField())

    # AI quick insight
    quick_insight = serializers.DictField(allow_null=True)


class BulkUpdateSerializer(serializers.Serializer):
    """For bulk tag/rate operations."""
    trade_orders = serializers.ListField(child=serializers.IntegerField())
    tag_ids = serializers.ListField(child=serializers.UUIDField(), required=False)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    emotional_state = serializers.CharField(required=False, allow_blank=True)


class AIChatSerializer(serializers.Serializer):
    """For AI chat Q&A."""
    question = serializers.CharField(max_length=1000)
    enrollment_id = serializers.UUIDField(required=False)
