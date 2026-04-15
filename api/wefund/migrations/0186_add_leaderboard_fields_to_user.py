from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0185_whatsappconversation_whatsappmessage_whatsappbotconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='hidden_from_leaderboard',
            field=models.BooleanField(
                default=False,
                help_text='If True, user is excluded from all public leaderboards.',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='leaderboard_display_name',
            field=models.CharField(
                blank=True,
                help_text='Optional override name shown on leaderboards instead of real name.',
                max_length=100,
                null=True,
            ),
        ),
    ]
