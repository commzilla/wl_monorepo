from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0214_reset_token'),
    ]

    operations = [
        migrations.AlterField(
            model_name='discountcode',
            name='discount_type',
            field=models.CharField(
                choices=[
                    ('percentage', 'Percentage'),
                    ('fixed', 'Fixed Amount'),
                    ('buy_one_get_one', 'Buy One Get One'),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='discountcode',
            name='bogo_challenge_types',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Challenge types eligible for free second enrollment (e.g. ['1-step-algo', '2-step']).",
            ),
        ),
    ]
