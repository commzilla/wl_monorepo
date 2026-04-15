from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0200_seed_rbac_permissions_roles'),
    ]

    operations = [
        migrations.AddField(
            model_name='discountcode',
            name='usage_limit_per_user',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='Max uses per customer (by email). Null = unlimited.',
                null=True,
            ),
        ),
    ]
