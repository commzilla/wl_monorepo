"""
One-time management command to create WeCoinWallet for all existing clients
who don't have one yet.

Usage:
    python manage.py backfill_wecoin_wallets          # dry-run (default)
    python manage.py backfill_wecoin_wallets --apply   # actually create wallets
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from wefund.models import WeCoinWallet

User = get_user_model()


class Command(BaseCommand):
    help = 'Create WeCoinWallet for all existing clients who do not have one.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            default=False,
            help='Actually create wallets. Without this flag, only a dry-run count is shown.',
        )

    def handle(self, *args, **options):
        apply = options['apply']

        clients_without_wallet = User.objects.filter(
            role='client',
        ).exclude(
            id__in=WeCoinWallet.objects.values_list('user_id', flat=True),
        )

        count = clients_without_wallet.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('All clients already have a WeCoinWallet.'))
            return

        if not apply:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: {count} client(s) without a WeCoinWallet found. '
                    f'Re-run with --apply to create them.'
                )
            )
            return

        created = 0
        for user in clients_without_wallet.iterator(chunk_size=500):
            _, was_created = WeCoinWallet.objects.get_or_create(user=user)
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Created {created} WeCoinWallet(s) for existing clients.'))
