from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('wefund', '0184_meetingprofile_meetingavailability_meetingdateoverride_meetingbooking'),
    ]

    operations = [
        migrations.CreateModel(
            name='WhatsAppConversation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('wa_id', models.CharField(db_index=True, help_text='E.164 phone number', max_length=30, unique=True)),
                ('profile_name', models.CharField(blank=True, default='', max_length=200)),
                ('status', models.CharField(choices=[('active', 'Active'), ('human_handoff', 'Human Handoff'), ('resolved', 'Resolved'), ('archived', 'Archived')], default='active', max_length=20)),
                ('ai_enabled', models.BooleanField(default=True)),
                ('lead_status', models.CharField(choices=[('new', 'New'), ('engaged', 'Engaged'), ('qualified', 'Qualified'), ('converted', 'Converted'), ('lost', 'Lost')], default='new', max_length=20)),
                ('lead_data', models.JSONField(blank=True, default=dict, help_text='name, email, country, trading_experience, interested_products')),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('message_count', models.IntegerField(default=0)),
                ('ai_message_count', models.IntegerField(default=0)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(blank=True, help_text='Linked when prospect registers', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whatsapp_conversations', to=settings.AUTH_USER_MODEL)),
                ('assigned_agent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whatsapp_assigned_conversations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-last_message_at'],
                'indexes': [
                    models.Index(fields=['status'], name='wefund_whatsa_status_idx'),
                    models.Index(fields=['lead_status'], name='wefund_whatsa_lead_st_idx'),
                    models.Index(fields=['last_message_at'], name='wefund_whatsa_last_me_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='WhatsAppMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('direction', models.CharField(choices=[('inbound', 'Inbound'), ('outbound', 'Outbound')], max_length=10)),
                ('sender_type', models.CharField(choices=[('user', 'User'), ('ai', 'AI'), ('agent', 'Agent'), ('system', 'System')], max_length=10)),
                ('content', models.TextField()),
                ('twilio_sid', models.CharField(blank=True, db_index=True, max_length=50, null=True)),
                ('delivery_status', models.CharField(blank=True, choices=[('queued', 'Queued'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read'), ('failed', 'Failed')], max_length=20, null=True)),
                ('ai_model_used', models.CharField(blank=True, default='', max_length=100)),
                ('ai_tokens_used', models.IntegerField(blank=True, null=True)),
                ('ai_tool_calls', models.JSONField(blank=True, default=list)),
                ('is_internal', models.BooleanField(default=False, help_text='Internal note, not sent via WhatsApp')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='wefund.whatsappconversation')),
                ('agent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='whatsapp_messages_sent', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['created_at'],
                'indexes': [
                    models.Index(fields=['conversation', 'created_at'], name='wefund_whatsa_convers_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='WhatsAppBotConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bot_enabled', models.BooleanField(default=True)),
                ('ai_model', models.CharField(blank=True, default='', max_length=100)),
                ('ai_temperature', models.FloatField(default=0.3)),
                ('ai_max_tokens', models.IntegerField(default=1024)),
                ('system_prompt_override', models.TextField(blank=True, default='', help_text='Merged with base prompt')),
                ('greeting_message', models.TextField(blank=True, default='Hello! Welcome to WeFund. How can I help you today?')),
                ('handoff_message', models.TextField(blank=True, default="I'm connecting you with a human agent who can help you further. Please hold on!")),
                ('out_of_hours_message', models.TextField(blank=True, default='')),
                ('max_ai_messages_per_hour', models.IntegerField(default=30)),
                ('max_messages_per_conversation_per_day', models.IntegerField(default=100)),
                ('escalation_keywords', models.JSONField(blank=True, default=list, help_text="Keywords that trigger auto-handoff, e.g. ['speak to human', 'agent', 'manager']")),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'WhatsApp Bot Configuration',
                'verbose_name_plural': 'WhatsApp Bot Configuration',
            },
        ),
    ]
