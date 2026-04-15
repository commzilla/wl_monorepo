"""
Import WooCommerce coupon codes into DiscountCode model.

Usage:
    python manage.py import_woocommerce_coupons /path/to/coupons.csv
    python manage.py import_woocommerce_coupons /path/to/coupons.csv --dry-run
"""
import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.utils import timezone

from wefund.models import DiscountCode


# WooCommerce type -> DiscountCode type
TYPE_MAP = {
    'percent': 'percentage',
    'fixed_cart': 'fixed',
    'fixed_product': 'fixed',
    'acfw_fixed_cashback': 'fixed',
}


class Command(BaseCommand):
    help = 'Import WooCommerce coupon codes into DiscountCode model'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the WooCommerce coupons CSV file')
        parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without making changes')

    def handle(self, *args, **options):
        csv_path = options['csv_file']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('=== DRY RUN MODE ===\n'))

        rows = self._parse_csv(csv_path)
        self.stdout.write(f'Parsed {len(rows)} rows from CSV\n')

        # Deduplicate: keep the last occurrence of each code (case-insensitive),
        # but sum usage_count from all occurrences.
        deduped = self._deduplicate(rows)
        self.stdout.write(f'{len(deduped)} unique codes after deduplication\n')

        created = 0
        updated = 0
        skipped = 0
        errors = []

        for entry in deduped:
            code = entry['code']
            try:
                defaults = {
                    'discount_type': entry['discount_type'],
                    'discount_value': entry['discount_value'],
                    'max_uses': entry['max_uses'],
                    'current_uses': entry['current_uses'],
                    'usage_limit_per_user': entry['usage_limit_per_user'],
                    'min_order_amount': entry['min_order_amount'],
                    'valid_from': None,
                    'valid_until': entry['valid_until'],
                    'is_active': True,
                }

                if dry_run:
                    exists = DiscountCode.objects.filter(code__iexact=code).exists()
                    action = 'UPDATE' if exists else 'CREATE'
                    self.stdout.write(
                        f'  [{action}] {code}: {entry["discount_value"]}% '
                        f'max_uses={entry["max_uses"]} '
                        f'current_uses={entry["current_uses"]} '
                        f'per_user={entry["usage_limit_per_user"]} '
                        f'until={entry["valid_until"]}'
                    )
                    if exists:
                        updated += 1
                    else:
                        created += 1
                else:
                    # Use iexact lookup to find existing, but set exact code
                    existing = DiscountCode.objects.filter(code__iexact=code).first()
                    if existing:
                        for key, value in defaults.items():
                            setattr(existing, key, value)
                        existing.save()
                        updated += 1
                    else:
                        DiscountCode.objects.create(code=code, **defaults)
                        created += 1

            except Exception as e:
                errors.append(f'{code}: {e}')
                skipped += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Created: {created}'))
        self.stdout.write(self.style.SUCCESS(f'Updated: {updated}'))
        if skipped:
            self.stdout.write(self.style.ERROR(f'Skipped/Errors: {skipped}'))
            for err in errors:
                self.stdout.write(self.style.ERROR(f'  {err}'))

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN - no changes made ==='))

    def _parse_csv(self, csv_path):
        rows = []
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows.append(row)
        return rows

    def _deduplicate(self, rows):
        """
        Keep the last occurrence of each code (case-insensitive).
        Sum usage_count across all duplicates.
        """
        seen = {}  # lowercase code -> index in result list
        result = []

        for row in rows:
            code = row['coupon_code'].strip()
            if not code:
                continue

            parsed = self._parse_row(row)
            key = code.lower()

            if key in seen:
                # Update to latest entry, but sum usage counts
                idx = seen[key]
                prev_uses = result[idx]['current_uses']
                result[idx] = parsed
                result[idx]['current_uses'] = prev_uses + parsed['current_uses']
            else:
                seen[key] = len(result)
                result.append(parsed)

        return result

    def _parse_row(self, row):
        code = row['coupon_code'].strip()
        coupon_type = row.get('coupon_type', 'percent').strip()
        discount_type = TYPE_MAP.get(coupon_type, 'percentage')

        # Discount value
        try:
            discount_value = Decimal(row.get('coupon_amount', '0').strip() or '0')
        except InvalidOperation:
            discount_value = Decimal('0')

        # Usage count (historical)
        try:
            current_uses = int(row.get('usage_count', '0').strip() or '0')
        except ValueError:
            current_uses = 0

        # Usage limit (0 = unlimited -> None)
        try:
            usage_limit = int(row.get('usage_limit', '0').strip() or '0')
        except ValueError:
            usage_limit = 0
        max_uses = usage_limit if usage_limit > 0 else None

        # Per-user limit (0 = unlimited -> None)
        try:
            per_user = int(row.get('usage_limit_per_user', '0').strip() or '0')
        except ValueError:
            per_user = 0
        usage_limit_per_user = per_user if per_user > 0 else None

        # Min order amount
        try:
            min_amount = Decimal(row.get('minimum_amount', '0').strip() or '0')
        except InvalidOperation:
            min_amount = Decimal('0')

        # Expiry date
        valid_until = None
        expiry_str = row.get('expiry_date', '').strip()
        if expiry_str:
            valid_until = self._parse_date(expiry_str)
            # Treat 1970-01-01 as a WooCommerce glitch -> no expiry
            if valid_until and valid_until.year == 1970:
                valid_until = None

        return {
            'code': code,
            'discount_type': discount_type,
            'discount_value': discount_value,
            'max_uses': max_uses,
            'current_uses': current_uses,
            'usage_limit_per_user': usage_limit_per_user,
            'min_order_amount': min_amount,
            'valid_until': valid_until,
        }

    def _parse_date(self, date_str):
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M', '%Y-%m-%d'):
            try:
                dt = datetime.strptime(date_str, fmt)
                return timezone.make_aware(dt, timezone.utc)
            except ValueError:
                continue
        return None
