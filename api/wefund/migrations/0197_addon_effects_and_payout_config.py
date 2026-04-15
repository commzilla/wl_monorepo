from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0196_supportconversation_last_message_sender_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='websiteproductaddon',
            name='effect_type',
            field=models.CharField(
                choices=[('none', 'No Effect'), ('profit_split', 'Profit Split Override'), ('accelerated_payout', 'Accelerated Payout')],
                default='none',
                help_text='Automation effect when this addon is purchased',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='websiteproductaddon',
            name='effect_value',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Value for the effect (e.g. 90 for 90% profit split, 14 for 14-day payout delay)',
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name='websiteproductaddon',
            name='effect_from_payout',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text='Apply profit split effect from this payout number onwards (e.g. 3 for third payout)',
            ),
        ),
        migrations.AddField(
            model_name='payoutconfiguration',
            name='profit_split_from_payout',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text='Apply profit_share_percent only from this payout number onwards (e.g. 3 for third payout)',
            ),
        ),
    ]
