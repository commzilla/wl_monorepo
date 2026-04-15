from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0191_add_paypal_payment_method'),
    ]

    operations = [
        migrations.AddField(
            model_name='payoutpolicy',
            name='min_trading_days',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Minimum unique trading days required before payout request. 0 = no restriction.',
            ),
        ),
        migrations.AddField(
            model_name='payoutconfiguration',
            name='min_trading_days',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text='Override: minimum trading days before payout (if custom). Null = use policy default.',
            ),
        ),
    ]
