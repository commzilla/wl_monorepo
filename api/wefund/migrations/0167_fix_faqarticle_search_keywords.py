# Generated manually to fix search_keywords column type mismatch

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0166_support_chat_widget'),
    ]

    operations = [
        migrations.RunSQL(
            # Convert character varying[] to jsonb
            sql="""
                ALTER TABLE wefund_faqarticle
                ALTER COLUMN search_keywords TYPE jsonb
                USING to_jsonb(search_keywords);
            """,
            reverse_sql="""
                ALTER TABLE wefund_faqarticle
                ALTER COLUMN search_keywords TYPE character varying[]
                USING ARRAY(SELECT jsonb_array_elements_text(search_keywords));
            """,
        ),
    ]
