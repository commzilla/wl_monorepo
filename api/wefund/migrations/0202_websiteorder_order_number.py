from django.db import migrations, models


def backfill_order_numbers(apps, schema_editor):
    """Assign sequential order numbers to existing completed orders, starting at 4000."""
    WebsiteOrder = apps.get_model('wefund', 'WebsiteOrder')
    completed = WebsiteOrder.objects.filter(
        status='completed'
    ).order_by('created_at')

    number = 4000
    for order in completed.iterator():
        order.order_number = number
        order.save(update_fields=['order_number'])
        number += 1


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0201_discountcode_usage_limit_per_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteorder',
            name='order_number',
            field=models.PositiveIntegerField(blank=True, null=True, unique=True),
        ),
        migrations.RunPython(backfill_order_numbers, migrations.RunPython.noop),
    ]
