from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0211_pap_addon_flat_fee'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportmessage',
            name='edited_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='supportmessage',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
