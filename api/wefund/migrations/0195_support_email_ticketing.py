from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0194_support_guest_chat'),
    ]

    operations = [
        # Add message_type to SupportMessage
        migrations.AddField(
            model_name='supportmessage',
            name='message_type',
            field=models.CharField(
                choices=[('chat', 'Chat'), ('email', 'Email'), ('system', 'System')],
                db_index=True,
                default='chat',
                help_text='Message channel type: chat, email, or system',
                max_length=20,
            ),
        ),
        # Add email threading fields to SupportConversation
        migrations.AddField(
            model_name='supportconversation',
            name='email_message_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='RFC 2822 Message-ID for email threading',
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='supportconversation',
            name='email_subject',
            field=models.CharField(
                blank=True,
                help_text='Email subject line for email conversations',
                max_length=500,
                null=True,
            ),
        ),
        # Add support conversation FK to EmailLog
        migrations.AddField(
            model_name='emaillog',
            name='support_conversation',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='email_logs',
                to='wefund.supportconversation',
            ),
        ),
        # Add support message FK to EmailLog
        migrations.AddField(
            model_name='emaillog',
            name='support_message',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='email_log_entries',
                to='wefund.supportmessage',
            ),
        ),
        # Update EmailLog category choices (support added)
        migrations.AlterField(
            model_name='emaillog',
            name='category',
            field=models.CharField(
                blank=True,
                choices=[
                    ('kyc', 'KYC / Verification'),
                    ('challenge', 'Challenge'),
                    ('payout', 'Payout'),
                    ('affiliate', 'Affiliate'),
                    ('offer', 'Offer / Coupon'),
                    ('wallet', 'Wallet / Transaction'),
                    ('system', 'System'),
                    ('admin', 'Admin'),
                    ('support', 'Support'),
                    ('other', 'Other'),
                ],
                max_length=50,
                null=True,
            ),
        ),
        # Update EmailTemplate category choices (support added)
        migrations.AlterField(
            model_name='emailtemplate',
            name='category',
            field=models.CharField(
                choices=[
                    ('payout', 'Payout'),
                    ('challenge', 'Challenge'),
                    ('competition', 'Competition'),
                    ('crm', 'CRM / Admin'),
                    ('migration', 'Migration'),
                    ('bulk_import', 'Bulk Import'),
                    ('breach', 'Breach'),
                    ('certificate', 'Certificate'),
                    ('ea_submission', 'EA Submission'),
                    ('auth', 'Authentication'),
                    ('affiliate', 'Affiliate'),
                    ('automation', 'Automation'),
                    ('support', 'Support'),
                ],
                max_length=50,
            ),
        ),
    ]
