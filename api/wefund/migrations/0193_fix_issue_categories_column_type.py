from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0192_add_min_trading_days'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE wefund_supportaifeedback ALTER COLUMN issue_categories TYPE jsonb USING to_jsonb(issue_categories);",
            reverse_sql="ALTER TABLE wefund_supportaifeedback ALTER COLUMN issue_categories TYPE varchar[] USING ARRAY(SELECT jsonb_array_elements_text(issue_categories));",
            state_operations=[
                migrations.AlterField(
                    model_name='supportaifeedback',
                    name='issue_categories',
                    field=models.JSONField(blank=True, default=list),
                ),
            ],
        ),
    ]
