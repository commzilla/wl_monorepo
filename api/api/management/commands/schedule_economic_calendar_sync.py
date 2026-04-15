"""
Management command to schedule the economic calendar sync task.
Sets up daily Celery periodic task at midnight UTC.
"""

from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule


class Command(BaseCommand):
    help = "Schedule daily economic calendar sync task at midnight UTC"

    def add_arguments(self, parser):
        parser.add_argument(
            '--hour',
            type=int,
            default=0,
            help='Hour (UTC) to run the sync (default: 0 = midnight)'
        )
        parser.add_argument(
            '--minute',
            type=int,
            default=0,
            help='Minute to run the sync (default: 0)'
        )
        parser.add_argument(
            '--disable',
            action='store_true',
            help='Disable the scheduled task instead of enabling it'
        )

    def handle(self, *args, **options):
        hour = options['hour']
        minute = options['minute']
        disable = options['disable']

        # Create or get the crontab schedule
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=str(minute),
            hour=str(hour),
            day_of_week='*',
            day_of_month='*',
            month_of_year='*',
        )

        # Create or update the periodic task
        task_name = 'Sync Economic Calendar from Forex Factory'
        task_path = 'wefund.tasks.economic_calendar_tasks.sync_economic_calendar'

        task, created = PeriodicTask.objects.update_or_create(
            name=task_name,
            defaults={
                'crontab': schedule,
                'task': task_path,
                'enabled': not disable,
            },
        )

        if disable:
            self.stdout.write(
                self.style.WARNING(f'Disabled task: {task_name}')
            )
        else:
            action = 'Created' if created else 'Updated'
            self.stdout.write(
                self.style.SUCCESS(
                    f'{action} periodic task: {task_name}\n'
                    f'  Schedule: Daily at {hour:02d}:{minute:02d} UTC\n'
                    f'  Task: {task_path}\n'
                    f'  Enabled: {not disable}'
                )
            )
