"""
Seed data migration: Default TagCategory entries for the Trade Journal.
"""
from django.db import migrations


def seed_tag_categories(apps, schema_editor):
    TagCategory = apps.get_model('wefund', 'TagCategory')

    categories = [
        {'name': 'Strategy', 'category_type': 'strategy', 'color': '#28BFFF', 'icon': 'target', 'is_system': True},
        {'name': 'Setup', 'category_type': 'setup', 'color': '#7570FF', 'icon': 'layout', 'is_system': True},
        {'name': 'Mistake', 'category_type': 'mistake', 'color': '#ED5363', 'icon': 'alert-triangle', 'is_system': True},
        {'name': 'Emotion', 'category_type': 'emotion', 'color': '#F59E0B', 'icon': 'heart', 'is_system': True},
        {'name': 'Market Condition', 'category_type': 'market_condition', 'color': '#1BBF99', 'icon': 'trending-up', 'is_system': True},
        {'name': 'Custom', 'category_type': 'custom', 'color': '#85A8C3', 'icon': 'tag', 'is_system': True},
    ]

    for cat_data in categories:
        TagCategory.objects.get_or_create(
            name=cat_data['name'],
            category_type=cat_data['category_type'],
            defaults={
                'color': cat_data['color'],
                'icon': cat_data['icon'],
                'is_system': cat_data['is_system'],
            }
        )


def reverse_seed(apps, schema_editor):
    TagCategory = apps.get_model('wefund', 'TagCategory')
    TagCategory.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('wefund', '0176_tagcategory_journalconfig_tradetag_journalinsight_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_tag_categories, reverse_seed),
    ]
