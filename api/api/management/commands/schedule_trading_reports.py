"""
Management command to schedule the weekly and monthly trading report tasks.
Sets up Celery periodic tasks for automated report generation.
"""

from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule


class Command(BaseCommand):
    help = "Schedule weekly and monthly trading report generation tasks"

    def add_arguments(self, parser):
        parser.add_argument(
            '--weekly-day',
            type=int,
            default=1,
            help='Day of week for weekly report (0=Sun, 1=Mon, ..., 6=Sat). Default: 1 (Monday)'
        )
        parser.add_argument(
            '--monthly-day',
            type=int,
            default=1,
            help='Day of month for monthly report (1-28). Default: 1'
        )
        parser.add_argument(
            '--hour',
            type=int,
            default=6,
            help='Hour (UTC) to run reports (default: 6 = 06:00 UTC)'
        )
        parser.add_argument(
            '--disable',
            action='store_true',
            help='Disable the scheduled tasks instead of enabling them'
        )

    def handle(self, *args, **options):
        weekly_day = options['weekly_day']
        monthly_day = options['monthly_day']
        hour = options['hour']
        disable = options['disable']

        # Weekly report schedule
        weekly_schedule, _ = CrontabSchedule.objects.get_or_create(
            minute='0',
            hour=str(hour),
            day_of_week=str(weekly_day),
            day_of_month='*',
            month_of_year='*',
        )

        weekly_task, created = PeriodicTask.objects.update_or_create(
            name='Generate Weekly Trading Report',
            defaults={
                'crontab': weekly_schedule,
                'task': 'wefund.tasks.trading_report_tasks.generate_weekly_report',
                'enabled': not disable,
            },
        )

        action = 'Disabled' if disable else ('Created' if created else 'Updated')
        self.stdout.write(
            self.style.SUCCESS(
                f'{action} periodic task: Generate Weekly Trading Report\n'
                f'  Schedule: Every {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][weekly_day]} at {hour:02d}:00 UTC\n'
                f'  Enabled: {not disable}'
            )
        )

        # Monthly report schedule
        monthly_schedule, _ = CrontabSchedule.objects.get_or_create(
            minute='0',
            hour=str(hour),
            day_of_week='*',
            day_of_month=str(monthly_day),
            month_of_year='*',
        )

        monthly_task, created = PeriodicTask.objects.update_or_create(
            name='Generate Monthly Trading Report',
            defaults={
                'crontab': monthly_schedule,
                'task': 'wefund.tasks.trading_report_tasks.generate_monthly_report',
                'enabled': not disable,
            },
        )

        action = 'Disabled' if disable else ('Created' if created else 'Updated')
        self.stdout.write(
            self.style.SUCCESS(
                f'{action} periodic task: Generate Monthly Trading Report\n'
                f'  Schedule: Day {monthly_day} of every month at {hour:02d}:00 UTC\n'
                f'  Enabled: {not disable}'
            )
        )
