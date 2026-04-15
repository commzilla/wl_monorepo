from django.db import migrations
from django.db.models import F


def shift_order_numbers(apps, schema_editor):
    """Shift all existing order numbers from 4000-range to 40000-range (+36000)."""
    WebsiteOrder = apps.get_model('wefund', 'WebsiteOrder')
    WebsiteOrder.objects.filter(
        order_number__isnull=False
    ).update(order_number=F('order_number') + 36000)


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0202_websiteorder_order_number'),
    ]

    operations = [
        migrations.RunPython(shift_order_numbers, migrations.RunPython.noop),
    ]
