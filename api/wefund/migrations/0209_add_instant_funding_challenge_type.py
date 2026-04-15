from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0208_unified_notes_trader_fk'),
    ]

    operations = [
        migrations.AlterField(
            model_name='websiteproduct',
            name='challenge_type',
            field=models.CharField(
                choices=[
                    ('1-step-algo', '1-Step Algo'),
                    ('1-step-pro', '1-Step Pro'),
                    ('2-step', '2-Step'),
                    ('instant-funding', 'Instant Funding'),
                ],
                max_length=20,
            ),
        ),
    ]
