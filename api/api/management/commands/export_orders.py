import json
from django.core.management.base import BaseCommand
from django.utils import timezone
from wefund.models import Order


class Command(BaseCommand):
    help = "Export all orders into a human-readable text file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default=f"orders_export_{timezone.now().strftime('%Y%m%d_%H%M%S')}.txt",
            help="Output file path",
        )

    def handle(self, *args, **options):
        output_file = options["output"]

        with open(output_file, "w", encoding="utf-8") as f:
            for order in Order.objects.all().order_by("-date_created"):
                f.write("=" * 80 + "\n")
                f.write(f"📦 Order ID: {order.id} | Woo ID: {order.woo_order_id or '-'}\n")
                f.write(f"Status: {order.status} | Payment: {order.payment_status}\n")
                f.write(f"Created: {order.date_created.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Customer: {order.customer_name} <{order.customer_email}>\n")
                f.write(f"IP: {order.customer_ip or '-'}\n")
                f.write("\n")

                # Billing
                f.write("🏠 Billing Address:\n")
                for k, v in (order.billing_address or {}).items():
                    f.write(f"   {k}: {v}\n")
                f.write("\n")

                # Product / pricing
                f.write(f"🛒 Product: {order.product_name}\n")
                f.write(f"Cost: ${order.cost} x {order.quantity} = ${order.total_usd}\n")
                f.write(
                    f"Subtotal: ${order.items_subtotal_usd} | Discount: ${order.coupons_discount_usd} "
                    f"| Order Total: ${order.order_total_usd} | Paid: ${order.paid_usd}\n"
                )
                if order.coupon_codes:
                    f.write(f"Coupons: {', '.join(order.coupon_codes)}\n")
                f.write(f"Payment Method: {order.payment_method}\n")
                f.write("\n")

                # Challenge info
                f.write("🎯 Challenge Info:\n")
                f.write(f"   Name: {order.challenge_name}\n")
                f.write(f"   Broker: {order.challenge_broker_type}\n")
                f.write(f"   Account Size: {order.challenge_account_size}\n")
                f.write("\n")

                # MT5 Info
                f.write("💻 MT5 Info:\n")
                f.write(f"   Account ID: {order.mt5_account_id or '-'}\n")
                f.write(f"   Password: {order.mt5_password or '-'}\n")
                f.write(f"   Investor Password: {order.mt5_investor_password or '-'}\n")
                f.write("\n")

                # MT5 JSON payloads
                if order.mt5_payload_sent:
                    f.write("📤 MT5 Payload Sent:\n")
                    f.write(json.dumps(order.mt5_payload_sent, indent=4))
                    f.write("\n\n")

                if order.mt5_response:
                    f.write("📥 MT5 Response:\n")
                    f.write(json.dumps(order.mt5_response, indent=4))
                    f.write("\n\n")

                # Raw WooCommerce data
                if order.raw_data:
                    f.write("🗂️ Raw WooCommerce Data:\n")
                    f.write(json.dumps(order.raw_data, indent=4))
                    f.write("\n\n")

                # Affiliate
                if order.affiliate:
                    f.write(f"👥 Referred by: {order.affiliate} (code: {order.referral_code})\n")

                # Tracking
                if order.tracking_metadata:
                    f.write("📊 Tracking Metadata:\n")
                    f.write(json.dumps(order.tracking_metadata, indent=4))
                    f.write("\n")

                f.write("=" * 80 + "\n\n")

        self.stdout.write(self.style.SUCCESS(f"Exported orders to {output_file}"))
