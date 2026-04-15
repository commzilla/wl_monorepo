"""
Migration: Add guest chat support to SupportConversation model.

All operations are ADDITIVE — no data loss, no destructive operations.
- Make user FK nullable (SET_NULL) for guest conversations
- Add guest_name, guest_email, session_token fields
- Add 'website' to SOURCE_CHOICES
- Add index on guest_email + created_at
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("wefund", "0193_fix_issue_categories_column_type"),
    ]

    operations = [
        # Make user nullable (CASCADE → SET_NULL)
        migrations.AlterField(
            model_name="supportconversation",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="support_conversations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Add guest fields
        migrations.AddField(
            model_name="supportconversation",
            name="guest_name",
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name="supportconversation",
            name="guest_email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="supportconversation",
            name="session_token",
            field=models.CharField(
                blank=True,
                db_index=True,
                max_length=64,
                null=True,
                unique=True,
            ),
        ),
        # Update source choices to include 'website'
        migrations.AlterField(
            model_name="supportconversation",
            name="source",
            field=models.CharField(
                choices=[
                    ("widget", "Widget"),
                    ("discord", "Discord"),
                    ("email", "Email"),
                    ("website", "Website"),
                ],
                default="widget",
                max_length=20,
            ),
        ),
        # Add index for guest email lookups
        migrations.AddIndex(
            model_name="supportconversation",
            index=models.Index(
                fields=["guest_email", "-created_at"],
                name="wefund_suppo_guest_e_idx",
            ),
        ),
    ]
