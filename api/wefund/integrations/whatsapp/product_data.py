import logging
from datetime import timezone

from django.core.cache import cache
from django.utils import timezone as dj_tz

logger = logging.getLogger(__name__)

CACHE_KEY = "whatsapp_products_context"
CACHE_TTL = 300  # 5 minutes
FAQ_CACHE_KEY = "whatsapp_faq_all"
FAQ_CACHE_TTL = 300  # 5 minutes


def get_faq_context(user_message=None):
    """
    Build FAQ knowledge context for the WhatsApp AI prompt.
    Uses the same FAQKnowledgeBuilder as the support and admin AI.
    If user_message is provided, returns relevance-scored results.
    Otherwise returns all FAQ content (cached).
    """
    try:
        from api.support_faq_knowledge import get_faq_knowledge_builder
        builder = get_faq_knowledge_builder()

        if user_message:
            # Per-message relevance scoring (not cached — depends on query)
            return builder.build_context(
                user_query=user_message,
                max_articles=15,
                max_content_length=500,
                tiered_retrieval=True,
            )
        else:
            # Full FAQ dump (cached)
            cached = cache.get(FAQ_CACHE_KEY)
            if cached:
                return cached
            context = builder.build_context(
                user_query=None,
                max_articles=30,
                max_content_length=500,
                tiered_retrieval=False,
            )
            if context and context != "No FAQ articles available.":
                cache.set(FAQ_CACHE_KEY, context, FAQ_CACHE_TTL)
            return context

    except Exception as e:
        logger.warning("Failed to build FAQ context: %s", e)
        return ""


def get_products_context():
    """
    Query live product/pricing data and format as plain text for the AI system prompt.
    Pulls from WebsiteProduct + variants (primary catalog), Challenge + phases (rules),
    DiscountCode, Offer/Coupon, and WebsiteProductAddon.
    Cached for 5 minutes to avoid DB queries on every message.
    """
    cached = cache.get(CACHE_KEY)
    if cached:
        return cached

    try:
        from wefund.models import (
            Challenge,
            Coupon,
            DiscountCode,
            Offer,
            WebsiteProduct,
            WebsiteProductAddon,
        )

        lines = ["## Current Products & Pricing\n"]

        # ── Primary product catalog: WebsiteProduct + variants ──
        products = (
            WebsiteProduct.objects
            .filter(is_active=True)
            .prefetch_related("variants")
            .order_by("sort_order")
        )
        if products.exists():
            for product in products:
                lines.append(f"### {product.name}")
                if product.description:
                    lines.append(product.description)
                lines.append("")

                variants = (
                    product.variants
                    .filter(is_active=True)
                    .order_by("sort_order", "account_size")
                )
                if variants.exists():
                    lines.append("Pricing:")
                    for v in variants:
                        price_str = f"${v.price:,.0f}"
                        if v.original_price and v.original_price > v.price:
                            discount_pct = round(
                                (1 - v.price / v.original_price) * 100
                            )
                            price_str = (
                                f"${v.price:,.0f} (was ${v.original_price:,.0f}"
                                f" — {discount_pct}% off)"
                            )
                        lines.append(
                            f"  ${v.account_size:,} account → {price_str}"
                        )
                    lines.append("")

        # ── Challenge rules (phase details) ──
        challenges = (
            Challenge.objects
            .filter(is_active=True)
            .prefetch_related("phases")
        )
        if challenges.exists():
            lines.append("### Trading Rules by Challenge Type\n")
            for c in challenges:
                lines.append(f"**{c.name} ({c.get_step_type_display()})**")
                for phase in c.phases.all().order_by("phase_type"):
                    lines.append(f"  {phase.get_phase_type_display()}:")
                    lines.append(f"    Trading Period: {phase.trading_period}")
                    lines.append(f"    Min Trading Days: {phase.min_trading_days}")
                    lines.append(f"    Max Daily Loss: {phase.max_daily_loss}%")
                    lines.append(f"    Max Loss: {phase.max_loss}%")
                    if phase.profit_target:
                        lines.append(f"    Profit Target: {phase.profit_target}%")
                lines.append("")

        # ── Active discount codes ──
        now = dj_tz.now()
        discounts = DiscountCode.objects.filter(
            is_active=True,
        ).filter(
            # Valid now or no date restrictions
        ).exclude(
            valid_until__lt=now,
        )
        active_discounts = []
        for d in discounts:
            if d.valid_from and d.valid_from > now:
                continue  # not started yet
            if d.max_uses is not None and d.current_uses >= d.max_uses:
                continue  # exhausted
            active_discounts.append(d)

        if active_discounts:
            lines.append("### Active Discount Codes\n")
            for d in active_discounts:
                if d.discount_type == "percentage":
                    val_str = f"{d.discount_value:.0f}% off"
                else:
                    val_str = f"${d.discount_value:,.2f} off"
                code_line = f"  Code: {d.code} → {val_str}"
                if d.min_order_amount and d.min_order_amount > 0:
                    code_line += f" (min order ${d.min_order_amount:,.0f})"
                if d.valid_until:
                    code_line += f" — expires {d.valid_until.strftime('%b %d, %Y')}"
                lines.append(code_line)
                # Show which products the code applies to
                applicable = d.applicable_products.filter(is_active=True)
                if applicable.exists():
                    names = ", ".join(p.name for p in applicable)
                    lines.append(f"    Applies to: {names}")
            lines.append("")

        # ── Active offers & coupons ──
        today = now.date()
        offers = Offer.objects.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
        ).prefetch_related("coupons")
        if offers.exists():
            lines.append("### Current Offers & Promotions\n")
            for offer in offers:
                lines.append(f"**{offer.title}**")
                if offer.description:
                    lines.append(f"  {offer.description}")
                lines.append(
                    f"  Valid: {offer.start_date.strftime('%b %d')} — "
                    f"{offer.end_date.strftime('%b %d, %Y')}"
                )
                coupons = offer.coupons.all()
                if coupons.exists():
                    for coupon in coupons:
                        lines.append(
                            f"  Use code {coupon.code} for "
                            f"{coupon.discount_percent}% off"
                        )
                lines.append("")

        # ── Add-ons ──
        addons = WebsiteProductAddon.objects.filter(is_active=True).order_by("sort_order")
        if addons.exists():
            lines.append("### Available Add-ons\n")
            for addon in addons:
                if addon.price_type == "free":
                    price_str = "FREE"
                else:
                    price_str = f"${addon.price_value:,.2f}"
                lines.append(f"  {addon.name}: {price_str}")
                if addon.description:
                    lines.append(f"    {addon.description}")
            lines.append("")

        if len(lines) <= 1:
            lines.append(
                "No active products currently available. "
                "Please check back later or ask to speak with an agent."
            )

        context = "\n".join(lines)
        cache.set(CACHE_KEY, context, CACHE_TTL)
        return context

    except Exception as e:
        logger.exception("Failed to fetch product data: %s", e)
        return (
            "## Current Products & Pricing\n\n"
            "Product data temporarily unavailable. "
            "Please ask to speak with an agent for the latest pricing."
        )
