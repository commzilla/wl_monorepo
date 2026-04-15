from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0209_add_instant_funding_challenge_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='challengeenrollment',
            name='status',
            field=models.CharField(
                choices=[
                    ('phase_1_in_progress', 'Phase 1 - In Progress'),
                    ('phase_1_passed', 'Phase 1 - Passed'),
                    ('awaiting_payment', 'Awaiting Payment'),
                    ('awaiting_kyc', 'Awaiting KYC'),
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
        migrations.AlterField(
            model_name='challengeenrollment',
            name='payment_type',
            field=models.CharField(
                choices=[
                    ('standard', 'Standard'),
                    ('pay_after_pass', 'Pay After Pass'),
                    ('instant_funding', 'Instant Funding'),
                ],
                default='standard',
                help_text="'pay_after_pass' means client paid entry fee only; full payment due after passing",
                max_length=20,
            ),
        ),
    ]
