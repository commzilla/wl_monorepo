from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0187_agentshiftschedule_agentshiftoverride'),
    ]

    operations = [
        migrations.AddField(
            model_name='payoutpolicy',
            name='max_payouts',
            field=models.PositiveIntegerField(
                default=0,
                help_text='Maximum number of paid payouts allowed per enrollment. 0 = unlimited.',
            ),
        ),
        migrations.AlterField(
            model_name='challengeenrollment',
            name='status',
            field=models.CharField(
                choices=[
                    ('phase_1_in_progress', 'Phase 1 - In Progress'),
                    ('phase_1_passed', 'Phase 1 - Passed'),
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
    ]
