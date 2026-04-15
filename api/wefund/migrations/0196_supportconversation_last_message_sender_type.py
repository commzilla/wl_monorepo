from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0195_support_email_ticketing'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportconversation',
            name='last_message_sender_type',
            field=models.CharField(
                blank=True,
                choices=[('user', 'User'), ('ai', 'AI'), ('agent', 'Agent')],
                help_text='Sender type of the most recent non-internal message',
                max_length=10,
                null=True,
            ),
        ),
    ]
