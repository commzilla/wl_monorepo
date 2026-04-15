import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('wefund', '0188_payout_limit'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('template_path', models.CharField(max_length=255, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('subject', models.CharField(blank=True, max_length=500)),
                ('category', models.CharField(choices=[
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
                ], max_length=50)),
                ('body_html', models.TextField()),
                ('body_text', models.TextField(blank=True)),
                ('variables', models.JSONField(default=list)),
                ('sample_context', models.JSONField(default=dict)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_modified_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='modified_email_templates',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['category', 'name'],
            },
        ),
    ]
