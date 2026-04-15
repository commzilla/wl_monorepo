from django.core.management.base import BaseCommand
from django_celery_beat.models import PeriodicTask, CrontabSchedule


class Command(BaseCommand):
    help = "Schedule daily extended review auto-revert task"

    def handle(self, *args, **options):
        schedule, _ = CrontabSchedule.objects.get_or_create(minute='0', hour='2')  # daily 02:00
        PeriodicTask.objects.update_or_create(
            name='Auto revert extended reviews',
            defaults={
                'crontab': schedule,
                'task': 'wefund.tasks.payout_tasks.auto_revert_extended_reviews',
                'enabled': True,
            },
        )
        self.stdout.write(self.style.SUCCESS('Scheduled auto revert task'))


