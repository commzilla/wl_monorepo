from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0205_notification_image_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteorder',
            name='tracking_data',
            field=models.JSONField(blank=True, default=dict, help_text='Facebook Pixel tracking data (fbp, fbc, user_agent)'),
        ),
    ]
