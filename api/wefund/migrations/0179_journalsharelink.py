import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0178_journalinsight_unique_journal_insight_per_period'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='JournalShareLink',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('enrollment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='share_links', to='wefund.challengeenrollment')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='journal_share_links', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'enrollment')},
            },
        ),
    ]
