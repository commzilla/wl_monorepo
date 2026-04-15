from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("wefund", "0204_add_kyc_send_rise_invite_permission"),
    ]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="image_url",
            field=models.URLField(
                max_length=500, null=True, blank=True,
                help_text="Optional image thumbnail URL",
            ),
        ),
        migrations.AddField(
            model_name="schedulednotification",
            name="image_url",
            field=models.URLField(
                max_length=500, null=True, blank=True,
                help_text="Optional image thumbnail URL",
            ),
        ),
    ]
