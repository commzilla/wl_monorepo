import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0197_addon_effects_and_payout_config'),
    ]

    operations = [
        migrations.AlterField(
            model_name='release',
            name='repos_affected',
            field=django.contrib.postgres.fields.ArrayField(
                base_field=models.CharField(
                    choices=[('api', 'API'), ('crm', 'CRM'), ('app', 'App'), ('website', 'Website')],
                    max_length=20,
                ),
                default=list,
                help_text='Which repositories this release touches',
                size=None,
            ),
        ),
    ]
