from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0189_emailtemplate'),
    ]

    operations = [
        migrations.AddField(
            model_name='meetingprofile',
            name='min_notice_hours',
            field=models.IntegerField(default=24, help_text='Minimum hours before a slot can be booked. 0 = no restriction.'),
        ),
    ]
