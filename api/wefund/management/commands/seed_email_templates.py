"""
Management command to seed EmailTemplate records from disk templates.
Usage: python manage.py seed_email_templates
Idempotent — safe to re-run (uses update_or_create on template_path).
"""
import os
import re

from django.conf import settings
from django.core.management.base import BaseCommand

from wefund.models import EmailTemplate


# Map subdirectory → category
CATEGORY_MAP = {
    'payout': 'payout',
    'challenge': 'challenge',
    'competition': 'competition',
    'crm': 'crm',
    'migration': 'migration',
    'bulk_import': 'bulk_import',
    'breach': 'breach',
    'certificates': 'certificate',
    'ea_submission': 'ea_submission',
    'automation': 'automation',
}

# Descriptions of when each template is sent
DESCRIPTIONS = {
    'emails/payout/payout_approved.html': 'Sent when a payout request is approved by admin.',
    'emails/payout/payout_rejected.html': 'Sent when a payout request is rejected by admin.',
    'emails/payout/payout_request.html': 'Confirmation sent to trader after submitting a payout request.',
    'emails/payout/payout_limit_reached.html': 'Sent when a trader reaches their maximum payout limit.',
    'emails/payout/extended_review.html': 'Sent when a payout is placed under extended review.',
    'emails/challenge/funded_account_created.html': 'Sent when a funded (live) account is created for the trader.',
    'emails/challenge/phase2_started.html': 'Sent when a trader advances to Phase 2 of a challenge.',
    'emails/challenge/phase_passed.html': 'Sent when a trader passes a challenge phase.',
    'emails/competition/registration_success.html': 'Sent after successful competition registration with MT5 credentials.',
    'emails/competition/competition_winner.html': 'Sent to competition winners with rank and prize details.',
    'emails/competition/competition_loser.html': 'Sent to competition participants who did not win.',
    'emails/crm/reset_password.html': 'Sent to CRM admin users for password reset.',
    'emails/crm/trader_credentials.html': 'Sent to traders with credentials created via CRM.',
    'emails/migration/user_credentials.html': 'Sent during platform migration with new credentials.',
    'emails/migration/broker_migration.html': 'Sent when a trader is migrated to a new broker with new MT5 credentials.',
    'emails/bulk_import/new_client_challenge.html': 'Sent to new clients imported via bulk import with challenge enrollment.',
    'emails/bulk_import/existing_client_challenge.html': 'Sent to existing clients with new challenge enrollment via bulk import.',
    'emails/breach/hard_breach.html': 'Sent when a trader hard-breaches risk management rules.',
    'emails/certificates/challenge_certificate.html': 'Sent with a challenge completion certificate.',
    'emails/ea_submission/ea_request_submitted.html': 'Confirmation sent after an EA submission request.',
    'emails/ea_submission/ea_request_approved.html': 'Sent when an EA submission request is approved.',
    'emails/ea_submission/ea_request_rejected.html': 'Sent when an EA submission request is rejected.',
    'emails/password_reset.html': 'Sent to client users requesting a password reset.',
    'emails/password_reset_confirmation.html': 'Sent after a successful password change.',
    'emails/otp_email.html': 'Sent with a one-time verification code for email verification.',
    'emails/user_credentials.html': 'Sent to new users with their app and MT5 credentials.',
    'emails/affiliate_credentials.html': 'Sent to new affiliates with their account credentials.',
    'emails/automation/payouts/payout_rejected.html': 'Sent when a payout is auto-rejected by the risk engine.',
    'emails/automation/payouts/payout_rejected_v2.html': 'Sent when a payout is auto-rejected (v2 template with detailed reasons).',
}

# Default subjects per template
SUBJECTS = {
    'emails/payout/payout_approved.html': 'WeFund | Your Payout Has Been Approved',
    'emails/payout/payout_rejected.html': 'WeFund | Payout Request Update',
    'emails/payout/payout_request.html': 'WeFund | Payout Request Received',
    'emails/payout/payout_limit_reached.html': 'WeFund | Payout Limit Reached',
    'emails/payout/extended_review.html': 'WeFund | Your Payout Is Under Extended Review',
    'emails/challenge/funded_account_created.html': 'WeFund | Your Funded Account Is Ready',
    'emails/challenge/phase2_started.html': 'WeFund | Phase 2 Has Started',
    'emails/challenge/phase_passed.html': 'WeFund | Congratulations! Phase Passed',
    'emails/competition/registration_success.html': 'WeFund | Competition Registration Confirmed',
    'emails/competition/competition_winner.html': 'WeFund | Congratulations, You Won!',
    'emails/competition/competition_loser.html': 'WeFund | Competition Results',
    'emails/crm/reset_password.html': 'WeFund | Password Reset Request',
    'emails/crm/trader_credentials.html': 'WeFund | Your Trading Account Credentials',
    'emails/migration/user_credentials.html': 'WeFund | Important: Migration to Our New Platform',
    'emails/migration/broker_migration.html': 'WeFund | Welcome to Your Upgraded Trading Experience',
    'emails/bulk_import/new_client_challenge.html': 'WeFund | Welcome to Your Challenge',
    'emails/bulk_import/existing_client_challenge.html': 'WeFund | New Challenge Enrollment',
    'emails/breach/hard_breach.html': 'WeFund | Account Breach Notification',
    'emails/certificates/challenge_certificate.html': 'WeFund | Your Challenge Certificate',
    'emails/ea_submission/ea_request_submitted.html': 'WeFund | EA Request Received',
    'emails/ea_submission/ea_request_approved.html': 'WeFund | EA Request Approved',
    'emails/ea_submission/ea_request_rejected.html': 'WeFund | EA Request Update',
    'emails/password_reset.html': 'WeFund | Password Reset Request',
    'emails/password_reset_confirmation.html': 'WeFund | Your Password Has Been Changed',
    'emails/otp_email.html': 'WeFund | Your Verification Code',
    'emails/user_credentials.html': 'WeFund | Your Account Credentials',
    'emails/affiliate_credentials.html': 'WeFund | Your Affiliate Account Credentials',
    'emails/automation/payouts/payout_rejected.html': 'WeFund | Payout Request Update',
    'emails/automation/payouts/payout_rejected_v2.html': 'WeFund | Payout Request Update',
}

# Sample context values for preview rendering
SAMPLE_CONTEXTS = {
    'emails/payout/payout_approved.html': {
        'trader_name': 'John Doe', 'amount': '$5,000.00', 'released_fund': '$4,500.00',
        'status': 'approved', 'reviewed_at': '2026-01-15 14:30 UTC',
        'is_custom_amount': False, 'exclude_amount': '', 'exclude_reason': '',
    },
    'emails/payout/payout_rejected.html': {
        'trader_name': 'John Doe', 'amount': '$5,000.00', 'status': 'rejected',
        'reason': 'Insufficient trading days.', 'reviewed_at': '2026-01-15 14:30 UTC',
    },
    'emails/payout/payout_request.html': {
        'trader_name': 'John Doe', 'amount': '$5,000.00', 'method': 'Bank Transfer',
        'payout_id': 'PAY-00123',
    },
    'emails/payout/payout_limit_reached.html': {
        'trader_name': 'John Doe', 'challenge_name': '$50K Evaluation',
        'total_paid': '$10,000.00', 'max_payouts': 3,
    },
    'emails/payout/extended_review.html': {
        'full_name': 'John Doe', 'amount': '$5,000.00', 'days': 7,
        'extended_until': '2026-01-22', 'dashboard_url': 'https://dashboard.we-fund.com/withdrawl',
    },
    'emails/challenge/funded_account_created.html': {
        'full_name': 'John Doe', 'username': 'john_doe_001', 'account_size': '$50,000.00',
        'mt5_login': '5001234', 'mt5_password': 'demo_pass',
    },
    'emails/challenge/phase2_started.html': {
        'full_name': 'John Doe', 'phase_name': 'Phase 2', 'account_size': '$50,000.00',
    },
    'emails/challenge/phase_passed.html': {
        'full_name': 'John Doe', 'phase_name': 'Phase 1', 'username': 'john_doe_001',
        'account_size': '$50,000.00', 'status': 'Passed',
    },
    'emails/competition/registration_success.html': {
        'user': type('obj', (), {'first_name': 'John', 'email': 'john@example.com'})(),
        'competition': type('obj', (), {'name': 'Monthly Trading Cup', 'start_date': '2026-02-01'})(),
        'mt5_login': '5001234', 'mt5_password': 'demo_pass',
    },
    'emails/competition/competition_winner.html': {
        'user': type('obj', (), {'first_name': 'John'})(),
        'competition': type('obj', (), {'name': 'Monthly Trading Cup'})(),
        'rank': 1, 'growth_percent': '15.2', 'prize_text': '$1,000',
        'brand_name': 'WeFund',
    },
    'emails/competition/competition_loser.html': {
        'user': type('obj', (), {'first_name': 'John'})(),
        'competition': type('obj', (), {'name': 'Monthly Trading Cup'})(),
        'rank': 15, 'growth_percent': '3.5', 'brand_name': 'WeFund',
    },
    'emails/crm/reset_password.html': {
        'full_name': 'Admin User', 'reset_link': 'https://crm.we-fund.com/reset?token=sample',
    },
    'emails/crm/trader_credentials.html': {
        'full_name': 'John Doe', 'email': 'john@example.com',
        'password': 'temp_password_123', 'mt5_login': '5001234', 'mt5_password': 'demo_pass',
    },
    'emails/migration/user_credentials.html': {
        'full_name': 'John Doe', 'email': 'john@example.com', 'password': 'migrated_pass_123',
        'dashboard_url': 'https://dashboard.we-fund.com',
    },
    'emails/migration/broker_migration.html': {
        'full_name': 'John Doe', 'mt5_login': '5001234', 'mt5_password': 'new_demo_pass',
        'broker_name': 'New Broker', 'server_name': 'NewBroker-Live',
    },
    'emails/bulk_import/new_client_challenge.html': {
        'full_name': 'John Doe', 'email': 'john@example.com', 'password': 'temp_pass_123',
        'challenge_name': '$50K Evaluation', 'mt5_login': '5001234', 'mt5_password': 'demo_pass',
    },
    'emails/bulk_import/existing_client_challenge.html': {
        'full_name': 'John Doe', 'challenge_name': '$50K Evaluation',
        'mt5_login': '5001234', 'mt5_password': 'demo_pass',
    },
    'emails/breach/hard_breach.html': {
        'full_name': 'John Doe', 'account_login': '5001234',
        'breach_type': 'Daily Loss Limit', 'breach_value': '-5.2%',
    },
    'emails/certificates/challenge_certificate.html': {
        'full_name': 'John Doe', 'challenge_name': '$50K Evaluation', 'completion_date': '2026-01-15',
    },
    'emails/ea_submission/ea_request_submitted.html': {
        'full_name': 'John Doe', 'ea_name': 'TrendFollower EA', 'submission_date': '2026-01-15',
    },
    'emails/ea_submission/ea_request_approved.html': {
        'full_name': 'John Doe', 'ea_name': 'TrendFollower EA',
    },
    'emails/ea_submission/ea_request_rejected.html': {
        'full_name': 'John Doe', 'ea_name': 'TrendFollower EA',
        'reason': 'EA does not meet our risk management requirements.',
    },
    'emails/password_reset.html': {
        'full_name': 'John Doe', 'reset_link': 'https://dashboard.we-fund.com/reset?token=sample',
    },
    'emails/password_reset_confirmation.html': {
        'full_name': 'John Doe',
    },
    'emails/otp_email.html': {
        'otp': '123456', 'expires_minutes': 10, 'user_first_name': 'John',
        'product_name': 'WeFund', 'support_email': 'support@we-fund.com',
        'logo_url': 'https://cdn.we-fund.com/static/logo.png',
        'cta_url': 'https://dashboard.we-fund.com/verify-email',
    },
    'emails/user_credentials.html': {
        'full_name': 'John Doe', 'email': 'john@example.com', 'password': 'temp_pass_123',
        'mt5_login': '5001234', 'mt5_password': 'demo_pass',
    },
    'emails/affiliate_credentials.html': {
        'full_name': 'John Doe', 'email': 'john@example.com', 'password': 'aff_pass_123',
        'affiliate_code': 'AFF-12345',
    },
    'emails/automation/payouts/payout_rejected.html': {
        'trader_name': 'John Doe', 'amount': '$5,000.00',
        'reason': 'Automated risk check failed: inconsistent trading pattern.',
    },
    'emails/automation/payouts/payout_rejected_v2.html': {
        'trader_name': 'John Doe', 'amount': '$5,000.00',
        'reasons': ['Inconsistent lot sizing', 'News trading detected'],
    },
}


def extract_variables(html_content):
    """Extract {{ variable_name }} patterns from template HTML."""
    pattern = r'\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}'
    variables = set(re.findall(pattern, html_content))
    # Filter out Django built-ins like now.year, forloop.counter
    filtered = [v for v in variables if not v.startswith(('forloop.', 'block.'))]
    return sorted(filtered)


def filename_to_name(filename):
    """Convert filename to human-readable name: payout_approved.html → Payout Approved"""
    name = os.path.splitext(filename)[0]
    return name.replace('_', ' ').title()


def path_to_category(rel_path):
    """Derive category from subdirectory."""
    parts = rel_path.replace('\\', '/').split('/')
    # emails/payout/file.html → payout
    # emails/automation/payouts/file.html → automation
    if len(parts) >= 2:
        subdir = parts[1]  # first directory after 'emails/'
        return CATEGORY_MAP.get(subdir, 'auth')
    return 'auth'


class Command(BaseCommand):
    help = 'Seed EmailTemplate records from disk template files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created/updated without writing to DB',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        templates_dir = os.path.join(settings.BASE_DIR, 'templates', 'emails')

        if not os.path.isdir(templates_dir):
            self.stderr.write(self.style.ERROR(f'Templates directory not found: {templates_dir}'))
            return

        created_count = 0
        updated_count = 0

        for root, _dirs, files in os.walk(templates_dir):
            for filename in sorted(files):
                if not filename.endswith('.html'):
                    continue

                abs_path = os.path.join(root, filename)
                rel_path = os.path.relpath(abs_path, os.path.join(settings.BASE_DIR, 'templates'))
                # Normalize to forward slashes
                rel_path = rel_path.replace('\\', '/')

                with open(abs_path, 'r', encoding='utf-8') as f:
                    body_html = f.read()

                # Check for corresponding .txt file
                txt_path = abs_path.replace('.html', '.txt')
                body_text = ''
                if os.path.exists(txt_path):
                    with open(txt_path, 'r', encoding='utf-8') as f:
                        body_text = f.read()

                name = filename_to_name(filename)
                category = path_to_category(rel_path)
                variables = extract_variables(body_html)
                sample_context = SAMPLE_CONTEXTS.get(rel_path, {})
                # Serialize sample_context: strip non-serializable objects
                safe_context = {}
                for k, v in sample_context.items():
                    if isinstance(v, (str, int, float, bool, list, dict, type(None))):
                        safe_context[k] = v
                    else:
                        safe_context[k] = str(v)

                subject = SUBJECTS.get(rel_path, '')
                description = DESCRIPTIONS.get(rel_path, '')

                if dry_run:
                    self.stdout.write(f'  [DRY RUN] {rel_path} → {name} ({category})')
                    continue

                _obj, created = EmailTemplate.objects.update_or_create(
                    template_path=rel_path,
                    defaults={
                        'name': name,
                        'subject': subject,
                        'category': category,
                        'body_html': body_html,
                        'body_text': body_text,
                        'variables': variables,
                        'sample_context': safe_context,
                        'description': description,
                        'is_active': True,
                    },
                )
                if created:
                    created_count += 1
                    self.stdout.write(self.style.SUCCESS(f'  Created: {rel_path}'))
                else:
                    updated_count += 1
                    self.stdout.write(f'  Updated: {rel_path}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDry run complete — no changes made.'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'\nDone! Created: {created_count}, Updated: {updated_count}'
            ))
