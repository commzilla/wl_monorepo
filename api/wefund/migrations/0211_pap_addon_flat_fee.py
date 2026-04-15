import decimal
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0210_instant_funding_enrollment'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteproduct',
            name='pap_addon_flat_fee',
            field=models.DecimalField(
                decimal_places=2,
                default=5,
                help_text='Flat fee charged per add-on during PAP initial purchase (full add-on price charged on completion)',
                max_digits=10,
            ),
        ),
    ]
