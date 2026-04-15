from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0190_meetingprofile_min_notice_hours'),
    ]

    operations = [
        migrations.AlterField(
            model_name='websiteorder',
            name='payment_method',
            field=models.CharField(
                blank=True,
                choices=[('card', 'Card (Paytiko)'), ('crypto', 'Crypto (Confirmo)'), ('paypal', 'PayPal')],
                max_length=20,
            ),
        ),
    ]
