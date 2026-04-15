import csv
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from wefund.models import MT5Trade


class Command(BaseCommand):
    help = "Export all MT5Trade data into separate CSV files per account."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            type=str,
            default=os.path.join(settings.BASE_DIR, "exports", "mt5_trades"),
            help="Directory to save the CSV files (default: BASE_DIR/exports/mt5_trades)"
        )

    def handle(self, *args, **options):
        output_dir = options["output_dir"]
        os.makedirs(output_dir, exist_ok=True)

        # ✅ Force evaluate and deduplicate account IDs early
        account_ids = list(MT5Trade.objects.values_list("account_id", flat=True))
        account_ids = sorted(set(account_ids))  # remove duplicates + sort
        total_accounts = len(account_ids)

        if total_accounts == 0:
            self.stdout.write(self.style.WARNING("No trades found in MT5Trade."))
            return

        self.stdout.write(self.style.SUCCESS(f"Exporting trades for {total_accounts} unique accounts..."))

        # Define CSV headers
        headers = [
            "order", "timestamp", "symbol", "digits", "cmd", "volume",
            "open_time", "open_price", "close_time", "close_price",
            "sl", "tp", "commission", "commission_agent", "storage",
            "profit", "taxes", "value_date", "expiration", "conv_reserv",
            "open_conv_rate", "close_conv_rate", "magic", "comment",
            "spread", "margin_rate", "is_closed", "created_at"
        ]

        exported_files = set()

        for idx, account_id in enumerate(account_ids, start=1):
            file_path = os.path.join(output_dir, f"{account_id}.csv")

            # ✅ Skip duplicate file write
            if file_path in exported_files:
                continue

            trades = MT5Trade.objects.filter(account_id=account_id).order_by("close_time")

            if not trades.exists():
                continue

            with open(file_path, mode="w", newline="", encoding="utf-8") as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(headers)
                for trade in trades:
                    writer.writerow([
                        trade.order,
                        trade.timestamp,
                        trade.symbol,
                        trade.digits,
                        trade.cmd,
                        trade.volume,
                        trade.open_time,
                        trade.open_price,
                        trade.close_time,
                        trade.close_price,
                        trade.sl,
                        trade.tp,
                        trade.commission,
                        trade.commission_agent,
                        trade.storage,
                        trade.profit,
                        trade.taxes,
                        trade.value_date,
                        trade.expiration,
                        trade.conv_reserv,
                        trade.open_conv_rate,
                        trade.close_conv_rate,
                        trade.magic,
                        trade.comment,
                        trade.spread,
                        trade.margin_rate,
                        trade.is_closed,
                        trade.created_at,
                    ])

            exported_files.add(file_path)
            self.stdout.write(f"[{idx}/{total_accounts}] ✅ Exported {trades.count()} trades → {file_path}")

        self.stdout.write(self.style.SUCCESS(f"\nAll exports completed! Files saved in: {output_dir}\n"))
