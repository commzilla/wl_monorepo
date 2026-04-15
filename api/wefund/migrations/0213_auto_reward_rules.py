import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('wefund', '0212_support_message_edit_delete'),
    ]

    operations = [
        migrations.CreateModel(
            name='AutoRewardRule',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, default='')),
                ('trigger_type', models.CharField(choices=[('purchase', 'Challenge Purchase'), ('payout_approved', 'Payout Approved')], max_length=30)),
                ('threshold', models.PositiveIntegerField(help_text='Number of events required to trigger this reward')),
                ('reward_amount', models.DecimalField(decimal_places=2, help_text='WeCoins to grant when milestone is reached', max_digits=10)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['trigger_type', 'threshold'],
                'unique_together': {('trigger_type', 'threshold')},
            },
        ),
        migrations.CreateModel(
            name='AutoRewardGrant',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('granted_at', models.DateTimeField(auto_now_add=True)),
                ('rule', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='grants', to='wefund.autorewardrule')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='auto_reward_grants', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'rule')},
            },
        ),
    ]
