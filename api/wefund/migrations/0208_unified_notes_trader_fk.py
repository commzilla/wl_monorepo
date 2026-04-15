"""
Add trader FK to InternalNote for unified notes querying.
Make content_type and object_id nullable (notes can exist without a specific target object).
Backfill trader from existing enrollment-linked notes.
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_trader_from_enrollments(apps, schema_editor):
    """
    For existing notes linked to ChallengeEnrollment,
    set the trader field to the enrollment's client's user.
    """
    InternalNote = apps.get_model('wefund', 'InternalNote')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ChallengeEnrollment = apps.get_model('wefund', 'ChallengeEnrollment')

    try:
        enrollment_ct = ContentType.objects.get(app_label='wefund', model='challengeenrollment')
    except ContentType.DoesNotExist:
        return

    enrollment_notes = InternalNote.objects.filter(
        content_type=enrollment_ct,
        object_id__isnull=False,
        trader__isnull=True,
    )

    for note in enrollment_notes.iterator():
        try:
            enrollment = ChallengeEnrollment.objects.get(id=note.object_id)
            note.trader = enrollment.client.user
            note.save(update_fields=['trader'])
        except ChallengeEnrollment.DoesNotExist:
            continue


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('wefund', '0207_pay_after_pass_fields'),
    ]

    operations = [
        # Add trader FK
        migrations.AddField(
            model_name='internalnote',
            name='trader',
            field=models.ForeignKey(
                blank=True,
                help_text='The trader this note is associated with',
                limit_choices_to={'role': 'client'},
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='trader_notes',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        # Make content_type nullable
        migrations.AlterField(
            model_name='internalnote',
            name='content_type',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='contenttypes.contenttype',
            ),
        ),
        # Make object_id nullable
        migrations.AlterField(
            model_name='internalnote',
            name='object_id',
            field=models.UUIDField(blank=True, null=True),
        ),
        # Backfill trader from enrollment notes
        migrations.RunPython(
            backfill_trader_from_enrollments,
            migrations.RunPython.noop,
        ),
    ]
