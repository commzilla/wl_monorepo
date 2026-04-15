"""
Management command to import FAQ data from markdown export file.
Usage: python manage.py import_faq /path/to/FAQ_DATA_EXPORT.md
"""
import json
import re
from django.core.management.base import BaseCommand
from wefund.models import FAQCollection, FAQArticle


class Command(BaseCommand):
    help = 'Import FAQ collections and articles from markdown export file'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the FAQ_DATA_EXPORT.md file')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing FAQ data before importing',
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        clear_existing = options.get('clear', False)

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            self.stderr.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        # Extract all JSON blocks from the markdown (handle leading whitespace)
        json_blocks = re.findall(r'```json\s*\n([\s\S]*?)\n\s*```', content)

        if len(json_blocks) < 2:
            self.stderr.write(self.style.ERROR(f'Could not find expected JSON blocks in the file. Found {len(json_blocks)} blocks.'))
            return

        # First JSON block is collections - clean up whitespace
        try:
            cleaned_json = '\n'.join(line.strip() for line in json_blocks[0].split('\n'))
            collections_data = json.loads(cleaned_json)
        except json.JSONDecodeError as e:
            self.stderr.write(self.style.ERROR(f'Failed to parse collections JSON: {e}'))
            return

        # Remaining JSON blocks are articles for each collection
        articles_blocks = json_blocks[1:]

        self.stdout.write(f'Found {len(collections_data)} collections')
        self.stdout.write(f'Found {len(articles_blocks)} article blocks')

        if clear_existing:
            self.stdout.write('Clearing existing FAQ data...')
            FAQArticle.objects.all().delete()
            FAQCollection.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared existing data'))

        # Create collections and map old IDs to new objects
        collection_map = {}  # old_id -> new collection object
        collection_order = []  # ordered list of new collection objects

        for coll_data in collections_data:
            old_id = coll_data.get('id')

            collection, created = FAQCollection.objects.update_or_create(
                title=coll_data['title'],
                defaults={
                    'description': coll_data.get('description', ''),
                    'icon': coll_data.get('icon', ''),
                    'display_order': coll_data.get('display_order', 0),
                    'is_active': coll_data.get('is_active', True),
                }
            )

            collection_map[old_id] = collection
            collection_order.append(collection)

            status = 'Created' if created else 'Updated'
            self.stdout.write(f'  {status} collection: {collection.title}')

        # Create articles for each collection
        total_articles = 0

        for idx, articles_json in enumerate(articles_blocks):
            if idx >= len(collection_order):
                self.stderr.write(self.style.WARNING(
                    f'More article blocks than collections, skipping block {idx + 1}'
                ))
                continue

            collection = collection_order[idx]

            try:
                cleaned_articles = '\n'.join(line.strip() for line in articles_json.split('\n'))
                articles_data = json.loads(cleaned_articles)
            except json.JSONDecodeError as e:
                self.stderr.write(self.style.ERROR(
                    f'Failed to parse articles JSON for collection {collection.title}: {e}'
                ))
                continue

            for art_data in articles_data:
                article, created = FAQArticle.objects.update_or_create(
                    collection=collection,
                    title=art_data['title'],
                    defaults={
                        'content': art_data.get('content', ''),
                        'search_keywords': art_data.get('search_keywords', []),
                        'display_order': art_data.get('display_order', 0),
                        'is_active': True,
                    }
                )
                total_articles += 1

            self.stdout.write(f'  Imported {len(articles_data)} articles for: {collection.title}')

        self.stdout.write(self.style.SUCCESS(
            f'\nImport complete! {len(collection_order)} collections, {total_articles} articles'
        ))
