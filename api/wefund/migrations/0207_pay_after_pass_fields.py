from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0206_websiteorder_tracking_data'),
    ]

    operations = [
        # WebsiteProduct: add is_pay_after_pass flag
        migrations.AddField(
            model_name='websiteproduct',
            name='is_pay_after_pass',
            field=models.BooleanField(
                default=False,
                help_text='If True, clients pay a small entry fee upfront and full price only after passing the challenge',
            ),
        ),
        # WebsiteProductVariant: add entry_fee
        migrations.AddField(
            model_name='websiteproductvariant',
            name='entry_fee',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Entry fee for Pay After Pass products (charged upfront instead of full price)',
                max_digits=10,
                null=True,
            ),
        ),
        # ChallengeEnrollment: add payment_type
        migrations.AddField(
            model_name='challengeenrollment',
            name='payment_type',
            field=models.CharField(
                choices=[('standard', 'Standard'), ('pay_after_pass', 'Pay After Pass')],
                default='standard',
                help_text="'pay_after_pass' means client paid entry fee only; full payment due after passing",
                max_length=20,
            ),
        ),
        # ChallengeEnrollment: update status choices to include awaiting_payment
        migrations.AlterField(
            model_name='challengeenrollment',
            name='status',
            field=models.CharField(
                choices=[
                    ('phase_1_in_progress', 'Phase 1 - In Progress'),
                    ('phase_1_passed', 'Phase 1 - Passed'),
                    ('awaiting_payment', 'Awaiting Payment'),
                    ('phase_2_in_progress', 'Phase 2 - In Progress'),
                    ('phase_2_passed', 'Phase 2 - Passed'),
                    ('live_in_progress', 'Live - In Progress'),
                    ('completed', 'Completed'),
                    ('failed', 'Failed'),
                    ('payout_limit_reached', 'Payout Limit Reached'),
                ],
                default='phase_1_in_progress',
                max_length=30,
            ),
        ),
        # WebsiteOrder: add pap_enrollment FK
        migrations.AddField(
            model_name='websiteorder',
            name='pap_enrollment',
            field=models.ForeignKey(
                blank=True,
                help_text='For PAP completion orders: the enrollment that passed and needs full payment',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pap_orders',
                to='wefund.challengeenrollment',
            ),
        ),
    ]
