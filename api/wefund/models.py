import uuid
import random
from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField
from django.utils import timezone
from storages.backends.ftp import FTPStorage
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.contrib.postgres.fields import ArrayField
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey

# -------------------------------------------------------------------
# 1) Custom User Model
# -------------------------------------------------------------------

class User(AbstractUser):
    """
    - Extends Django's AbstractUser.
    - Adds a 'role' field to distinguish between client/support/affiliate/admin.
    - Adds status flags and two‐factor toggle.
    """
    ROLE_CHOICES = [
        ('client', 'Client'),
        ('support', 'Support'),
        ('affiliate', 'Affiliate'),
        ('risk', 'Risk Analyst'),
        ('admin', 'Admin'),
        ('content_creator', 'Content Creator'),
        ('discord_manager', 'Discord Manager'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('deleted', 'Deleted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='client')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    two_factor_enabled = models.BooleanField(default=False)
    
    TWO_FACTOR_METHOD_CHOICES = [
    ('email', 'Letter at E-mail'),
    ('sms', 'SMS'),
    ('phone_call', 'Phone Call'),
    ('auth_app', 'Authenticator App'),
    ]

    two_factor_method = models.CharField(
        max_length=20,
        choices=TWO_FACTOR_METHOD_CHOICES,
        null=True,
        blank=True,
        help_text='Preferred method for receiving 2FA codes.'
    )
    
    # Optional date of birth
    date_of_birth = models.DateField(
        null=True,
        blank=True,
        help_text='User\'s date of birth (optional).'
    )

    # Optional profile picture
    profile_picture = models.URLField(
    max_length=500,
    null=True,
    blank=True,
    help_text='Publicly accessible URL of the user\'s profile picture (e.g. from BunnyCDN).'
    )
    
     # Optional phone number
    phone = models.CharField(max_length=20, blank=True, null=True)

    # Leaderboard visibility
    hidden_from_leaderboard = models.BooleanField(
        default=False,
        help_text='If True, user is excluded from all public leaderboards.'
    )
    leaderboard_display_name = models.CharField(
        max_length=100, null=True, blank=True,
        help_text='Optional override name shown on leaderboards instead of real name.'
    )

    # RBAC role
    rbac_role = models.ForeignKey(
        'wefund.Role',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='users',
    )

    # Track created/updated timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_client(self):
        return self.role == 'client'

    def is_support(self):
        return self.role == 'support'

    def is_affiliate(self):
        return self.role == 'affiliate'

    def is_risk(self):
        return self.role == 'risk'

    def is_admin_user(self):
        return self.role == 'admin'
    
    def is_content_creator(self):
        return self.role == 'content_creator'

    def is_discord_manager(self):
        return self.role == 'discord_manager'

    def has_perm_code(self, codename):
        if self.is_superuser:
            return True
        if self.rbac_role:
            return self.rbac_role.has_permission(codename)
        return False

    def has_any_perm_code(self, codenames):
        if self.is_superuser:
            return True
        if self.rbac_role:
            return self.rbac_role.has_any_permission(codenames)
        return False

    def get_all_permissions_list(self):
        if self.is_superuser:
            from wefund.rbac_models import Permission
            return list(Permission.objects.values_list('codename', flat=True))
        if self.rbac_role:
            return list(self.rbac_role.permissions.values_list('codename', flat=True))
        return []

    def get_leaderboard_name(self):
        return self.leaderboard_display_name or self.get_full_name() or self.username

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class NotificationSettings(models.Model):
    """
    Stores individual notification preferences for a user.
    Includes system and email notifications.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings'
    )

    # System Notifications
    system_new_challenge = models.BooleanField(default=True)
    system_announcements = models.BooleanField(default=True)
    system_risk_alerts = models.BooleanField(default=True)
    system_community = models.BooleanField(default=True)
    system_platform = models.BooleanField(default=True)

    # Email Notifications
    email_new_challenge = models.BooleanField(default=True)
    email_announcements = models.BooleanField(default=True)
    email_risk_alerts = models.BooleanField(default=True)
    email_community = models.BooleanField(default=True)
    email_platform = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Notification settings for {self.user.username}"

# -------------------------------------------------------------------
# 2) ClientProfile: Only for Users with role='client'
# -------------------------------------------------------------------

class ClientProfile(models.Model):
    """
    - OneToOne with User (role='client').
    - Holds KYC status, referral, and full address/contact in JSON.
    """
    KYC_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_profile'
    )

    kyc_status = models.CharField(
        max_length=20,
        choices=KYC_STATUS_CHOICES,
        default='pending'
    )

    referred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        limit_choices_to={'role': 'affiliate'},
        related_name='referred_clients'
    )

    first_login_completed = models.BooleanField(default=False)
    has_live_account = models.BooleanField(default=False)

    address_info = models.JSONField(
        default=dict,
        help_text="""
        Store full address and contact details in this format:
        {
            "first_name": "",
            "last_name": "",
            "company": "",
            "address_line_1": "",
            "address_line_2": "",
            "city": "",
            "postcode": "",
            "state": "",
            "country": "",
            "email": "",
            "phone": ""
        }
        """
    )

    def __str__(self):
        return f"ClientProfile for {self.user.username}" 


# -------------------------------------------------------------------
# 3) AffiliateProfile: Only for Users with role='affiliate'
# -------------------------------------------------------------------

class AffiliateProfile(models.Model):
    """
    Affiliate Profile:
    - Linked to any user who wishes to become an affiliate.
    - Contains referral and promotional details.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='affiliate_profile'
    )

    referral_code = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        help_text="A unique code/slug that affiliates share with clients."
    )

    approved = models.BooleanField(default=False)

    website_url = models.URLField(
        max_length=300,
        blank=True,
        null=True,
        help_text="Affiliate's website or landing page (optional)."
    )

    promotion_strategy = models.TextField(
        blank=True,
        help_text="How the affiliate plans to promote We-Fund (socials, email, paid ads, etc.)"
    )
    
    manual_tier_override = models.ForeignKey(
        "AffiliateCommissionTier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Admin can manually assign a tier. If set, this overrides auto tiering."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AffiliateProfile for {self.user.username} (Code: {self.referral_code})"

    def save(self, *args, **kwargs):
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        super().save(*args, **kwargs)

    def generate_referral_code(self):
        """Generate a unique referral code like WEF200751"""
        while True:
            code = f"WEF{random.randint(100000, 999999)}"
            if not AffiliateProfile.objects.filter(referral_code=code).exists():
                return code

    @property
    def referral_count(self):
        # Count APPROVED referrals only (so pending ones don't bump tier)
        return self.referrals.filter(commission_status="approved").count()

    @property
    def current_tier(self):
        # Auto tier
        referral_count = self.referral_count
        tiers = AffiliateCommissionTier.objects.order_by("min_referrals")

        auto_tier = None
        for tier in tiers:
            min_ref = tier.min_referrals or 0
            max_ref = tier.max_referrals
            if referral_count >= min_ref and (max_ref is None or referral_count <= max_ref):
                auto_tier = tier
                break

        # Manual override exists?
        manual = self.manual_tier_override

        if manual and auto_tier:
            # ✅ Return whichever is HIGHER (based on min_referrals)
            return manual if manual.min_referrals >= auto_tier.min_referrals else auto_tier

        # If one exists return it
        return manual or auto_tier

    @property
    def auto_tier(self):
        referral_count = self.referral_count
        tiers = AffiliateCommissionTier.objects.order_by("min_referrals")

        for tier in tiers:
            min_ref = tier.min_referrals or 0
            max_ref = tier.max_referrals
            if referral_count >= min_ref and (max_ref is None or referral_count <= max_ref):
                return tier

        return None
    
    @property
    def effective_commission_rate(self):
        """
        Returns the effective commission rate for this affiliate:
        1️ Uses custom commission if active.
        2️ Falls back to the current tier's rate.
        3️ Defaults to 0.00 if none.
        """
        custom = getattr(self, "custom_commission", None)
        if custom and custom.is_active:
            if custom.commission_rate:
                return custom.commission_rate

        tier = self.current_tier
        if tier:
            return tier.commission_rate

        return Decimal("0.00")

    @property
    def effective_fixed_amount(self):
        """
        Returns the effective fixed per-referral commission if a custom one is set.
        Otherwise returns None (percentage-based commission applies).
        """
        custom = getattr(self, "custom_commission", None)
        if custom and custom.is_active and custom.fixed_amount_per_referral:
            return custom.fixed_amount_per_referral
        return None

# -------------------------------------------------------------------
# 4) SupportProfile & RiskProfile (Optional)
# -------------------------------------------------------------------
# If "support" or "risk" roles need additional fields, you can add them similarly:
#
# class SupportProfile(models.Model):
#     user = models.OneToOneField(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='support_profile'
#     )
#     # e.g. additional permissions, department, phone_ext, etc.
# 
# class RiskProfile(models.Model):
#     user = models.OneToOneField(
#         settings.AUTH_USER_MODEL,
#         on_delete=models.CASCADE,
#         related_name='risk_profile'
#     )
#     # e.g. max_accounts_to_monitor, skill_level, etc.
#
# For now, we assume support/risk/admin do not need extra fields beyond role.


# -------------------------------------------------------------------
# 5) Signals: Auto‐create Profiles Based on Role
# -------------------------------------------------------------------

from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_related_profile(sender, instance: User, created, **kwargs):
    """
    When a User is created, if their role is 'client' or 'affiliate',
    automatically create the corresponding profile object.
    """
    if created:
        if instance.role == 'client':
            ClientProfile.objects.create(user=instance)
        elif instance.role == 'affiliate':
            # Generate WEF###### referral code
            def generate_referral_code():
                while True:
                    code = f"WEF{random.randint(100000, 999999)}"
                    if not AffiliateProfile.objects.filter(referral_code=code).exists():
                        return code

            code = generate_referral_code()
            AffiliateProfile.objects.create(user=instance, referral_code=code)


@receiver(post_save, sender=User)
def save_related_profile(sender, instance: User, **kwargs):
    """
    Ensure that when a User is saved, the related profile is also saved.
    """
    if instance.role == 'client' and hasattr(instance, 'client_profile'):
        instance.client_profile.save()
    if instance.role == 'affiliate' and hasattr(instance, 'affiliate_profile'):
        instance.affiliate_profile.save()


# -------------------------------------------------------------------
# 6) (Optional) KYC Document Model
# -------------------------------------------------------------------

class ClientKYC(models.Model):
    """
    Stores detailed KYC session info for a client, including Rise invite tracking and webhook responses.
    """
    KYC_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    client = models.OneToOneField(
        ClientProfile,
        on_delete=models.CASCADE,
        related_name='kyc_session'
    )

    # Session & metadata
    session_id = models.CharField(max_length=255, blank=True, null=True)
    session_link = models.URLField(max_length=500, blank=True, null=True)
    initiate_date = models.DateTimeField(auto_now_add=True)

    # Operator/admin info
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='kyc_handled_sessions'
    )
    operator_remark = models.TextField(blank=True, null=True)

    # Optional KYC note (from client or system)
    note = models.TextField(blank=True, null=True)

    # KYC status
    status = models.CharField(
        max_length=20,
        choices=KYC_STATUS_CHOICES,
        default='pending'
    )

    # --- Rise Invite Tracking ---
    rise_invite_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="The unique Rise invite identifier, if created"
    )
    rise_invite_sent = models.BooleanField(default=False)
    rise_invite_accepted = models.BooleanField(default=False)
    rise_api_response = models.JSONField(blank=True, null=True)
    rise_webhook_response = models.JSONField(blank=True, null=True, help_text="Stores the webhook payload from Rise updates")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"KYC Session for {self.client.user.username} ({self.status})"


# -------------------------------------------------------------------
# 7) (Optional) AffiliateReferral: Track each referral event
# -------------------------------------------------------------------

class AffiliateReferral(models.Model):
    """
    - Tracks each successful referral from an affiliate to a client.
    - Multiple referrals can exist per client (e.g. multiple challenge purchases).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    affiliate = models.ForeignKey(
        AffiliateProfile,
        on_delete=models.CASCADE,
        related_name='referrals'
    )

    referred_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='affiliate_referrals'
    )

    date_referred = models.DateTimeField(default=timezone.now)

    challenge_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of the challenge the referred user joined (optional)."
    )

    commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    commission_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('processing', 'Processing'),
            ('rejected', 'Rejected'),
        ],
        default='pending',
        help_text="Admin approval status of the commission."
    )

    note = models.TextField(
        blank=True,
        help_text="Optional internal notes about this referral."
    )

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)


    def __str__(self):
        return f"{self.affiliate.user.username} → {self.referred_user.username}"

class AffiliateClick(models.Model):
    referral_code = models.CharField(max_length=32, db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)


# -------------------------------------------------------------------
# 8) (Optional) Staff Profiles (Support/Risk/Admin) 
#     – only if they need extra fields beyond just 'role'
# -------------------------------------------------------------------

class SupportProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_profile'
    )
    # e.g., phone extension, team assignment, etc.
    phone_extension = models.CharField(max_length=10, null=True, blank=True)

    def __str__(self):
        return f"SupportProfile for {self.user.username}"


class RiskProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='risk_profile'
    )
    # e.g., maximum accounts monitored, risk_threshold, etc.
    risk_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"RiskProfile for {self.user.username}"
    
class EmailOTP(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    def is_expired(self):
        return timezone.now() > self.expires_at

    @staticmethod
    def generate_otp():
        return f"{random.randint(100000, 999999)}"    
    
class ChallengeProduct(models.Model):
    """
    Defines a challenge product that users can enroll in — e.g., 1-step or 2-step with different account sizes.
    """
    CHALLENGE_TYPE_CHOICES = [
        ('one_step', '1-Step'),
        ('two_step', '2-Step'),
    ]

    name = models.CharField(max_length=100)  # e.g., "1-Step - $10,000", "2-Step - $100,000"
    challenge_type = models.CharField(max_length=20, choices=CHALLENGE_TYPE_CHOICES)
    account_size = models.DecimalField(max_digits=12, decimal_places=2, help_text="Account size in USD")
    
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, help_text="Fee to join the challenge")
    max_daily_loss = models.DecimalField(max_digits=10, decimal_places=2)
    max_total_loss = models.DecimalField(max_digits=10, decimal_places=2)
    profit_target_phase_1 = models.DecimalField(max_digits=6, decimal_places=2)
    profit_target_phase_2 = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    # You can use JSONField if you want more flexible rule config
    rules = models.JSONField(blank=True, default=dict, help_text="Optional challenge rules/config")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Challenge(models.Model):
    STEP_CHOICES = [
        ('1-step', '1 Step'),
        ('2-step', '2 Step'),
    ]

    name = models.CharField(max_length=100)
    step_type = models.CharField(max_length=10, choices=STEP_CHOICES)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.step_type})"


class ChallengePhase(models.Model):
    PHASE_CHOICES = [
        ('phase-1', 'Phase 1'),
        ('phase-2', 'Phase 2'),
        ('live-trader', 'Live Trader'),
    ]

    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name="phases")
    phase_type = models.CharField(max_length=20, choices=PHASE_CHOICES)
    trading_period = models.CharField(max_length=50, default="Unlimited")
    min_trading_days = models.CharField(max_length=20, default="0")  # Can be "Unlimited" or int
    max_daily_loss = models.DecimalField(max_digits=5, decimal_places=2)  # e.g. 4.00 for 4%
    max_loss = models.DecimalField(max_digits=5, decimal_places=2)  # e.g. 8.00 for 8%
    profit_target = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Leave blank if not applicable"
    )

    class Meta:
        unique_together = ('challenge', 'phase_type')

    def __str__(self):
        return f"{self.challenge.name} - {self.get_phase_type_display()}"
    

    
class Order(models.Model):
    """
    Stores WooCommerce or external order information.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('failed', 'Failed'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
        ('partial', 'Partially Paid'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        help_text="User (if matched) in the system"
    )

    date_created = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')

    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField()
    customer_ip = models.GenericIPAddressField(null=True, blank=True)

    billing_address = models.JSONField(
        default=dict,
        help_text="""
        Store full billing address and contact details in this format:
        {
            "first_name": "",
            "last_name": "",
            "company": "",
            "address_line_1": "",
            "address_line_2": "",
            "city": "",
            "postcode": "",
            "state": "",
            "country": "",
            "email": "",
            "phone": ""
        }
        """
    )

    product_name = models.CharField(max_length=255)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    total_usd = models.DecimalField(max_digits=12, decimal_places=2)

    items_subtotal_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    coupons_discount_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    order_total_usd = models.DecimalField(max_digits=12, decimal_places=2)
    paid_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)

    coupon_codes = models.JSONField(
        default=list,
        blank=True,
        help_text="List of applied coupon codes"
    )

    payment_method = models.CharField(max_length=100)

    raw_data = models.JSONField(
        default=dict,
        help_text="Complete raw order payload from WooCommerce or external source"
    )
    
    # === 🆕 MT5 Fields ===

    mt5_payload_sent = models.JSONField(
        default=dict,
        blank=True,
        help_text="Payload sent to MT5 AddUser API"
    )

    mt5_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Raw response received from MT5 AddUser API"
    )

    mt5_account_id = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="MT5 account login ID returned by MT5 API"
    )

    mt5_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="MT5 master password generated (not hashed)"
    )

    mt5_investor_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="MT5 investor (read-only) password generated"
    )

    plaintext_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Plaintext login password for user account (not hashed, for email only)"
    )
    
     # === 🆕 WooCommerce Identifiers ===
    woo_order_id = models.PositiveIntegerField(unique=True, null=True, blank=True)
    woo_order_number = models.CharField(max_length=100, blank=True)
    woo_order_key = models.CharField(max_length=100, blank=True)
    woo_customer_id = models.PositiveIntegerField(null=True, blank=True)

    # === 🆕 Woo Metadata & Tracking ===
    tracking_metadata = models.JSONField(default=dict, blank=True)
    currency = models.CharField(max_length=10, default="USD")
    transaction_id = models.CharField(max_length=100, blank=True)

    # === 🆕 Challenge/Account Metadata ===
    challenge_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Parent product or challenge name"
    )
    challenge_broker_type = models.CharField(
        max_length=20,
        blank=True,
        help_text="Broker type from product metadata, e.g., 'mt5'"
    )
    challenge_account_size = models.CharField(
        max_length=20,
        blank=True,
        help_text="Account size string, e.g., '10000' or '$10,000'"
    )
    
    # === 🆕 Affiliate Tracking ===
    referral_code = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text="Affiliate referral code used for this order, if any"
    )
    affiliate = models.ForeignKey(
        "AffiliateProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        help_text="AffiliateProfile that referred this user/order"
    )

    def __str__(self):
        return f"Order #{self.id} by {self.customer_name or self.user}"

class ChallengeEnrollment(models.Model):
    STATUS_CHOICES = [
        ('phase_1_in_progress', 'Phase 1 - In Progress'),
        ('phase_1_passed', 'Phase 1 - Passed'),
        ('awaiting_payment', 'Awaiting Payment'),
        ('awaiting_kyc', 'Awaiting KYC'),
        ('phase_2_in_progress', 'Phase 2 - In Progress'),
        ('phase_2_passed', 'Phase 2 - Passed'),
        ('live_in_progress', 'Live - In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('payout_limit_reached', 'Payout Limit Reached'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('standard', 'Standard'),
        ('pay_after_pass', 'Pay After Pass'),
        ('instant_funding', 'Instant Funding'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(ClientProfile, on_delete=models.CASCADE, related_name='challenge_enrollments')
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='enrollments')
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL)

    account_size = models.DecimalField(
    max_digits=12,
    decimal_places=2,
    default=10000.00,  # TEMP: Only for migration
    help_text="Account size selected (e.g. 50000.00)"
    )
    currency = models.CharField(max_length=10, default="USD", help_text="Currency of the account")

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='phase_1_in_progress')
    payment_type = models.CharField(
        max_length=20, choices=PAYMENT_TYPE_CHOICES, default='standard',
        help_text="'pay_after_pass' means client paid entry fee only; full payment due after passing"
    )

    start_date = models.DateField(auto_now_add=True)
    completed_date = models.DateField(null=True, blank=True)
    live_start_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    # === 🆕 MT5 Integration Fields ===
    broker_type = models.CharField(
        max_length=10,
        blank=True,
        help_text="Broker type, e.g., 'mt5', 'mt4'"
    )
    mt5_account_id = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="MT5 account login ID"
    )
    mt5_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="MT5 master password (not hashed)"
    )
    mt5_investor_password = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="MT5 investor (read-only) password"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = []
        
    def get_current_phase_type(self):
        """
        Returns the phase_type value matching ChallengePhase.PHASE_CHOICES.
        """
        if self.status.startswith("phase_1"):
            return "phase-1"
        elif self.status == "awaiting_payment":
            return "phase-1"  # PAP: still in phase-1 context while awaiting payment
        elif self.status == "awaiting_kyc":
            return "live-trader"  # Instant funding: account is live-tier, waiting for KYC to enable trading
        elif self.status.startswith("phase_2"):
            return "phase-2"
        elif self.status.startswith("live"):
            return "live-trader"
        elif self.status in ["failed", "completed", "payout_limit_reached"]:
            return None  # No active phase
        else:
            raise ValueError(f"Unknown enrollment status: {self.status}")
    

    def __str__(self):
        return f"{self.client.user.get_full_name()} - {self.challenge.name} - ${self.account_size}"
    
class ChallengePhaseGroupMapping(models.Model):
    """
    Maps each ChallengePhase to an MT5 group name.
    Example: Phase 1 -> demo\WEF\Group-1
    """

    challenge_phase = models.OneToOneField(
        ChallengePhase,
        on_delete=models.CASCADE,
        related_name="group_mapping"
    )
    mt5_group = models.CharField(
        max_length=100,
        help_text="MT5 group name as in MT5 'groups' table (e.g. demo\\WEF\\Group-1)"
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Challenge Phase Group Mapping"
        verbose_name_plural = "Challenge Phase Group Mappings"

    def __str__(self):
        return f"{self.challenge_phase} -> {self.mt5_group}"    
    
class Offer(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    feature_image = models.URLField(blank=True, null=True)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def is_current(self):
        today = timezone.now().date()
        return self.is_active and self.start_date <= today <= self.end_date
    
class Coupon(models.Model):
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name='coupons')
    code = models.CharField(max_length=50, unique=True)
    discount_percent = models.PositiveIntegerField(help_text="Discount percentage (e.g., 15 for 15%)")
    usage_limit_per_user = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.code} ({self.discount_percent}% off)"
    
class MT5Trade(models.Model):
    account_id = models.BigIntegerField(db_index=True)  # MT5 Account ID
    order = models.BigIntegerField(unique=True)  # Ticket # (Order ID)

    # Trade details
    timestamp = models.DateTimeField()  # Effective time of order
    symbol = models.CharField(max_length=20)
    digits = models.IntegerField()
    cmd = models.IntegerField()  # MT5 trade command (0=buy, 1=sell, etc.)
    volume = models.FloatField()  # In lots or units
    open_time = models.DateTimeField()
    open_price = models.DecimalField(max_digits=15, decimal_places=6)
    close_time = models.DateTimeField()
    close_price = models.DecimalField(max_digits=15, decimal_places=6)

    # Stop loss & take profit
    sl = models.DecimalField(max_digits=15, decimal_places=6)
    tp = models.DecimalField(max_digits=15, decimal_places=6)

    # Commission & finance
    commission = models.DecimalField(max_digits=10, decimal_places=2)
    commission_agent = models.DecimalField(max_digits=10, decimal_places=2)
    storage = models.DecimalField(max_digits=10, decimal_places=2)
    profit = models.DecimalField(max_digits=15, decimal_places=2)
    taxes = models.DecimalField(max_digits=10, decimal_places=2)

    # Other MT5-specific fields
    value_date = models.BigIntegerField(default=0)
    expiration = models.BigIntegerField(default=0)
    conv_reserv = models.BigIntegerField(default=0)
    open_conv_rate = models.DecimalField(max_digits=15, decimal_places=6)
    close_conv_rate = models.DecimalField(max_digits=15, decimal_places=6)
    magic = models.BigIntegerField(default=0)
    comment = models.CharField(max_length=255, blank=True)
    spread = models.DecimalField(max_digits=10, decimal_places=2)
    margin_rate = models.DecimalField(max_digits=10, decimal_places=2)
    
    is_closed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["account_id", "order"]),
            models.Index(fields=["symbol"]),
            models.Index(fields=["open_time"]),
            models.Index(fields=["close_time"]),
        ]
        ordering = ['-close_time']

    def __str__(self):
        return f"MT5 Order #{self.order} ({self.symbol})"
    
class TraderPayout(models.Model):
    """
    Represents a payout request made by a trader (client).
    Tracks profit, profit share, and net amount due, including method and status.
    """
    PAYOUT_METHOD_CHOICES = [
        ('paypal', 'PayPal'),
        ('bank', 'Bank Transfer'),
        ('crypto', 'Crypto'),
        ('rise', 'Rise Payout'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
        ('extended_review', 'Extended Review'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    trader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payouts',
        limit_choices_to={'role': 'client'},
        help_text='Client requesting payout'
    )
    
    challenge_enrollment = models.ForeignKey(
        'ChallengeEnrollment',
        on_delete=models.CASCADE,
        related_name='payouts',
        help_text='The challenge enrollment (account) this payout is for',
        null=True,  # 👈 allow nulls temporarily
        blank=True
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text='Requested payout amount (usually equal to net profit)'
    )

    profit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text='Total trading profit earned during the payout period'
    )

    profit_share = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=80.00,
        help_text='Profit share percentage agreed for the trader (e.g., 80%)'
    )

    net_profit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text='Net amount due to trader after applying profit share'
    )
    
    released_fund = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text='Final total amount actually released to the trader'
    )

    method = models.CharField(
        max_length=20,
        choices=PAYOUT_METHOD_CHOICES,
        help_text='Chosen payout method'
    )

    method_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="""Details for the selected payout method, e.g.:
        {
            "paypal_email": "",
            "bank_account": "",
            "crypto_wallet": "",
            "bank_name": "",
            ...
        }"""
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Payout request status'
    )

    admin_note = models.TextField(
        blank=True,
        null=True,
        help_text='Optional internal note from admin (e.g., rejection reason)'
    )
    
    rejection_reason = models.TextField(blank=True, null=True, help_text='Reason for rejection, if status is rejected')
    
    # NEW optional fields
    is_custom_amount = models.BooleanField(
        default=False,
        help_text='Indicates if a custom payout amount was manually entered'
    )
    exclude_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Amount to exclude from payout (optional)'
    )
    exclude_reason = models.TextField(
        null=True,
        blank=True,
        help_text='Reason for excluding amount (optional)'
    )

    conversion_metadata = models.JSONField(null=True, blank=True)

    requested_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Extended review window (risk extension)
    extended_review_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When extended review ends and returns to pending.'
    )
    extended_review_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of business days applied for extended review.'
    )

    class Meta:
        ordering = ['-requested_at']
        verbose_name = "Trader Payout"
        verbose_name_plural = "Trader Payouts"

    def save(self, *args, **kwargs):
        # 1. Detect creation vs update
        is_new = self._state.adding

        if not is_new:
            # 2. Fetch original DB values
            original = TraderPayout.objects.get(pk=self.pk)

            # 3. HARD LOCK critical money fields
            if original.profit != self.profit:
                raise ValidationError("Profit is locked and cannot be modified after payout creation.")

            if original.net_profit != self.net_profit:
                raise ValidationError("Net profit is locked and cannot be modified after payout creation.")

            if original.amount != self.amount:
                raise ValidationError("Payout amount is locked and cannot be modified after payout creation.")

        # 4. Only auto-calculate on FIRST CREATION
        if is_new:
            self.net_profit = (Decimal(self.profit) * Decimal(self.profit_share)) / Decimal("100")

            if not self.amount or self.amount == Decimal("0.00"):
                self.amount = self.net_profit

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Payout {self.id} - {self.trader.username} - ${self.amount:.2f} [{self.status}]"
        

    def set_extended_review(self, business_days: int = 10, tz=None):
        """
        Put payout into extended review for given business days (default 10).
        Computes business-day deadline (weekends excluded).
        """
        from django.utils import timezone as dj_tz
        from datetime import timedelta

        tz = tz or dj_tz.get_current_timezone()

        def add_business_days(start, days):
            d = start
            added = 0
            while added < days:
                d += timedelta(days=1)
                if d.weekday() < 5:  # Mon-Fri
                    added += 1
            return d

        now_local = dj_tz.now().astimezone(tz)
        self.status = 'extended_review'
        self.extended_review_days = business_days
        self.extended_review_until = add_business_days(now_local, business_days)
    
class Certificate(models.Model):
    """
    Stores BunnyCDN URLs to certificate files (PDF or Image) for a trader.
    Types: Phase Pass, Payout Certificate, etc.
    """

    CERTIFICATE_TYPE_CHOICES = [
        ('phase_pass', 'Challenge Phase Pass'),
        ('payout', 'Payout Certificate'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='certificates',
        limit_choices_to={'role': 'client'},
        help_text='Client who owns this certificate'
    )

    certificate_type = models.CharField(
        max_length=30,
        choices=CERTIFICATE_TYPE_CHOICES,
        help_text='Type of certificate'
    )

    title = models.CharField(
        max_length=255,
        help_text='Custom title for the certificate (e.g., "Phase 1 Passed - $50K Challenge")'
    )

    enrollment = models.ForeignKey(
        'ChallengeEnrollment',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='certificates',
        help_text='Link if certificate is tied to a challenge'
    )

    payout = models.ForeignKey(
        'TraderPayout',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='certificates',
        help_text='Link if certificate is tied to a payout'
    )

    image_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Public CDN URL for certificate image'
    )

    pdf_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Public CDN URL for certificate PDF'
    )

    issued_date = models.DateField(auto_now_add=True)
    expiry_date = models.DateField(null=True, blank=True)

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional info or data (e.g., certificate version)'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issued_date']
        verbose_name = "Certificate"
        verbose_name_plural = "Certificates"

    def __str__(self):
        return f"{self.title} - {self.user.username}"

    def clean(self):
        if not self.image_url and not self.pdf_url:
            raise ValidationError("At least one file URL (image or PDF) must be provided.")
        
class ClientPaymentMethod(models.Model):
    """
    Stores multiple payout methods for a client (PayPal, bank, crypto, etc).
    Each client can have many saved payment methods.
    """

    PAYMENT_TYPE_CHOICES = [
        ('paypal', 'PayPal'),
        ('bank', 'Bank Transfer'),
        ('crypto', 'Crypto Wallet'),
        ('rise', 'Rise Payout'),
    ]

    CRYPTO_TYPE_CHOICES = [
        ('usdt_trc20', 'USDT - TRC20'),
        ('usdt_erc20', 'USDT - ERC20'),
        ('usdc_erc20', 'USDC - ERC20'),
        ('btc', 'Bitcoin (BTC)'),
        ('eth', 'Ethereum (ETH)'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_methods',
        limit_choices_to={'role': 'client'},
        help_text='Client to whom this payment method belongs'
    )

    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        help_text='Type of payment method (PayPal, Bank, Crypto)'
    )

    # === PayPal Fields ===
    paypal_email = models.EmailField(
        null=True,
        blank=True,
        help_text='PayPal account email address'
    )
    
    # === Rise Fields ===
    rise_email = models.EmailField(
        null=True,
        blank=True,
        help_text='Rise account email for payout'
    )

    # === Bank Transfer Fields (UAE-Compatible) ===
    bank_account_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_number = models.CharField(max_length=100, blank=True, null=True)
    iban = models.CharField(max_length=34, blank=True, null=True)
    swift_code = models.CharField(max_length=11, blank=True, null=True)
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_branch = models.CharField(max_length=255, blank=True, null=True)
    bank_country = models.CharField(max_length=100, blank=True, null=True)
    bank_currency = models.CharField(max_length=10, blank=True, null=True)

    # === Crypto Wallet Fields ===
    crypto_type = models.CharField(
        max_length=20,
        choices=CRYPTO_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text='Type of crypto wallet (e.g., USDT TRC20)'
    )
    crypto_wallet_address = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Crypto wallet address'
    )

    is_default = models.BooleanField(
        default=False,
        help_text='Is this the default payment method?'
    )

    label = models.CharField(
        max_length=100,
        blank=True,
        help_text='Optional label like "My Binance Wallet" or "Main Bank Account"'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Client Payment Method"
        verbose_name_plural = "Client Payment Methods"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client.username} - {self.payment_type.upper()} ({self.label or 'No Label'})"

class PayoutPolicy(models.Model):
    """
    Payout rules defined per Challenge.
    """
    challenge = models.OneToOneField(
        "Challenge",
        on_delete=models.CASCADE,
        related_name="payout_policy"
    )

    # Delays & cycles
    first_payout_delay_days = models.PositiveIntegerField(default=14)
    subsequent_cycle_days   = models.PositiveIntegerField(default=14)

    # Minimum net amount (after split) trader must withdraw
    min_net_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("50.00"))

    # Base share used if no tier matches
    base_share_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("80.00"))

    is_active = models.BooleanField(default=True)

    max_payouts = models.PositiveIntegerField(
        default=0,
        help_text="Maximum number of paid payouts allowed per enrollment. 0 = unlimited."
    )

    min_trading_days = models.PositiveIntegerField(
        default=0,
        help_text="Minimum unique trading days required before payout request. 0 = no restriction."
    )

    def __str__(self):
        return f"Policy for {self.challenge.name} ({self.challenge.step_type})"

    def get_share_for(self, payout_number: int) -> Decimal:
        tier = (self.split_tiers
                  .filter(from_payout_number__lte=payout_number)
                  .filter(Q(to_payout_number__gte=payout_number) | Q(to_payout_number__isnull=True))
                  .order_by('from_payout_number')
                  .first())
        return tier.share_percent if tier else self.base_share_percent


class PayoutSplitTier(models.Model):
    policy = models.ForeignKey(PayoutPolicy, on_delete=models.CASCADE, related_name="split_tiers")
    from_payout_number = models.PositiveIntegerField(help_text="Inclusive; starts at 1")
    to_payout_number   = models.PositiveIntegerField(null=True, blank=True, help_text="Inclusive; null = ∞")
    share_percent      = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        ordering = ("from_payout_number",)
    
class PayoutConfiguration(models.Model):
    PAYMENT_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('biweekly', 'Biweekly'),
        ('custom_days', 'Custom Days in Month'),
        ('custom_interval', 'Custom Interval'),
    ]

    CONFIG_TYPE_CHOICES = [
        ('default', 'Default (Policy Driven)'),
        ('custom', 'Custom (Client Override)'),
    ]

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payout_configs',
        limit_choices_to={'role': 'client'}
    )

    enrollment = models.OneToOneField(
        'ChallengeEnrollment',
        on_delete=models.CASCADE,
        related_name='payout_config',
        null=True, blank=True
    )

    config_type = models.CharField(
        max_length=10,
        choices=CONFIG_TYPE_CHOICES,
        default='default',
        help_text='Whether this config follows system default policy or overrides with custom values'
    )

    live_trading_start_date = models.DateField(
        help_text='Date when client started trading on live account'
    )

    # optional overrides (nullable for migration safety)
    profit_share_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Custom fixed profit share % (leave blank to use policy/tier rules)'
    )
    profit_split_from_payout = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Apply profit_share_percent only from this payout number onwards (e.g. 3 for third payout)'
    )

    payment_cycle = models.CharField(
        max_length=20,
        choices=PAYMENT_CYCLE_CHOICES,
        default='monthly',
        help_text='How often the client can request a payout'
    )

    # Custom Interval (every X days)
    custom_cycle_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='If cycle=custom_interval, number of days between payouts'
    )

    # Custom Days in Month
    custom_payout_days = ArrayField(
        models.PositiveSmallIntegerField(),
        null=True, blank=True,
        help_text="If cycle=custom_days, list of days in month (e.g. [5, 20])"
    )

    # new policy-related fields
    first_payout_delay_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Override: days until first payout (if custom)'
    )
    first_payout_delay_minutes = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Exact minutes after purchase for first payout (e.g., 20160 = 14 days)'
    )
    subsequent_cycle_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Override: cycle days after first payout (if custom)'
    )
    min_net_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text='Override: minimum net amount after split (if custom)'
    )
    base_share_percent = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
        help_text='Override: base share percent for custom config'
    )
    min_trading_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Override: minimum trading days before payout (if custom). Null = use policy default.'
    )
    custom_next_withdrawal_datetime = models.DateTimeField(
    null=True,
    blank=True,
    help_text='Optional: Manually set next eligible withdrawal date and time (overrides automatic calculation if provided)'
    )

    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, help_text='Optional notes or admin remarks')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client.username} ({self.config_type})"

    def get_trader_share(self, profit_amount, enrollment=None):
        """
        Calculate trader share based on either custom config or challenge policy.
        """
        # If client has override
        if self.config_type == "custom" and self.profit_share_percent is not None:
            if self.profit_split_from_payout and enrollment:
                # Tiered addon: only apply override from specific payout onwards
                num_previous = enrollment.client.user.payouts.filter(
                    challenge_enrollment=enrollment,
                    status__in=["approved", "paid"]
                ).count()
                current_payout = num_previous + 1
                if current_payout >= self.profit_split_from_payout:
                    share_percent = self.profit_share_percent
                elif hasattr(enrollment.challenge, "payout_policy"):
                    policy = enrollment.challenge.payout_policy
                    share_percent = policy.get_share_for(current_payout)
                else:
                    share_percent = Decimal("80.00")
            else:
                share_percent = self.profit_share_percent

        # Otherwise pull from challenge payout policy
        elif enrollment and hasattr(enrollment.challenge, "payout_policy"):
            policy = enrollment.challenge.payout_policy
            # Figure out which payout number this is
            num_previous = enrollment.client.user.payouts.filter(
                status__in=["approved", "paid"]
            ).count()
            share_percent = policy.get_share_for(num_previous + 1)
        else:
            share_percent = 0

        trader_amount = profit_amount * (share_percent / 100)
        return round(trader_amount, 2)
    
class EventLog(models.Model):
    # --- Main event categories for better filtering ---
    CATEGORY_CHOICES = [
        ("account", "Account"),
        ("profile", "Profile"),
        ("kyc", "KYC / Verification"),
        ("challenge", "Challenge"),
        ("mt5", "MT5 / Trading"),
        ("payout", "Payout"),
        ("certificate", "Certificate"),
        ("affiliate", "Affiliate"),
        ("offer", "Offer / Coupon"),
        ("wallet", "Wallet / Transaction"),
        ("migration", "Data Migration"),
        ("risk", "Risk / Breach"),
        ("wecoins", "WeCoins"),
        ("security", "Security"),
        ("system", "System"),
        ("admin", "Admin"),
        ("whatsapp", "WhatsApp"),
    ]

    ENGINE_CHOICES = [
        ("order", "Order Engine"),
        ("challenge", "Challenge Engine"),
        ("kyc", "KYC Engine"),
        ("risk", "Risk Engine"),
        ("payout", "Payout Engine"),
        ("whatsapp", "WhatsApp Bot"),
        ("voice_agent", "Voice Agent"),
    ]

    EVENT_CHOICES = [
        # --- Account / Profile ---
        ("account_created", "Account Created"),
        ("login_success", "Login Successful"),
        ("login_failed", "Login Failed"),
        ("password_reset_attempt_unknown_email", "Password Reset Attempt (Unknown Email)"),
        ("password_reset_requested", "Password Reset Requested"),
        ("password_reset_success", "Password Reset Successful"),
        ("password_reset_invalid_token", "Password Reset Invalid Token"),
        ("password_changed", "Password Changed"),
        ("email_updated", "Email Updated"),
        ("name_updated", "Name Updated"),
        ("profile_updated", "Profile Updated"),
        ("profile_picture_updated", "Profile Picture Updated"),
        ("payment_method_updated", "Payment Method Updated"),
        ("payment_method_reset", "Payment Methods Reset"),
        ("notification_settings_updated", "Notification Settings Updated"),


        # --- KYC ---
        ("rise_invite_sent", "Rise Invite Sent"),
        ("rise_kyc_approved", "Rise KYC Approved"),
        ("rise_kyc_rejected", "Rise KYC Rejected"),
        ("kyc_initiated", "KYC Initiated"),
        ("kyc_submitted", "KYC Submitted"),
        ("kyc_updated", "KYC Updated"),
        ("kyc_approved", "KYC Approved"),
        ("kyc_rejected", "KYC Rejected"),

        # --- Challenge / Enrollment ---
        ("challenge_purchased", "Challenge Purchased"),
        ("challenge_started", "Challenge Started"),
        ("challenge_completed", "Challenge Completed"),
        ("challenge_failed", "Challenge Failed"),
        ("challenge_refunded", "Challenge Refunded"),
        ("challenge_phase_changed", "Challenge Phase Changed"),
        ("challenge_config_updated", "Challenge Configuration Updated"),
        ("challenge_blocked", "Challenge Blocked"),
        ("challenge_deleted", "Challenge Deleted"),
        ("challenge_transition", "Challenge Transition"),

        # --- MT5 / Trading ---
        ("mt5_account_created", "MT5 Account Created"),
        ("mt5_balance_updated", "MT5 Balance Updated"),
        ("mt5_trade_opened", "MT5 Trade Opened"),
        ("mt5_trade_closed", "MT5 Trade Closed"),
        ("mt5_trading_disabled", "MT5 Trading Disabled"),
        ("mt5_trading_enabled", "MT5 Trading Enabled"),
        ("mt5_deposit", "MT5 Deposit"),
        ("mt5_withdrawal", "MT5 Withdrawal"),
        ("mt5_trades_resynced", "MT5 Trades Re-synced"),
        ("mt5_account_disabled", "MT5 Account Disabled"),
        ("mt5_account_enabled", "MT5 Account Enabled"),
        ("mt5_password_changed", "MT5 Password Changed"),
        ("mt5_account_password_changed", "MT5 Account Password Changed"),
        ("mt5_account_investor_password_changed", "MT5 Investor Password Changed"),
        ("mt5_group_changed", "MT5 Account Group Changed"),
        ("ea_approval_requested", "MT5 EA Approval Requested"),
        ("ea_request_approved", "EA Request Approved"),
        ("ea_request_rejected", "EA Request Rejected"),


        # --- Payouts ---
        ("payout_config_created", "Payout Config Created"),
        ("payout_config_updated", "Payout Config Updated"),
        ("payout_created", "Payout Created"),
        ("payout_requested", "Payout Requested"),
        ("payout_extended", "Payout Review Extended"),
        ("payout_approved", "Payout Approved"),
        ("payout_rejected", "Payout Rejected"),
        ("payout_paid", "Payout Paid"),
        ("payout_ai_triggered", "Payout AI Analysis Triggered"),

        ("certificate_generated", "Certificate Generated"),
        ("challenge_certificate_generated", "Challenge Certificate Generated"),
        ("payout_certificate_generated", "Payout Certificate Generated"),
        ("certificate_updated", "Certificate Updated"),
        ("certificate_deleted", "Certificate Deleted"),


        # --- Affiliates ---
        ("affiliate_created", "Affiliate Created"),
        ("affiliate_profile_updated", "Affiliate Profile Updated"),
        ("affiliate_approved", "Affiliate Approved"),
        ("affiliate_unapproved", "Affiliate Unapproved"),
        ("affiliate_custom_commission_set", "Affiliate Custom Commission Set"),
        ("affiliate_referral_code_assigned", "Affiliate Referral Code Assigned"),
        ("affiliate_tier_overridden", "Affiliate Tier Overridden"),
        ("affiliate_tier_override_removed", "Affiliate Tier Override Removed"),
        ("affiliate_registered", "Affiliate Registered"),
        ("affiliate_sale_recorded", "Affiliate Sale Recorded"),
        ("affiliate_commission_approved", "Affiliate Commission Approved"),
        ("affiliate_tier_upgraded", "Affiliate Tier Upgraded"),
        ("affiliate_payout_requested", "Affiliate Payout Requested"),

        # --- Offers / Coupons ---
        ("offer_created", "Offer Created"),
        ("offer_updated", "Offer Updated"),
        ("offer_deleted", "Offer Deleted"),
        ("offer_expired", "Offer Expired"),
        ("coupon_redeemed", "Coupon Redeemed"),

        # --- Wallet / Transactions ---
        ("wallet_created", "Wallet Created"),
        ("wallet_deposit", "Wallet Deposit"),
        ("wallet_withdrawal", "Wallet Withdrawal"),
        ("wallet_balance_updated", "Wallet Balance Updated"),

        # --- Risk / Breach ---
        ("soft_breach_detected", "Soft Breach Detected"),
        ("hard_breach_detected", "Hard Breach Detected"),
        ("breach_resolved", "Breach Resolved"),
        ("breach_reverted", "Breach Reverted"),

        # --- System / Notifications ---
        ("notification_created", "Notification Created"),
        ("notification_updated", "Notification Updated"),
        ("notification_deleted", "Notification Deleted"),

        # --- Scheduled Notifications ---
        ("scheduled_notification_created", "Scheduled Notification Created"),
        ("scheduled_notification_updated", "Scheduled Notification Updated"),
        ("scheduled_notification_deleted", "Scheduled Notification Deleted"),
        ("scheduled_notification_paused", "Scheduled Notification Paused"),
        ("scheduled_notification_resumed", "Scheduled Notification Resumed"),
        ("scheduled_notification_cancelled", "Scheduled Notification Cancelled"),

        ("challenge_created", "Challenge Created"),
        ("challenge_updated", "Challenge Updated"),
        ("challenge_deleted", "Challenge Deleted"),

        ("challenge_phase_created", "Challenge Phase Created"),
        ("challenge_phase_updated", "Challenge Phase Updated"),
        ("challenge_phase_deleted", "Challenge Phase Deleted"),

        ("payout_policy_created", "Payout Policy Created"),
        ("payout_policy_updated", "Payout Policy Updated"),
        ("payout_policy_deleted", "Payout Policy Deleted"),

        ("payout_split_tier_created", "Payout Split Tier Created"),
        ("payout_split_tier_updated", "Payout Split Tier Updated"),
        ("payout_split_tier_deleted", "Payout Split Tier Deleted"),

        # --- Affiliate Commission Tier Events ---
        ("affiliate_commission_tier_created", "Affiliate Commission Tier Created"),
        ("affiliate_commission_tier_updated", "Affiliate Commission Tier Updated"),
        ("affiliate_commission_tier_deleted", "Affiliate Commission Tier Deleted"),

        # --- Challenge Phase → MT5 Group Mapping ---
        ("challenge_phase_group_mapping_created", "Phase Group Mapping Created"),
        ("challenge_phase_group_mapping_updated", "Phase Group Mapping Updated"),
        ("challenge_phase_group_mapping_deleted", "Phase Group Mapping Deleted"),

        ("wecoins_task_created", "Reward Task Created"),
        ("wecoins_task_updated", "Reward Task Updated"),
        ("wecoins_task_deleted", "Reward Task Deleted"),

        ("wecoins_submission_approved", "Reward Submission Approved"),
        ("wecoins_submission_declined", "Reward Submission Declined"),

        ("wecoins_redeem_item_created", "Redeem Item Created"),
        ("wecoins_redeem_item_updated", "Redeem Item Updated"),
        ("wecoins_redeem_item_deleted", "Redeem Item Deleted"),

        ("wecoins_wallet_adjusted", "Wallet Manually Adjusted"),
        ("wecoins_redeemed", "Item Redeemed by User"),
        ("wecoins_redemption_approved", "Redemption Approved"),
        ("wecoins_redemption_declined", "Redemption Declined"),
        ("wecoins_redemption_fulfilled", "Redemption Fulfilled"),
        ("wecoins_task_submitted", "WeCoins Task Submitted"),
        ("wecoins_beta_requested", "WeCoins Beta Access Requested"),
        ("wecoins_beta_request_approved", "WeCoins Beta Access Approved"),
        ("wecoins_beta_request_declined", "WeCoins Beta Access Declined"),

        ("admin_profile_updated", "Admin Profile Updated"),
        ("admin_profile_picture_updated", "Admin Profile Picture Updated"),

        ("admin_user_created", "Admin User Created"),
        ("admin_user_updated", "Admin User Updated"),
        ("admin_user_deleted", "Admin User Deleted"),

        ("engine_task_started", "Periodic Task Started"),
        ("engine_task_stopped", "Periodic Task Stopped"),
        ("engine_task_schedule_updated", "Periodic Task Schedule Updated"),

        ("engine_process_started", "Engine Process Started"),
        ("engine_process_stopped", "Engine Process Stopped"),
        ("engine_process_restarted", "Engine Process Restarted"),

        ("superuser_password_changed", "Superuser Password Changed"),
        ("admin_login_success", "Admin Login Successful"),
        ("admin_login_failed", "Admin Login Failed"),

        ("migration_row_success", "Migration Row Success"),
        ("migration_row_failed", "Migration Row Failed"),

        ("payout_config_import_success", "Payout Config Import Success"),
        ("payout_config_import_failed", "Payout Config Import Failed"),

        ("mt5_migration_success", "MT5 Account Migration Success"),
        ("mt5_migration_failed", "MT5 Account Migration Failed"),

        ("registration_otp_sent", "Registration OTP Sent"),
        ("otp_verified", "OTP Verified"),
        ("registration_completed", "Registration Completed"),

        # --- WhatsApp ---
        ("whatsapp_conversation_started", "WhatsApp Conversation Started"),
        ("whatsapp_handoff_keyword", "WhatsApp Handoff Keyword Detected"),
        ("whatsapp_handoff_requested", "WhatsApp Handoff Requested"),
        ("whatsapp_lead_captured", "WhatsApp Lead Captured"),
        ("whatsapp_voice_call", "WhatsApp Voice Call"),

        # --- System / Admin ---
        ("system_error", "System Error"),
        ("webhook_received", "Webhook Received"),
        ("admin_action", "Admin Action"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    challenge_enrollment = models.ForeignKey(
    "ChallengeEnrollment",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="event_logs",
    help_text="If this event is linked to a specific challenge enrollment"
    )
    category = models.CharField(
    max_length=50,
    choices=CATEGORY_CHOICES,
    null=True,
    blank=True
    )
    event_type = models.CharField(
        max_length=100,
        choices=EVENT_CHOICES,
        null=True,
        blank=True
    )
    engine = models.CharField(
        max_length=50,
        choices=ENGINE_CHOICES,
        null=True,
        blank=True,
        help_text="Which internal engine triggered this event, if applicable."
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)  # Contextual data
    description = models.TextField(blank=True)  # Optional human-readable text

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["event_type"]),
            models.Index(fields=["category"]),
            models.Index(fields=["timestamp"]),
        ]

    def __str__(self):
        username = self.user.username if self.user else "System"
        return f"[{self.category}] {username} - {self.event_type} @ {self.timestamp:%Y-%m-%d %H:%M}"

    def short_desc(self):
        """Convenience method for dashboards."""
        return self.description or self.event_type.replace("_", " ").title()
    
class EmailLog(models.Model):
    CATEGORY_CHOICES = [
        ("kyc", "KYC / Verification"),
        ("challenge", "Challenge"),
        ("payout", "Payout"),
        ("affiliate", "Affiliate"),
        ("offer", "Offer / Coupon"),
        ("wallet", "Wallet / Transaction"),
        ("system", "System"),
        ("admin", "Admin"),
        ("support", "Support"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        null=True,
        blank=True
    )
    subject = models.CharField(max_length=255)
    to_email = models.EmailField()
    from_email = models.EmailField(null=True, blank=True)
    cc = models.JSONField(default=list, blank=True)
    bcc = models.JSONField(default=list, blank=True)
    body_text = models.TextField(blank=True)
    body_html = models.TextField(blank=True)
    attachments = models.JSONField(default=list, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="queued"
    )
    error_message = models.TextField(blank=True)
    related_event = models.ForeignKey(
        "EventLog",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs"
    )
    metadata = models.JSONField(default=dict, blank=True)
    support_conversation = models.ForeignKey(
        'SupportConversation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )
    support_message = models.ForeignKey(
        'SupportMessage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_log_entries'
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["category"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Email to {self.to_email} - {self.subject} ({self.status})"


class EmailTemplate(models.Model):
    """
    Database-stored email templates with file fallback.
    Admins can edit templates via CRM without code deployment.
    """

    CATEGORY_CHOICES = [
        ('payout', 'Payout'),
        ('challenge', 'Challenge'),
        ('competition', 'Competition'),
        ('crm', 'CRM / Admin'),
        ('migration', 'Migration'),
        ('bulk_import', 'Bulk Import'),
        ('breach', 'Breach'),
        ('certificate', 'Certificate'),
        ('ea_submission', 'EA Submission'),
        ('auth', 'Authentication'),
        ('affiliate', 'Affiliate'),
        ('automation', 'Automation'),
        ('support', 'Support'),
    ]

    template_path = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=500, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    variables = models.JSONField(default=list)
    sample_context = models.JSONField(default=dict)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='modified_email_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.template_path})"


class Notification(models.Model):
    """
    In-app notifications for users and system-wide alerts.
    """

    TYPE_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('kyc', 'KYC Update'),
        ('challenge', 'Challenge Update'),
        ('payout', 'Payout Info'),
        ('system', 'System Alert'),
        ('mention', 'Mention'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        help_text="Null means system-wide/global notification"
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')

    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Optional expiration (used for hiding expired announcements)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Optional link to related objects or pages
    action_url = models.URLField(null=True, blank=True, help_text="Optional link (e.g., /dashboard/payouts/)")

    # Optional image thumbnail
    image_url = models.URLField(max_length=500, null=True, blank=True, help_text="Optional image thumbnail URL")

    # New field: marks a custom notification sent to a specific user
    is_custom = models.BooleanField(null=True, blank=True, help_text="True if this is a custom notification for a single user")

    # New field: marks if it's a global/system-wide notification
    is_global = models.BooleanField(null=True, blank=True, help_text="Marks this notification as global")

    class Meta:
        ordering = ['-created_at']

    def mark_as_read(self):
        self.is_read = True
        self.read_at = timezone.now()
        self.save()

    def is_expired(self):
        return self.expires_at and timezone.now() > self.expires_at

    def __str__(self):
        return f"[{self.type.upper()}] {self.title} ({'User' if self.user else 'System'})"
    
class ScheduledNotification(models.Model):
    """
    Manages notifications that are scheduled for future delivery.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paused", "Paused"),
        ("sent", "Sent"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_notifications",
        help_text="Target user (null = global notification)"
    )

    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Notification.TYPE_CHOICES)
    action_url = models.URLField(null=True, blank=True)
    image_url = models.URLField(max_length=500, null=True, blank=True, help_text="Optional image thumbnail URL")
    expires_at = models.DateTimeField(null=True, blank=True)
    scheduled_for = models.DateTimeField(help_text="Time when notification will be sent")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    celery_task_id = models.CharField(max_length=255, null=True, blank=True, help_text="Celery task ID for management")

    class Meta:
        ordering = ["-scheduled_for"]

    def __str__(self):
        target = self.user.email if self.user else "All Users"
        return f"[{self.status.upper()}] {self.title} → {target} @ {self.scheduled_for}"    
    
class AffiliatePayout(models.Model):
    """
    Represents a payout request or completed payout for an affiliate.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    affiliate = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='affiliate_payouts',
        limit_choices_to={'role': 'affiliate'},
        help_text='The affiliate user requesting or receiving the payout'
    )

    payment_method = models.ForeignKey(
        'ClientPaymentMethod',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='The payment method to use for this payout'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Amount requested or paid (in USD or your system currency)'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text='Current status of the payout request'
    )

    notes = models.TextField(
        blank=True,
        null=True,
        help_text='Admin or system notes about this payout (e.g., reason for rejection)'
    )

    requested_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when the affiliate requested the payout'
    )

    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the payout was approved or marked as paid'
    )

    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='External transaction ID (e.g., from PayPal, bank, crypto)'
    )
    
    wallet_transaction = models.OneToOneField(
        'AffiliateWalletTransaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payout_reference',
        help_text='The wallet transaction that debited this payout amount'
    )

    is_manual = models.BooleanField(
        default=False,
        help_text='Whether this payout was manually created by admin (outside of a user request)'
    )

    class Meta:
        verbose_name = 'Affiliate Payout'
        verbose_name_plural = 'Affiliate Payouts'
        ordering = ['-requested_at']

    def __str__(self):
        return f"Payout ${self.amount} to {self.affiliate.username} - {self.get_status_display()}"
    
class AffiliateWallet(models.Model):
    """
    Wallet for each affiliate to track current available balance.
    """
    affiliate = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='affiliate_wallet',
        limit_choices_to={'role': 'affiliate'},
        help_text='The affiliate who owns this wallet'
    )

    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text='Current wallet balance (available for payout)'
    )

    total_earned = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text='Total commissions earned to date (lifetime)'
    )

    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.affiliate.username}'s Wallet (${self.balance})"
    
class AffiliateWalletTransaction(models.Model):
    """
    Logs every transaction affecting an affiliate's wallet (commission, payout, bonus, etc).
    """

    TRANSACTION_TYPE_CHOICES = [
        ('commission', 'Commission Earned'),
        ('bonus', 'Bonus'),
        ('adjustment', 'Manual Adjustment'),
        ('payout', 'Payout Deducted'),
        ('reversal', 'Reversed/Refunded'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    wallet = models.ForeignKey(
        AffiliateWallet,
        on_delete=models.CASCADE,
        related_name='transactions',
        help_text='Wallet this transaction belongs to'
    )

    transaction_type = models.CharField(
        max_length=20,
        choices=TRANSACTION_TYPE_CHOICES,
        help_text='Type of transaction'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Positive for credit, negative for debit'
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='approved',
        help_text='Transaction status (pending, approved, rejected, etc.)'
    )

    related_payout = models.ForeignKey(
        'AffiliatePayout',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text='Optional: Linked payout if this is a deduction'
    )

    note = models.TextField(
        blank=True,
        help_text='Additional context or description for this transaction'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Affiliate Wallet Transaction'
        verbose_name_plural = 'Affiliate Wallet Transactions'

    def __str__(self):
        direction = "➕" if self.amount > 0 else "➖"
        return f"{direction} ${abs(self.amount)} [{self.get_status_display()}] - {self.get_transaction_type_display()}"
    
class BreachHistory(models.Model):
    """
    Stores historical record of all challenge breaches.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='breach_records'
    )
    client = models.ForeignKey(
        'wefund.ClientProfile', on_delete=models.CASCADE, related_name='breach_records'
    )
    enrollment = models.ForeignKey(
        'wefund.ChallengeEnrollment', on_delete=models.CASCADE, related_name='breach_records'
    )
    rule = models.CharField(max_length=100)  # e.g., 'Max Total Loss', 'Martingale'
    reason = models.TextField()  # Explanation / system-detected detail
    previous_state = models.JSONField(null=True, blank=True)
    breached_at = models.DateTimeField(
        auto_now_add=True,
        null=True,
        blank=True
    )

    class Meta:
        ordering = ['-breached_at']

    def __str__(self):
        return f"{self.user} - {self.rule} @ {self.breached_at.date()}"    

class SoftBreach(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='soft_breaches')
    client = models.ForeignKey(
        'ClientProfile', on_delete=models.CASCADE, related_name='soft_breaches', null=True, blank=True
    )
    enrollment = models.ForeignKey(
        'ChallengeEnrollment', on_delete=models.CASCADE, related_name='soft_breaches', null=True, blank=True
    )
    account_id = models.BigIntegerField()  # MT5 account ID
    payout = models.ForeignKey(
        'TraderPayout', on_delete=models.CASCADE, related_name='soft_breaches', null=True, blank=True
    )
    rule = models.CharField(max_length=100)  # e.g., "daily_profit_limit"
    severity = models.CharField(max_length=50, default='low')  # optional
    value = models.DecimalField(max_digits=20, decimal_places=5, null=True, blank=True)  # breach value
    description = models.TextField(null=True, blank=True)
    detected_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-detected_at']
        verbose_name = "Soft Breach"
        verbose_name_plural = "Soft Breaches"

    def __str__(self):
        enrollment_str = f" ({self.enrollment})" if self.enrollment else ""
        return f"{self.account_id} - {self.rule}{enrollment_str} - {'Resolved' if self.resolved else 'Active'}"
                                                           
class LoginHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='login_histories')
    login_time = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device_fingerprint = models.CharField(max_length=255, null=True, blank=True)  # User agent or custom device ID

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['device_fingerprint']),
            models.Index(fields=['login_time']),
        ]
        ordering = ['-login_time']

    def __str__(self):
        return f"Login: {self.user.username} at {self.login_time} from IP {self.ip_address}"
    
class EnrollmentAccount(models.Model):
    """
    One MT5 account per phase (Phase 1, Phase 2, Live).
    Keeps history, credentials, and lifecycle.
    """
    PHASE_CHOICES = [
        ('phase-1', 'Phase 1'),
        ('phase-2', 'Phase 2'),
        ('live-trader', 'Live Trader'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('archived', 'Archived'),   # closed/disabled after moving to next phase
        ('failed', 'Failed'),       # breach or other failure
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        ChallengeEnrollment, on_delete=models.CASCADE, related_name='accounts'
    )
    phase_type = models.CharField(max_length=20, choices=PHASE_CHOICES)
    broker_type = models.CharField(max_length=10, default='mt5')
    mt5_account_id = models.CharField(max_length=20, blank=True, null=True)
    mt5_password = models.CharField(max_length=100, blank=True, null=True)
    mt5_investor_password = models.CharField(max_length=100, blank=True, null=True)

    # lifecycle control
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['enrollment', 'phase_type', 'status']),
            models.Index(fields=['mt5_account_id']),
        ]
        constraints = [
            # Only one active account per (enrollment, phase_type)
            models.UniqueConstraint(
                fields=['enrollment', 'phase_type', 'status'],
                condition=Q(status='active'),
                name='uniq_active_account_per_phase'
            ),
        ]

    def __str__(self):
        return f"{self.enrollment_id} - {self.phase_type} - {self.mt5_account_id or 'pending'}"
    
class EnrollmentTransitionLog(models.Model):
    """
    Records state transitions and the automation run that caused them.
    Use for idempotency and audit trails.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment = models.ForeignKey(
        ChallengeEnrollment, on_delete=models.CASCADE, related_name='transition_logs'
    )
    from_status = models.CharField(max_length=50)
    to_status = models.CharField(max_length=50)
    reason = models.CharField(max_length=200, blank=True, null=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['enrollment', 'created_at'])]
        
class TraderPayoutAIAnalysis(models.Model):
    """
    Stores AI-generated analysis and recommendations for a Trader Payout.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    payout = models.OneToOneField(
        'TraderPayout',
        on_delete=models.CASCADE,
        related_name='ai_analysis',
        help_text="The payout this AI analysis belongs to"
    )
    
    ai_recommendations = models.JSONField(
        default=list,
        blank=True,
        help_text="AI recommendations to improve trading"
    )
    
    ai_trading_review = models.TextField(
        blank=True,
        help_text="Full AI trading review summary"
    )
    
    summary = models.JSONField(
        default=dict,
        blank=True,
        help_text="Summary of the AI analysis"
    )
    
    trading_style = models.JSONField(
        default=dict,
        blank=True,
        help_text="Identified trading style (e.g., Conservative, Aggressive)"
    )
    
    risk_assessment = models.JSONField(
        default=dict,
        blank=True,
        help_text="Risk assessment determined by AI"
    )
    
    risk_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Risk score (0-100) calculated by AI"
    )
    
    recommendation = models.JSONField(
        default=dict,
        blank=True,
        help_text="AI recommendation regarding payout approval or trading improvement"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Trader Payout AI Analysis"
        verbose_name_plural = "Trader Payout AI Analyses"
    
    def __str__(self):
        return f"AI Analysis for Payout {self.payout.id}"

class TraderPayoutComplianceAnalysis(models.Model):
    """
    Stores AI-generated compliance analysis for a Trader Payout request.
    Matches the compliance checker JSON structure.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payout = models.OneToOneField(
        "TraderPayout",
        on_delete=models.CASCADE,
        related_name="compliance_analysis",
        help_text="The payout this compliance analysis belongs to"
    )

    version = models.CharField(max_length=10, default="1.0")

    # Top-level flags
    hard_breach_detected = models.BooleanField(default=False)
    soft_breach_detected = models.BooleanField(default=False)

    hard_breaches = models.JSONField(default=list, blank=True)
    soft_breaches = models.JSONField(default=list, blank=True)
    evidence = models.JSONField(default=list, blank=True)

    # Metrics (nested JSON for flexibility)
    metrics = models.JSONField(default=dict, blank=True)

    # Payout adjustments
    payout_adjustments = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Trader Payout Compliance Analysis"
        verbose_name_plural = "Trader Payout Compliance Analyses"

    def __str__(self):
        return f"Compliance Analysis for Payout {self.payout.id}"


class ComplianceResponsibleTrade(models.Model):
    """
    Stores trades responsible for compliance breaches.
    Linked to a compliance analysis entry.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis = models.ForeignKey(
        TraderPayoutComplianceAnalysis,
        on_delete=models.CASCADE,
        related_name="responsible_trades"
    )

    ticket_id = models.CharField(max_length=50)
    symbol = models.CharField(max_length=50)
    direction = models.CharField(max_length=4, choices=[("BUY", "Buy"), ("SELL", "Sell")])
    lot_size = models.DecimalField(max_digits=12, decimal_places=2)
    open_time_utc = models.DateTimeField()
    close_time_utc = models.DateTimeField(null=True, blank=True)
    pnl = models.DecimalField(max_digits=12, decimal_places=2)
    margin_at_open_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    reason_flagged = models.TextField()
    breach_type = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Compliance Responsible Trade"
        verbose_name_plural = "Compliance Responsible Trades"

    def __str__(self):
        return f"Trade {self.ticket_id} flagged in {self.analysis_id}"
    
    
class EATradingBotRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    client = models.ForeignKey(
        "ClientProfile",
        on_delete=models.CASCADE,
        related_name="ea_requests",
        help_text="The client requesting EA approval"
    )

    enrollment = models.ForeignKey(
        "ChallengeEnrollment",
        on_delete=models.CASCADE,
        related_name="ea_requests",
        help_text="The specific challenge enrollment this EA request is linked to"
    )

    mq5_file_url = models.URLField(
        max_length=500,
        help_text="BunnyCDN / S3 URL to the uploaded .mq5 file"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current approval status of the EA request"
    )

    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection if status is 'rejected'"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ea_reviewed_requests",
        help_text="Admin/staff who reviewed the request"
    )

    def __str__(self):
        return f"EA Request ({self.client.user.username}) - {self.get_status_display()}"
    
class AffiliateCommissionTier(models.Model):
    """
    Defines a commission tier based on referral counts.
    Example:
    - Tier 1: 1–10 referrals → 10%
    - Tier 2: 10–25 referrals → 12.5%
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(
        max_length=100,
        help_text="Tier name (e.g. 'Tier 1')"
    )

    min_referrals = models.PositiveIntegerField(
        help_text="Minimum number of referrals required to qualify for this tier"
    )

    max_referrals = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of referrals for this tier. Leave blank for unlimited."
    )

    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Commission percentage for this tier (e.g. 10.00 for 10%)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["min_referrals"]

    def __str__(self):
        if self.max_referrals:
            return f"{self.name}: {self.min_referrals}-{self.max_referrals} referrals → {self.commission_rate}%"
        return f"{self.name}: {self.min_referrals}+ referrals → {self.commission_rate}%"
    
class AffiliateCustomCommission(models.Model):
    """
    Allows setting a custom commission rate or tier override for a specific affiliate.
    This overrides the global AffiliateCommissionTier rules if active.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    affiliate = models.OneToOneField(
        "AffiliateProfile",
        on_delete=models.CASCADE,
        related_name="custom_commission",
        help_text="Affiliate who has a custom commission setup"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this custom commission is currently active"
    )

    commission_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Custom commission percentage (e.g. 15.00 for 15%). Leave blank to use tier rate."
    )

    fixed_amount_per_referral = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Optional: fixed commission per approved referral (overrides percentage if set)."
    )

    notes = models.TextField(
        blank=True,
        help_text="Internal notes or reason for this custom commission setup"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        rate = f"{self.commission_rate}%" if self.commission_rate else "Tier Default"
        return f"Custom Commission for {self.affiliate.user.username} → {rate}"

    def get_effective_rate(self):
        """
        Returns the commission rate to apply (custom if active, else tier rate).
        """
        if self.is_active and self.commission_rate:
            return self.commission_rate
        if hasattr(self.affiliate, "current_tier") and self.affiliate.current_tier:
            return self.affiliate.current_tier.commission_rate
        return Decimal("0.00")
    
class EnrollmentEvent(models.Model):
    EVENT_CHOICES = [
        ("breach", "Breach"),
        ("phase_pass", "Phase Passed"),
    ]

    enrollment = models.ForeignKey(
        "ChallengeEnrollment", on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    equity = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    notes = models.TextField(blank=True, help_text="Optional: reason or rule triggered")

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.get_event_type_display()} @ {self.timestamp} ({self.enrollment})"

class MigrationHistory(models.Model):
    """
    Stores records of CSV-based migration imports for clients and challenge enrollments.
    Tracks who uploaded, when, the file name, row counts, and errors.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'admin'},
        related_name='migration_histories',
        help_text="Admin user who performed the migration"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the CSV was uploaded"
    )

    file_name = models.CharField(
        max_length=255,
        help_text="Original name of the uploaded CSV file"
    )

    total_rows = models.PositiveIntegerField(
        default=0,
        help_text="Total number of rows in the uploaded CSV"
    )

    created_rows = models.PositiveIntegerField(
        default=0,
        help_text="Number of successfully created records"
    )

    errors = models.JSONField(
        default=list,
        blank=True,
        help_text="List of errors encountered during import, if any"
    )

    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Optional notes or comments about the migration"
    )

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Migration History"
        verbose_name_plural = "Migration Histories"

    def __str__(self):
        return f"Migration {self.id} by {self.uploaded_by} at {self.uploaded_at}"
    
class InternalNote(models.Model):
    """
    Internal-only notes for staff/admin use.
    Linked to a trader via the `trader` FK for unified querying.
    Optionally attached to a specific object (enrollment, etc.) via generic FK.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # The trader this note belongs to (primary query path)
    trader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="trader_notes",
        limit_choices_to={'role': 'client'},
        help_text="The trader this note is associated with"
    )

    # Author of the note
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="internal_notes"
    )

    # Optional generic relation for tracking source context
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.UUIDField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    # Note body
    note = models.TextField()

    # Metadata
    is_private = models.BooleanField(default=True, help_text="Restrict note visibility to staff only")
    NOTE_CATEGORY_CHOICES = [
        ('general', 'General'),
        ('risk', 'Risk'),
        ('consistency', 'Consistency'),
        ('device', 'Device/IP'),
        ('copy_trading', 'Copy Trading'),
        ('manual_review', 'Manual Review'),
    ]
    category = models.CharField(max_length=20, choices=NOTE_CATEGORY_CHOICES, default='general')
    is_high_risk = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note by {self.created_by} on {self.content_object}"
    

class MigrationLog(models.Model):
    # High-level migration info
    batch_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        help_text="Unique ID to group logs of the same CSV upload"
    )
    row_number = models.PositiveIntegerField(
        help_text="Row number in CSV (or 1 for single import)"
    )

    # User info
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="migration_logs"
    )
    email = models.EmailField(help_text="Email from CSV")
    username = models.CharField(max_length=150, help_text="Username from CSV")
    created_user = models.BooleanField(default=False, help_text="Whether user was newly created")

    # Client profile info
    kyc_status = models.CharField(max_length=50, blank=True)
    referred_by_email = models.EmailField(blank=True)

    # Challenge enrollment info
    challenge_name = models.CharField(max_length=255)
    phase_status = models.CharField(max_length=100, blank=True)
    account_size = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=10, blank=True)

    # MT5 info
    broker_type = models.CharField(max_length=50, blank=True)
    mt5_account_id = models.CharField(max_length=50, blank=True)
    mt5_password = models.CharField(max_length=100, blank=True)
    mt5_investor_password = models.CharField(max_length=100, blank=True)

    # Payout config info
    payout_config_type = models.CharField(max_length=20, default="default")
    next_withdrawal_date = models.DateTimeField(null=True, blank=True)
    live_trading_start_date = models.DateField(null=True, blank=True)
    profit_share_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    payment_cycle = models.CharField(max_length=20, blank=True)

    # Status
    success = models.BooleanField(default=False, help_text="Did this row migrate successfully?")
    errors = models.JSONField(null=True, blank=True, help_text="Validation or migration errors if failed")

    # Meta
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"MigrationLog(row={self.row_number}, email={self.email}, success={self.success})"

class PayoutConfigImportLog(models.Model):
    """
    Tracks bulk CSV imports for payout configurations.
    Allows reverting if needed.
    """
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payout_imports"
    )
    file_name = models.CharField(max_length=255, blank=True)
    total_rows = models.PositiveIntegerField(default=0)
    processed_rows = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PayoutConfig Import {self.id} ({self.processed_rows}/{self.total_rows})"

class MT5DailySnapshot(models.Model):
    """
    Stores daily trading account snapshots for each enrollment/account.
    Captures start-of-day and end-of-day values, plus derived stats.
    """

    enrollment = models.ForeignKey(
        ChallengeEnrollment,
        on_delete=models.CASCADE,
        related_name="daily_snapshots"
    )
    account_id = models.BigIntegerField(db_index=True)  # Same as mt5_account_id for convenience
    date = models.DateField(db_index=True)  # e.g. 2025-09-08

    # --- Daily values (captured at broker midnight or UTC 00:00) ---
    starting_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    starting_equity = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    ending_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    ending_equity = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # --- Derived statistics ---
    today_profit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        help_text="Today's realized profit/loss (balance difference)"
    )
    total_profit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        help_text="Total realized profit/loss since account start"
    )

    # --- Breach-related metrics ---
    today_max_drawdown = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        help_text="Largest equity drop seen during this day"
    )
    total_max_drawdown = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        help_text="Largest equity drop seen since account start"
    )
    
    daily_loss_used = models.DecimalField(
    max_digits=7, decimal_places=2, default=0.00,
    help_text="How much of today's max daily loss limit was used (0-100%)."
    )
    
    total_loss_used = models.DecimalField(
        max_digits=7, decimal_places=2, default=0.00,
        help_text="How much of total max loss limit was used (0-100%)."
    )


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("enrollment", "account_id", "date")
        indexes = [
            models.Index(fields=["account_id", "date"]),
        ]
        ordering = ["-date"]

    def __str__(self):
        return f"Snapshot {self.account_id} on {self.date} (StartBal {self.starting_balance}, StartEq {self.starting_equity})"
    
# -------------------------------------------------------------------
# WordPress Plugin Integration & Monitoring Models
# -------------------------------------------------------------------

class APIRequestLog(models.Model):
    """
    Model to store API request logs for monitoring and analytics.
    """
    endpoint = models.CharField(max_length=200, db_index=True)
    method = models.CharField(max_length=10, db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    user_agent = models.TextField(blank=True)
    request_data = models.JSONField(default=dict, blank=True)
    response_status = models.IntegerField(db_index=True)
    response_time_ms = models.FloatField()
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['endpoint', 'created_at']),
            models.Index(fields=['ip_address', 'created_at']),
            models.Index(fields=['response_status', 'created_at']),
            models.Index(fields=['created_at', 'endpoint']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.response_status} ({self.response_time_ms}ms)"


class WebhookProcessingLog(models.Model):
    """
    Model to store detailed webhook processing logs.
    """
    webhook_id = models.CharField(max_length=100, db_index=True)
    order_id = models.IntegerField(null=True, blank=True, db_index=True)
    processing_stage = models.CharField(max_length=50, db_index=True)
    status = models.CharField(max_length=20, choices=[
        ('started', 'Started'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('retry', 'Retry')
    ], db_index=True)
    details = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)
    processing_time_ms = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['webhook_id', 'created_at']),
            models.Index(fields=['order_id', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['processing_stage', 'status']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Webhook {self.webhook_id} - {self.processing_stage} ({self.status})"


class WordPressIntegrationSettings(models.Model):
    """
    Model to store WordPress integration settings and configuration.
    """
    site_url = models.URLField(unique=True)
    plugin_version = models.CharField(max_length=20)
    api_key_hash = models.CharField(max_length=64)  # SHA256 hash of the API key
    is_active = models.BooleanField(default=True)
    last_webhook_received = models.DateTimeField(null=True, blank=True)
    total_webhooks_processed = models.PositiveIntegerField(default=0)
    failed_webhooks_count = models.PositiveIntegerField(default=0)
    rate_limit_exceeded_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "WordPress Integration Setting"
        verbose_name_plural = "WordPress Integration Settings"
    
    def __str__(self):
        return f"WordPress Integration - {self.site_url}"
    
    def update_webhook_stats(self, success: bool = True):
        """Update webhook processing statistics."""
        self.total_webhooks_processed += 1
        self.last_webhook_received = timezone.now()
        
        if not success:
            self.failed_webhooks_count += 1
        
        self.save(update_fields=[
            'total_webhooks_processed', 
            'last_webhook_received', 
            'failed_webhooks_count',
            'updated_at'
        ])
    
    def update_rate_limit_stats(self):
        """Update rate limit statistics."""
        self.rate_limit_exceeded_count += 1
        self.save(update_fields=['rate_limit_exceeded_count', 'updated_at'])
    
    @property
    def success_rate(self):
        """Calculate webhook success rate."""
        if self.total_webhooks_processed == 0:
            return 0.0
        return ((self.total_webhooks_processed - self.failed_webhooks_count) / 
                self.total_webhooks_processed * 100)


class UsedJWTToken(models.Model):
    """Track used JWT tokens to prevent reuse"""
    
    token_jti = models.CharField(max_length=255, unique=True, db_index=True)
    plugin_name = models.CharField(max_length=255)
    used_at = models.DateTimeField(auto_now_add=True)
    user_id = models.CharField(max_length=255)
    webhook_id = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        ordering = ['-used_at']
        indexes = [
            models.Index(fields=['token_jti']),
            models.Index(fields=['used_at']),
        ]
    
    def __str__(self):
        return f"Used JWT Token {self.token_jti[:20]}... by {self.plugin_name}"
    
    @classmethod
    def is_token_used(cls, jti):
        """Check if a JWT token has been used"""
        return cls.objects.filter(token_jti=jti).exists()
    
    @classmethod
    def mark_token_used(cls, jti, plugin_name, user_id, webhook_id=None):
        """Mark a JWT token as used"""
        return cls.objects.create(
            token_jti=jti,
            plugin_name=plugin_name,
            user_id=user_id,
            webhook_id=webhook_id
        )

class ImpersonationLog(models.Model):
    superuser = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="impersonations_made"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="impersonated_sessions"
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.superuser.email} impersonated {self.target_user.email} at {self.created_at}"

class CertificateTemplate(models.Model):
    """
    Defines how to render a certificate:
    - background file
    - text positions and sizes
    """
    CERTIFICATE_TYPE_CHOICES = [
        ("phase", "Phase"),
        ("payout", "Payout"),
    ]

    key = models.SlugField(
        max_length=50,
        unique=True,
        help_text="Unique identifier (e.g., 'live_account', 'phase_one')."
    )
    title = models.CharField(max_length=100, help_text="Display name of the certificate")
    background_file = models.CharField(
        max_length=255,
        help_text="Relative path under static/certificates/ (e.g., 'Live Account Certificate.png')"
    )

    # Name text
    name_x = models.IntegerField()
    name_y = models.IntegerField()
    name_font_size = models.IntegerField(default=50)

    # Date text
    date_x = models.IntegerField()
    date_y = models.IntegerField()
    date_font_size = models.IntegerField(default=36)

    # ✅ NEW — Certificate type (Phase | Payout)
    certificate_type = models.CharField(
        max_length=20,
        choices=CERTIFICATE_TYPE_CHOICES,
        null=True,
        blank=True,
        help_text="Optional type of certificate: Phase or Payout"
    )

    # ✅ NEW — Profit Share text position
    profitshare_x = models.IntegerField(null=True, blank=True)
    profitshare_y = models.IntegerField(null=True, blank=True)
    profitshare_font_size = models.IntegerField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return f"{self.title} ({self.key})"

class GeneratedPasswordLog(models.Model):
    """
    Tracks when an admin user generates a password.
    Useful for auditing and security purposes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_password_logs",
        help_text="Admin who generated this password"
    )
    generated_password = models.CharField(
        max_length=128,
        help_text="The generated password (optional to store — consider encrypting or masking)."
    )
    length = models.PositiveIntegerField(help_text="Length of the generated password.")
    ip_address = models.GenericIPAddressField(null=True, blank=True, help_text="IP of the admin who triggered generation.")
    user_agent = models.TextField(null=True, blank=True, help_text="Browser or device info of admin.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Generated Password Log"
        verbose_name_plural = "Generated Password Logs"

    def __str__(self):
        return f"Password by {self.admin} at {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"

class MTActionPanelLogs(models.Model):
    """
    Logs any admin/superuser action performed on MT5 accounts/challenges
    from the 'Account Actions Panel' (e.g., activate trading, disable trading, change group, retry MT5 creation).
    """

    ACTION_CHOICES = [
        ("activate_trading", "Activate Trading"),
        ("disable_trading", "Disable Trading"),
        ("enable_account", "Enable Account"),
        ("disable_account", "Disable Account"),
        ("change_group", "Change Group"),
        ("change_password", "Change Password"),
        ("retry_mt5_account_creation", "Retry MT5 Account Creation"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="mt_action_logs",
        help_text="Admin/superuser who performed the action",
    )
    action = models.CharField(
        max_length=64,
        choices=ACTION_CHOICES,
        help_text="Type of action performed",
    )
    target_id = models.CharField(
        max_length=128,
        help_text="ID of the target resource (e.g., MT5 account ID or Enrollment ID)",
    )
    extra_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Optional payload/context (e.g., MT5 API response, old/new group name)",
    )
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, help_text="IP address of the admin performing the action"
    )
    user_agent = models.TextField(
        null=True, blank=True, help_text="Browser/device user agent"
    )

    created_at = models.DateTimeField(default=timezone.now, help_text="When the action occurred")

    class Meta:
        verbose_name = "MT Action Panel Log"
        verbose_name_plural = "MT Action Panel Logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_display()} by {self.user} on {self.target_id} at {self.created_at:%Y-%m-%d %H:%M}"               


class ActivityLog(models.Model):
    """
    Generic activity log for recording actions on various objects,
    primarily ChallengeEnrollment.
    """
    ACTION_CHOICES = [
        ('status_change', 'Status Changed'),
        ('payout_approved', 'Payout Approved'),
        ('payout_paid', 'Payout Paid'),
        ('account_blocked', 'Account Blocked'),
        ('note_added', 'Note Added/Updated'),
        ('data_updated', 'Account Data Updated'),
        ('system_breach', 'System: Breach/Failure'),
        ('system_reset', 'System: Account Reset'),
        ('system_payout', 'System: Payout Sent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Links to the User who performed the action (can be null for system actions)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs'
    )

    action_type = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        help_text='Type of action taken.'
    )

    # Generic Foreign Key setup
    # 1. content_type: Stores the model type (e.g., ChallengeEnrollment)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    # 2. object_id: Stores the primary key of the object (e.g., ChallengeEnrollment UUID)
    object_id = models.UUIDField(db_index=True)
    # 3. content_object: The actual object instance
    content_object = GenericForeignKey('content_type', 'object_id')

    # Detailed data about the change
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text='Detailed data, e.g., {"old_status": "in_progress", "new_status": "failed"}'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # The generated table name would be 'custom_log_activity_log'
        db_table = 'wefund_activity_log' 
        ordering = ['-created_at']
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.get_action_type_display()} on {self.content_object}"
    

class MT5MigrationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    old_mt5_id = models.CharField(max_length=20)
    new_mt5_id = models.CharField(max_length=20)
    client_email = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=20, default="pending")  # success, failed
    generate_password = models.BooleanField(default=False)
    main_password = models.CharField(max_length=100, blank=True, null=True)
    investor_password = models.CharField(max_length=100, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    processed_at = models.DateTimeField(default=timezone.now)
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.old_mt5_id} → {self.new_mt5_id} ({self.status})"

class RewardTask(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    instructions = models.TextField(
        blank=True,
        help_text="Step-by-step guidance for clients to complete the task."
    )
    url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Optional external link related to this task (e.g., Telegram, Twitter, etc.)"
    )
    # Feature Image
    feature_image = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Feature image URL (e.g., banner/thumbnail) stored on BunnyCDN."
    )
    # Example Image (new)
    example_image = models.URLField(
    max_length=500,
    blank=True,
    null=True,
    help_text="Example image URL stored on BunnyCDN."
    )

    # Checkbox: URL Submission Required?
    requires_url_submission = models.BooleanField(
        default=False,
        help_text="If enabled, the user must submit a URL when completing this task."
    )
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # ---- Expiration / Scheduling ----
    starts_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Optional: task becomes available at this time (leave empty for immediate)."
    )
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        help_text="Optional: task expires at this time (leave empty for no expiry)."
    )
    expire_action = models.CharField(
        max_length=20,
        choices=[
            ("mark_expired", "Mark as expired"),
            ("archive", "Archive"),
            ("inactivate", "Set inactive"),
        ],
        default="mark_expired",
        help_text="What to do when expires_at is reached."
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------- Helpers ----------
    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and timezone.now() >= self.expires_at)

    @property
    def is_scheduled(self) -> bool:
        return bool(self.starts_at and timezone.now() < self.starts_at)

    @property
    def is_available(self) -> bool:
        if self.status != "active":
            return False
        if self.is_scheduled:
            return False
        if self.is_expired:
            return False
        return True

    def apply_expiration_if_needed(self, save: bool = True) -> bool:
        """
        If expired, apply configured expire_action and return True if it changed status.
        """
        if not self.is_expired:
            return False

        new_status = None
        if self.expire_action == "mark_expired":
            new_status = "expired"
        elif self.expire_action == "archive":
            new_status = "archived"
        elif self.expire_action == "inactivate":
            new_status = "inactive"

        if new_status and self.status != new_status:
            self.status = new_status
            if save:
                self.save(update_fields=["status", "updated_at"])
            return True

        return False

    def __str__(self):
        return self.title

class RewardSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reward_submissions'
    )
    task = models.ForeignKey(
        RewardTask,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    notes = models.TextField(blank=True)
    proof_url = models.URLField(blank=True, null=True)

    # ✅ NEW: proper screenshot upload via BunnyCDN
    proof_image = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Screenshot proof uploaded via BunnyCDN."
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_comment = models.TextField(blank=True)
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # editable by admin

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_rewards'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.task.title}"

class WeCoinWallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wecoin_wallet'
    )
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.user.username} - {self.balance} WeCoins"

class WeCoinTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('earn', 'Earn'),
        ('spend', 'Spend'),
        ('adjustment', 'Admin Adjustment'),
    ]

    wallet = models.ForeignKey(
        WeCoinWallet,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.wallet.user.username} - {self.type} - {self.amount}"

class RedeemItem(models.Model):
    CATEGORY_CHOICES = [
        ("discount", "Discount Code"),
        ("subscription", "Subscription Plan"),
        ("addon", "Addon / Feature"),
        ("giveaway", "Giveaway"),
        ("payout_addon", "Payout Addon"),
        ("drawdown_addon", "Drawdown Addon"),
        ("merch", "Merchandise"),
        ("other", "Other"),
    ]

    EXPIRE_ACTION_CHOICES = [
        ("deactivate", "Set inactive"),
        ("archive", "Archive"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="other")

    required_wecoins = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="How many coins needed to redeem this item?"
    )
    stock_quantity = models.PositiveIntegerField(
        default=0,
        help_text="Leave 0 for unlimited redemptions"
    )
    max_per_user = models.PositiveIntegerField(
        default=0,
        help_text="Max times a single client can redeem this item. 0 = unlimited."
    )

    # State
    is_active = models.BooleanField(default=True)

    # Optional — for auto redemption or integration
    coupon_code = models.CharField(max_length=100, blank=True, null=True)
    addon_code = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    # -----------------------------
    # Expiration / Scheduling (NEW)
    # -----------------------------
    starts_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Optional: item becomes redeemable starting at this time."
    )
    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        help_text="Optional: item stops being redeemable after this time."
    )
    expire_action = models.CharField(
        max_length=20,
        choices=EXPIRE_ACTION_CHOICES,
        default="deactivate",
        help_text="What to do once expires_at is reached."
    )
    is_archived = models.BooleanField(
        default=False,
        help_text="If archived, item is hidden from all redemption listings."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # -----------------------------
    # Helpers
    # -----------------------------
    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and timezone.now() >= self.expires_at)

    @property
    def is_scheduled(self) -> bool:
        return bool(self.starts_at and timezone.now() < self.starts_at)

    @property
    def is_available(self) -> bool:
        """
        Should it be shown / redeemable right now?
        """
        if self.is_archived:
            return False
        if not self.is_active:
            return False
        if self.is_scheduled:
            return False
        if self.is_expired:
            return False
        return True

    def apply_expiration_if_needed(self, save: bool = True) -> bool:
        """
        If expired, apply configured expire_action and return True if it changed state.
        """
        if not self.is_expired:
            return False

        changed = False

        if self.expire_action == "deactivate":
            if self.is_active:
                self.is_active = False
                changed = True

        elif self.expire_action == "archive":
            # archive implies inactive + hidden
            if self.is_active:
                self.is_active = False
                changed = True
            if not self.is_archived:
                self.is_archived = True
                changed = True

        if changed and save:
            fields = ["updated_at"]
            # include only what could have changed
            if self.expire_action == "deactivate":
                fields.append("is_active")
            else:
                fields += ["is_active", "is_archived"]

            self.save(update_fields=fields)

        return changed

    def __str__(self):
        return f"{self.title} ({self.required_wecoins} WeCoins)"

class Redemption(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('declined', 'Declined'),
        ('fulfilled', 'Fulfilled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='redemptions'
    )
    item = models.ForeignKey(
        RedeemItem,
        on_delete=models.CASCADE,
        related_name='redemptions'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_comment = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_redemptions'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # optional data
    delivery_data = models.JSONField(blank=True, null=True, help_text="Can store coupon, tracking info, etc.")

    def __str__(self):
        return f"{self.user.username} → {self.item.title} ({self.status})"

class ResetTokenConfig(models.Model):
    """Singleton admin-configurable settings for the reset token feature."""
    PRICING = {
        10000: 920,
        25000: 1850,
        50000: 2400,
        100000: 3370,
        200000: 6150,
    }

    is_enabled = models.BooleanField(default=True, help_text="Master switch for reset token purchases")
    max_resets_per_enrollment = models.PositiveIntegerField(
        default=0,
        help_text="Max reset tokens per enrollment. 0 = unlimited."
    )

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        config, _ = cls.objects.get_or_create(pk=1)
        return config

    @classmethod
    def get_price(cls, account_size):
        """Return WeCoins cost for a given account size, or None if not eligible."""
        size_int = int(account_size)
        return cls.PRICING.get(size_int)

    def __str__(self):
        return f"ResetTokenConfig (max_resets={self.max_resets_per_enrollment}, enabled={self.is_enabled})"


class ResetToken(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('used', 'Used'),
        ('declined', 'Declined'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reset_tokens'
    )
    enrollment = models.ForeignKey(
        'ChallengeEnrollment',
        on_delete=models.CASCADE,
        related_name='reset_tokens'
    )
    wecoins_cost = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_comment = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_reset_tokens'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.enrollment.account_size} ({self.status})"


class PositionSLState(models.Model):
    """
    Last known SL state for an open MT5 position (tracked locally).
    Used to detect SL changes between polling intervals.
    """
    position_id = models.BigIntegerField(primary_key=True)
    login = models.BigIntegerField(db_index=True)
    symbol = models.CharField(max_length=64, db_index=True)
    side = models.CharField(max_length=4, choices=[("BUY", "BUY"), ("SELL", "SELL")])
    last_sl = models.DecimalField(max_digits=20, decimal_places=10, default=0)
    last_seen_update_ts = models.BigIntegerField(default=0)  # raw MT5 time_update
    is_open = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["login", "symbol"]),
        ]


class StopLossChange(models.Model):
    """
    Immutable history log of SL modifications while the trade is open.
    One row per change.
    """
    position_id = models.BigIntegerField(db_index=True)
    login = models.BigIntegerField(db_index=True)
    symbol = models.CharField(max_length=64, db_index=True)
    side = models.CharField(max_length=4)
    old_sl = models.DecimalField(max_digits=20, decimal_places=10)
    new_sl = models.DecimalField(max_digits=20, decimal_places=10)
    digits = models.IntegerField(default=5)

    # Context at the time of change (for auditing/risk)
    price_open = models.DecimalField(max_digits=20, decimal_places=10, default=0)
    price_current = models.DecimalField(max_digits=20, decimal_places=10, default=0)
    tp = models.DecimalField(max_digits=20, decimal_places=10, default=0)
    profit = models.DecimalField(max_digits=20, decimal_places=10, default=0)
    storage = models.DecimalField(max_digits=20, decimal_places=10, default=0)

    # When MT5 said it was last updated (converted), and our insert time
    changed_at = models.DateTimeField()     # derived from MT5 time_update
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional metadata available in positions table
    dealer = models.BigIntegerField(default=0)
    expert_id = models.DecimalField(max_digits=30, decimal_places=0, default=0)
    comment = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["position_id", "changed_at"]),
            models.Index(fields=["login", "symbol", "changed_at"]),
        ]
        # avoid duplicates on spammy updates
        unique_together = [("position_id", "new_sl", "changed_at")]
        
class BetaFeature(models.Model):
    """
    Represents an experimental feature in the platform.
    Admins manage lifecycle:
    - draft (not visible to users)
    - active (open for requests)
    - closed (no more requests)
    - released (rolled out to public)
    """

    STATUS_CHOICES = [
        ("draft", "Draft (hidden)"),
        ("active", "Active (accepting requests)"),
        ("closed", "Closed (not accepting new requests)"),
        ("released", "Released to Production"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.SlugField(unique=True, max_length=100)  # e.g. "wallet-analytics"
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optional flags
    requires_kya = models.BooleanField(default=False)  # Know Your Affiliate requirement
    requires_kyc = models.BooleanField(default=False)  # Know Your Client requirement

    def __str__(self):
        return f"{self.name} ({self.status})"


class BetaFeatureAccess(models.Model):
    """
    User request + approval control for a specific Beta Feature.
    Tracks moderation & lifecycle.
    """

    ACCESS_STATUS = [
        ("requested", "Requested"),
        ("approved", "Approved"),
        ("declined", "Declined"),
        ("revoked", "Revoked"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    feature = models.ForeignKey(BetaFeature, on_delete=models.CASCADE, related_name="access")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="beta_features")

    status = models.CharField(max_length=20, choices=ACCESS_STATUS, default="requested")
    request_notes = models.TextField(blank=True)  # user input
    admin_notes = models.TextField(blank=True)    # admin feedback

    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("feature", "user")  # Prevent duplicate requests

    def __str__(self):
        return f"{self.user.email} -> {self.feature.code} [{self.status}]"

class RiskScanReport(models.Model):
    """
    Stores full Risk Engine v2 output for a payout.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payout = models.OneToOneField(
        TraderPayout,
        on_delete=models.CASCADE,
        related_name="risk_scan",
        help_text="The payout this risk report belongs to."
    )

    report = models.JSONField(
        default=dict,
        help_text="Complete structured Risk Engine v2 output."
    )

    global_score = models.IntegerField(default=0)
    max_severity = models.CharField(max_length=20, blank=True, null=True)
    recommended_action = models.CharField(max_length=50, blank=True, null=True)

    generated_at = models.DateTimeField(auto_now_add=True)

    reran_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text="Admin who re-triggered the scan."
    )

    def __str__(self):
        return f"RiskScanReport for payout {self.payout_id}"

class PayoutAIAnalysis(models.Model):
    """
    AI Analysis v2 – one record per TraderPayout.
    Stores numeric stats, LLM insights, violations, classifications,
    and final payout recommendation.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    RECOMMENDATION_CHOICES = [
        ("approve", "Approve Payout"),
        ("reject", "Reject Payout"),
        ("manual_review", "Manual Review Required"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payout = models.OneToOneField(
        TraderPayout,
        on_delete=models.CASCADE,
        related_name="ai_analysis_v2",
        help_text="The payout this AI analysis belongs to.",
    )

    trader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payout_ai_analyses",
    )
    enrollment = models.ForeignKey(
        ChallengeEnrollment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payout_ai_analyses",
    )

    mt5_account_id = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="MT5 account used for this payout period.",
    )

    # Engine status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True, null=True)

    # Stats + Samples
    stats = models.JSONField(default=dict, blank=True)
    trade_samples = models.JSONField(default=dict, blank=True)

    # LLM metadata
    llm_model = models.CharField(max_length=50, default="gpt-5.1")
    llm_prompt_version = models.CharField(max_length=50, default="ai-analysis-v2-001")
    llm_request_payload = models.JSONField(default=dict, blank=True)
    llm_raw_response = models.JSONField(default=dict, blank=True)

    # Normalized AI outputs (existing)
    ai_summary = models.TextField(blank=True, null=True)
    ai_trading_style = models.JSONField(default=dict, blank=True)
    ai_risk_profile = models.JSONField(default=dict, blank=True)
    ai_consistency = models.JSONField(default=dict, blank=True)
    ai_recommendations = models.JSONField(default=dict, blank=True)

    # NEW IMPORTANT FIELDS (required by new prompt)
    violations = models.JSONField(
        default=list,
        blank=True,
        help_text="List of detected rule violations with details."
    )

    overall_classification = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Compliant, Soft Breach, or Hard Breach"
    )

    adjusted_payout = models.JSONField(
        default=dict,
        blank=True,
        help_text="Original vs excluded profit and recommended payout."
    )

    # Final payout recommendation
    recommendation = models.CharField(
        max_length=20,
        choices=RECOMMENDATION_CHOICES,
        blank=True,
        null=True,
        help_text="approve / reject / manual_review",
    )
    recommendation_confidence = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )
    recommendation_rationale = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AI Analysis for payout {self.payout_id} [{self.status}]"
    
class PayoutConsistencyReport(models.Model):
    """
    Stores Claude AI's consistency analysis for a payout.
    One row per payout_id.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    payout = models.OneToOneField(
        "TraderPayout",
        on_delete=models.CASCADE,
        related_name="consistency_report"
    )

    enrollment = models.ForeignKey(
        "ChallengeEnrollment",
        on_delete=models.CASCADE,
        related_name="consistency_reports"
    )

    account_id = models.CharField(max_length=20)
    account_type = models.CharField(max_length=50)

    # Full JSON result from AI
    analysis = models.JSONField()

    verdict = models.CharField(max_length=20)           # pass / reject / not_applicable
    deduction_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payout_status = models.CharField(max_length=50)      # approved_full / approved_reduced / reject
    reason = models.TextField(null=True, blank=True)

    final_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    final_net_profit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    ai_request = models.JSONField(null=True, blank=True)
    ai_raw_response = models.TextField(null=True, blank=True)
    ai_parsed_response = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Consistency Report for Payout {self.payout.id}"

class Competition(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("upcoming", "Upcoming"),
        ("ongoing", "Ongoing"),
        ("ended", "Ended"),
    ]

    ENTRY_TYPE_CHOICES = [
        ("free", "Free"),
        ("paid", "Paid"),
        ("invite", "Invite Only"),
    ]

    SCORING_CHOICES = [
        ("growth_percent", "% Growth"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic Info
    title = models.CharField(max_length=255)
    banner = models.URLField(max_length=500, null=True, blank=True)
    short_description = models.CharField(max_length=500)
    full_description = models.TextField()
    organizer_name = models.CharField(max_length=255)
    organizer_logo = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Logo URL of the competition organizer"
    )

    # Timing
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    # Trading Configuration
    initial_balance = models.DecimalField(max_digits=12, decimal_places=2)
    leverage = models.CharField(max_length=20)
    mt5_group = models.CharField(max_length=255)
    allowed_symbols = models.JSONField(null=True, blank=True)
    min_trades_to_qualify = models.PositiveIntegerField(null=True, blank=True)

    # Scoring & Rules
    scoring_metric = models.CharField(
        max_length=50, choices=SCORING_CHOICES, default="growth_percent"
    )
    rules_markdown = models.TextField()
    use_global_rules = models.BooleanField(default=True)

    # Prizes
    prize_pool_text = models.CharField(max_length=255)

    # Entry
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    entry_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    max_participants = models.PositiveIntegerField(null=True, blank=True)

    # System Flags
    auto_create_mt5 = models.BooleanField(default=True)
    enforce_single_entry = models.BooleanField(default=True)
    allow_test_users = models.BooleanField(default=False)

    challenge = models.ForeignKey(
        Challenge,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="competitions",
        help_text="Optional challenge to be awarded to winners"
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
    
    def get_active_rules(self):
        if self.use_global_rules:
            return "GLOBAL"
        return self.manual_rules.filter(is_active=True)
    
class CompetitionPrize(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="prizes"
    )

    rank_from = models.PositiveIntegerField()
    rank_to = models.PositiveIntegerField()
    description = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.rank_from} - {self.rank_to}: {self.description}"
    
class CompetitionRule(models.Model):
    RULE_TYPE_CHOICES = [
        ("mdl", "Max Daily Loss"),
        ("mtl", "Max Total Loss"),
        ("mtd", "Max Trades Per Day"),
        ("pr", "Profit Requirement"),
        ("min_days", "Minimum Trading Days"),
        ("max_lot", "Max Lot Size"),
        ("consistency", "Consistency Rule"),
    ]

    VALUE_TYPE_CHOICES = [
        ("percent", "Percentage"),
        ("amount", "Fixed Amount"),
        ("count", "Count"),
        ("boolean", "Boolean"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name="manual_rules"
    )

    rule_type = models.CharField(max_length=50, choices=RULE_TYPE_CHOICES)

    value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    value_type = models.CharField(
        max_length=20,
        choices=VALUE_TYPE_CHOICES
    )

    description = models.CharField(max_length=255, blank=True)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("competition", "rule_type")

    def __str__(self):
        return f"{self.competition.title} → {self.rule_type}"

class CompetitionRegistration(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("disqualified", "Disqualified"),
        ("completed", "Completed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="registrations"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    mt5_login = models.CharField(max_length=50, null=True, blank=True)

    challenge_enrollment = models.ForeignKey(
        ChallengeEnrollment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="competition_registrations",
        help_text="Set only if this competition grants a challenge to the trader"
    )

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="active")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("competition", "user")

    def __str__(self):
        return f"{self.user} → {self.competition}"

class CompetitionRankingSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="rankings"
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    mt5_login = models.CharField(max_length=50)

    rank = models.PositiveIntegerField()

    growth_percent = models.DecimalField(max_digits=8, decimal_places=2)
    total_trades = models.PositiveIntegerField()
    equity = models.DecimalField(max_digits=12, decimal_places=2)
    balance = models.DecimalField(max_digits=12, decimal_places=2)

    captured_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("competition", "user")
        ordering = ["rank"]

    def __str__(self):
        return f"#{self.rank} - {self.user}"

class CompetitionStatusLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)

    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)

    changed_at = models.DateTimeField(auto_now_add=True)

class CompetitionInvite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    email = models.EmailField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class AIRiskRule(models.Model):
    """
    Registry of prohibited / monitored trading strategies.
    Used for AI prompt injection and governance.
    """

    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="MARTINGALE, GRID, PYRAMID, BOT_TRADING"
    )

    name = models.CharField(max_length=100)
    description = models.TextField()

    severity = models.CharField(
        max_length=20,
        choices=[
            ("AUTO_REJECT", "Auto Reject"),
            ("REVIEW", "Manual Review"),
            ("WARNING", "Warning Only"),
        ]
    )

    detection_guidelines = models.TextField(
        help_text="Natural language rules injected into AI prompt"
    )

    is_active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["severity", "code"]

    def __str__(self):
        return f"{self.code} ({self.severity})"

class AIRiskAnalysis(models.Model):
    """
    Stores AI risk analysis for a payout.
    One payout = one AI analysis.
    """

    payout = models.OneToOneField(
        TraderPayout,
        on_delete=models.CASCADE,
        related_name="ai_risk_analysis"
    )

    # --- Account context ---
    account_id = models.CharField(max_length=50)
    account_step = models.CharField(
        max_length=10,
        choices=[
            ("step_1", "Step 1"),
            ("step_2", "Step 2"),
        ]
    )

    # --- Input snapshot (CRITICAL for reproducibility) ---
    trade_data = models.JSONField(help_text="Exact trades sent to AI")
    account_snapshot = models.JSONField(help_text="Balance, equity, dates, etc")

    # --- Consistency (Step 1 only) ---
    consistency_score = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Risk engine global score (can exceed 1000)"
    )
    consistency_result = models.CharField(
        max_length=30,
        null=True, blank=True
    )

    # --- AI output ---
    ai_model = models.CharField(max_length=100)
    ai_prompt_version = models.CharField(max_length=20)

    # DEBUG / AUDIT
    ai_raw_request = models.JSONField(
        null=True,
        blank=True,
        help_text="Full raw request payload sent to RunPod"
    )

    ai_raw_response = models.JSONField(
        null=True,
        blank=True,
        help_text="Full raw response received from RunPod"
    )

    ai_analysis_text = models.TextField(
        null=True,
        blank=True
    )

    ai_recommendation = models.CharField(
        max_length=20,
        choices=[
            ("APPROVE", "Approve"),
            ("REJECT", "Reject"),
            ("MANUAL_REVIEW", "Manual Review"),
        ],
        null=True,
        blank=True,
    )


    ai_patterns_detected = models.JSONField(
        default=list,
        blank=True,
        help_text="List of detected prohibited patterns"
    )


    ai_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="AI confidence percentage (0–100)"
    )


    # --- Final system outcome ---
    final_decision = models.CharField(
        max_length=32,
        choices=[
            ("APPROVE", "Approve"),
            ("REJECT", "Reject"),
            ("APPROVE_WITH_DEDUCTIONS", "Approve With Deductions"),
        ],
        null=True, blank=True
    )

    requires_human_review = models.BooleanField(default=False)

    runpod_job_id = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=[
            ("queued", "Queued"),
            ("running", "Running"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        default="queued",
    )

    error_message = models.TextField(blank=True, null=True)

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)


    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["account_id"]),
            models.Index(fields=["ai_recommendation"]),
        ]

    def __str__(self):
        return f"AI Risk Analysis – {self.account_id}"

class AIRiskReviewFeedback(models.Model):
    """
    Human feedback on AI risk analysis.
    Used for accuracy metrics and model training.
    """

    analysis = models.OneToOneField(
        "AIRiskAnalysis",
        on_delete=models.CASCADE,
        related_name="feedback"
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )

    # --- Human decision ---
    human_decision = models.CharField(
        max_length=32,
        choices=[
            ("APPROVE", "Approve"),
            ("REJECT", "Reject"),
            ("APPROVE_WITH_DEDUCTIONS", "Approve With Deductions"),
        ]
    )

    human_agrees_with_ai = models.BooleanField()

    human_reasoning = models.TextField()

    # --- Pattern-level feedback ---
    patterns_confirmed = models.JSONField(default=list)
    patterns_rejected = models.JSONField(default=list)
    patterns_added = models.JSONField(default=list)

    # --- Training metadata ---
    review_difficulty = models.CharField(
        max_length=10,
        choices=[
            ("easy", "Easy"),
            ("medium", "Medium"),
            ("hard", "Hard"),
        ]
    )

    training_priority = models.PositiveIntegerField(default=0)
    is_training_example = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["human_agrees_with_ai"]),
            models.Index(fields=["training_priority"]),
            models.Index(fields=["is_training_example"]),
        ]

    def __str__(self):
        return f"Feedback – {self.analysis.account_id}"        
# ===================================================================
# SUPPORT CHAT WIDGET MODELS
# ===================================================================

class SupportAIConfig(models.Model):
    """
    Singleton configuration for AI-powered support system.
    Only one record should exist (enforced at application level).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # AI Control
    ai_enabled = models.BooleanField(
        default=True,
        help_text="Master switch for AI responses globally"
    )
    ai_greeting = models.TextField(
        default="Hey there! Please describe your request in detail.",
        help_text="Default greeting message when conversation starts"
    )
    ai_system_prompt = models.TextField(
        blank=True,
        help_text="Base system prompt for AI (merged with dynamic context)"
    )
    
    # Model Selection (Google Gemini 2.5)
    simple_model = models.CharField(
        max_length=100,
        default="gemini-2.5-flash-lite",
        help_text="Fast model for simple queries (cost-optimized)"
    )
    complex_model = models.CharField(
        max_length=100,
        default="gemini-2.5-flash",
        help_text="Advanced model for complex queries (better reasoning)"
    )
    complexity_threshold = models.IntegerField(
        default=100,
        help_text="Character count threshold to switch from simple to complex model"
    )
    
    # Action Permissions
    read_actions_enabled = models.BooleanField(
        default=True,
        help_text="Allow AI to reference user account data"
    )
    write_actions_enabled = models.BooleanField(
        default=False,
        help_text="Allow AI to modify data (future feature)"
    )
    allowed_write_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of write actions AI can perform"
    )
    
    # Quality Control
    confidence_threshold = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.85'),
        help_text="Minimum confidence for auto-response (0-1)"
    )
    escalation_keywords = models.JSONField(
        default=list,
        blank=True,
        help_text="Keywords that trigger immediate escalation"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Support AI Configuration"
        verbose_name_plural = "Support AI Configuration"
    
    def __str__(self):
        return f"AI Config (Enabled: {self.ai_enabled})"
    
    @classmethod
    def get_config(cls):
        """Get or create singleton config"""
        config = cls.objects.first()
        if not config:
            config = cls.objects.create(
                escalation_keywords=['refund', 'money back', 'lawyer', 'legal', 'sue', 'scam', 'fraud']
            )
        return config


class SupportConversation(models.Model):
    """
    Represents a support conversation between user and AI/agent.
    Multi-channel support (widget, Discord, email).
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('resolved', 'Resolved'),
        ('escalated', 'Escalated'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    SOURCE_CHOICES = [
        ('widget', 'Widget'),
        ('discord', 'Discord'),
        ('email', 'Email'),
        ('website', 'Website'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User Information
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='support_conversations'
    )
    account_login = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Optional MT5 account login for context"
    )

    # Guest Information (for unauthenticated website visitors)
    guest_name = models.CharField(max_length=200, null=True, blank=True)
    guest_email = models.EmailField(null=True, blank=True)
    session_token = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
    )
    
    # Status Management
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        db_index=True
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='normal'
    )
    
    # AI Control
    ai_enabled = models.BooleanField(
        default=True,
        help_text="AI responses enabled for this conversation"
    )
    attachments_enabled = models.BooleanField(
        default=False,
        help_text="File attachments allowed"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_sender_type = models.CharField(
        max_length=10,
        choices=[('user', 'User'), ('ai', 'AI'), ('agent', 'Agent')],
        null=True,
        blank=True,
        help_text="Sender type of the most recent non-internal message"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="First AI/agent response time"
    )
    agent_takeover_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When human agent took over"
    )
    
    # Escalation Tracking
    escalation_reason = models.TextField(blank=True)
    deescalation_attempted = models.BooleanField(
        default=False,
        help_text="AI attempted de-escalation"
    )
    needs_human_review = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Flagged for human review"
    )
    
    # Agent Assignment
    assigned_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_support_conversations'
    )
    subject = models.CharField(
        max_length=255,
        blank=True,
        help_text="Auto-generated or manual subject line"
    )
    
    # Archival (soft delete)
    is_archived = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete for user"
    )
    
    # Multi-channel Support
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='widget'
    )
    external_channel_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Discord channel ID or email thread ID"
    )
    email_message_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="RFC 2822 Message-ID for email threading"
    )
    email_subject = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Email subject line for email conversations"
    )

    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context (emotional state, tags, etc.)"
    )
    
    class Meta:
        ordering = ['-last_message_at', '-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status', 'needs_human_review']),
            models.Index(fields=['-last_message_at']),
            models.Index(fields=['guest_email', '-created_at']),
        ]
    
    def __str__(self):
        display = self.get_display_email() or 'Guest'
        return f"Conversation {self.id} - {display} ({self.status})"

    @property
    def is_guest(self):
        return self.user is None

    def get_display_name(self):
        if self.user:
            return self.user.get_full_name() or self.user.username or self.user.email
        return self.guest_name or 'Guest'

    def get_display_email(self):
        if self.user:
            return self.user.email
        return self.guest_email


class SupportMessage(models.Model):
    """
    Individual message in a support conversation.
    Can be from user, AI, or human agent.
    """
    SENDER_CHOICES = [
        ('user', 'User'),
        ('ai', 'AI'),
        ('agent', 'Agent'),
    ]

    MESSAGE_TYPE_CHOICES = [
        ('chat', 'Chat'),
        ('email', 'Email'),
        ('system', 'System'),
    ]

    SCAN_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('clean', 'Clean'),
        ('malicious', 'Malicious'),
        ('error', 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    conversation = models.ForeignKey(
        SupportConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    # Sender Information
    sender_type = models.CharField(
        max_length=20,
        choices=SENDER_CHOICES,
        db_index=True
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='support_messages_sent',
        help_text="User or agent who sent the message"
    )

    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='chat',
        db_index=True,
        help_text="Message channel type: chat, email, or system"
    )

    # Content
    content = models.TextField()
    
    # Internal Notes (visible only to staff)
    is_internal = models.BooleanField(
        default=False,
        help_text="Staff-only note, hidden from user"
    )
    
    # File Attachments
    attachment_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="BunnyCDN URL of attachment"
    )
    attachment_name = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    attachment_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="MIME type"
    )
    attachment_scan_status = models.CharField(
        max_length=20,
        choices=SCAN_STATUS_CHOICES,
        default='pending',
        help_text="Virus scan result"
    )
    
    # AI Quality Tracking
    emotional_context = models.JSONField(
        null=True,
        blank=True,
        help_text="Emotional analysis data (level, indicators, etc.)"
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="AI model used, tokens, quality flags, etc."
    )
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Edit/Delete tracking
    edited_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.sender_type.upper()} - {self.content[:50]}"
    
    def save(self, *args, **kwargs):
        # Update conversation's last_message_at
        # Note: self.pk is never None for UUID fields (pre-generated), use _state.adding
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if is_new and not self.is_internal:
            self.conversation.last_message_at = self.created_at
            self.conversation.last_message_sender_type = self.sender_type
            self.conversation.save(update_fields=['last_message_at', 'last_message_sender_type', 'updated_at'])


class FAQCollection(models.Model):
    """
    Grouping for FAQ articles (e.g., "Trading Rules", "Payouts").
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon name (e.g., 'book', 'shield', 'dollar')"
    )
    
    display_order = models.IntegerField(
        default=0,
        help_text="Lower numbers appear first"
    )
    is_active = models.BooleanField(default=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'title']
    
    def __str__(self):
        return self.title
    
    @property
    def article_count(self):
        return self.articles.filter(is_active=True).count()


class FAQArticle(models.Model):
    """
    Individual FAQ article with search keywords and analytics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    collection = models.ForeignKey(
        FAQCollection,
        on_delete=models.CASCADE,
        related_name='articles'
    )
    
    title = models.CharField(max_length=255)
    content = models.TextField(help_text="Markdown supported")
    
    search_keywords = models.JSONField(
        default=list,
        blank=True,
        help_text="Manual keywords for search matching"
    )
    
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Analytics
    views_count = models.IntegerField(default=0)
    helpful_count = models.IntegerField(default=0)
    not_helpful_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['collection__display_order', 'display_order', 'title']
        indexes = [
            models.Index(fields=['collection', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.collection.title} - {self.title}"
    
    @property
    def helpfulness_ratio(self):
        total = self.helpful_count + self.not_helpful_count
        if total == 0:
            return 0
        return round((self.helpful_count / total) * 100, 1)


class SupportAIFeedback(models.Model):
    """
    Training data: Agent feedback on AI responses for continuous improvement.
    """
    FEEDBACK_TYPE_CHOICES = [
        ('helpful', 'Helpful'),
        ('partially_helpful', 'Partially Helpful'),
        ('not_helpful', 'Not Helpful'),
        ('wrong_info', 'Wrong Information'),
        ('wrong', 'Wrong'),
        ('harmful', 'Harmful'),
        ('inappropriate', 'Inappropriate'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    conversation = models.ForeignKey(
        SupportConversation,
        on_delete=models.CASCADE,
        related_name='ai_feedback'
    )
    message = models.ForeignKey(
        SupportMessage,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='support_feedback_given'
    )
    
    feedback_type = models.CharField(
        max_length=20,
        choices=FEEDBACK_TYPE_CHOICES
    )
    rating = models.IntegerField(
        null=True,
        blank=True,
        help_text="1-5 star rating"
    )
    was_helpful = models.BooleanField(null=True, blank=True)
    
    # Correction Data
    needed_correction = models.BooleanField(default=False)
    correction_made = models.TextField(
        blank=True,
        help_text="The correct response"
    )
    agent_notes = models.TextField(blank=True)
    
    # Training Priority
    should_be_training_example = models.BooleanField(
        default=False,
        help_text="Include in future training datasets"
    )
    training_priority = models.IntegerField(
        default=0,
        help_text="Higher = more important"
    )
    issue_categories = models.JSONField(
        default=list,
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Feedback on {self.message.id} by {self.agent.username}"


# -------------------------------------------------------------------
# Economic Calendar Models
# -------------------------------------------------------------------

class EconomicEvent(models.Model):
    """Economic calendar events for trading restrictions"""
    IMPACT_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('forex_factory', 'Forex Factory'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_name = models.CharField(max_length=255)
    currency = models.CharField(max_length=10)  # USD, EUR, GBP, etc.
    impact = models.CharField(max_length=10, choices=IMPACT_CHOICES)
    event_datetime = models.DateTimeField(db_index=True)
    time_window_minutes = models.PositiveIntegerField(default=5)
    affected_symbols = ArrayField(
        models.CharField(max_length=20),
        blank=True,
        default=list,
        help_text='Trading symbols affected by this event'
    )
    actual_value = models.CharField(max_length=50, blank=True, null=True)
    forecast_value = models.CharField(max_length=50, blank=True, null=True)
    previous_value = models.CharField(max_length=50, blank=True, null=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['event_datetime']
        unique_together = [['event_name', 'event_datetime', 'source']]
        verbose_name = 'Economic Event'
        verbose_name_plural = 'Economic Events'

    def __str__(self):
        return f"{self.currency} - {self.event_name} ({self.event_datetime})"


class EconomicCalendarSyncSchedule(models.Model):
    """Singleton table for sync status tracking"""
    id = models.CharField(max_length=50, primary_key=True, default='economic_calendar')
    last_sync_at = models.DateTimeField(null=True, blank=True)
    next_sync_at = models.DateTimeField(null=True, blank=True)
    sync_interval_hours = models.PositiveIntegerField(default=24)
    is_enabled = models.BooleanField(default=True)
    schedule_hour = models.PositiveIntegerField(default=0, help_text='Hour (UTC) to run daily sync')
    last_sync_result = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Economic Calendar Sync Schedule'
        verbose_name_plural = 'Economic Calendar Sync Schedules'

    def __str__(self):
        return f"Economic Calendar Sync ({self.id})"


# -------------------------------------------------------------------
# Admin AI Assistant Models
# -------------------------------------------------------------------

class AdminAIConfig(models.Model):
    """
    Singleton configuration for Admin AI Assistant.
    Only one record should exist (enforced at application level).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # AI Control
    ai_enabled = models.BooleanField(
        default=True,
        help_text="Master switch for Admin AI Assistant"
    )
    ai_greeting = models.TextField(
        default="Hello! I'm your AI assistant. I can help you look up enrollments, traders, payouts, MT5 data, and answer policy questions. What do you need?",
        help_text="Greeting message when admin starts a conversation"
    )
    ai_system_prompt = models.TextField(
        blank=True,
        help_text="Additional system prompt merged with base instructions"
    )

    # Model Selection (3-tier)
    simple_model = models.CharField(
        max_length=100,
        default="gemini-2.5-flash-lite",
        help_text="Fast model for simple queries (cheapest)"
    )
    standard_model = models.CharField(
        max_length=100,
        default="gemini-2.5-flash",
        help_text="Standard model for moderate complexity"
    )
    pro_model = models.CharField(
        max_length=100,
        default="gemini-2.5-pro",
        help_text="Pro model for complex multi-step reasoning"
    )
    complexity_threshold_standard = models.IntegerField(
        default=4,
        help_text="Minimum complexity score (1-7) to use standard model"
    )
    complexity_threshold_pro = models.IntegerField(
        default=6,
        help_text="Minimum complexity score (1-7) to use pro model"
    )

    # Action Permissions
    read_actions_enabled = models.BooleanField(
        default=True,
        help_text="Allow AI to execute read/lookup actions"
    )
    write_actions_enabled = models.BooleanField(
        default=False,
        help_text="Allow AI to execute MT5 write operations"
    )
    allowed_read_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of allowed read action names"
    )
    allowed_write_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="List of allowed write action names"
    )
    confirmation_required_actions = models.JSONField(
        default=list,
        blank=True,
        help_text="Write actions that require admin confirmation before execution"
    )

    # Generation Settings
    max_tokens = models.IntegerField(
        default=4096,
        help_text="Maximum output tokens for AI responses"
    )
    temperature = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.40'),
        help_text="AI temperature (0-1). Lower = more deterministic"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Admin AI Configuration"
        verbose_name_plural = "Admin AI Configuration"

    def __str__(self):
        return f"Admin AI Config (Enabled: {self.ai_enabled})"

    @classmethod
    def get_config(cls):
        """Get or create singleton config."""
        config = cls.objects.first()
        if not config:
            config = cls.objects.create(
                allowed_read_actions=[
                    'lookup_enrollment', 'lookup_trader', 'lookup_payout',
                    'get_mt5_account_details', 'get_mt5_open_trades',
                    'get_breach_history', 'get_trade_history', 'get_account_metrics',
                    'get_kyc_status', 'get_order_history', 'get_event_logs',
                    'get_soft_breaches', 'get_payout_config', 'search_traders',
                    'get_enrollment_snapshots',
                ],
                allowed_write_actions=[],
                confirmation_required_actions=[
                    'mt5_deposit', 'mt5_withdraw', 'mt5_close_trades',
                    'mt5_change_password', 'mt5_change_group',
                    'mt5_disable_account', 'mt5_disable_trading',
                ],
            )
        return config


class AdminAIConversation(models.Model):
    """
    Represents a conversation between an admin user and the AI assistant.
    """
    CONTEXT_TYPE_CHOICES = [
        ('general', 'General'),
        ('enrollment', 'Enrollment'),
        ('trader', 'Trader'),
        ('payout', 'Payout'),
        ('order', 'Order'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_ai_conversations'
    )

    # Context tracking
    context_type = models.CharField(
        max_length=20,
        choices=CONTEXT_TYPE_CHOICES,
        default='general'
    )
    context_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="UUID of the entity being viewed (enrollment, trader, etc.)"
    )
    context_url = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="CRM page URL where conversation was started"
    )

    is_active = models.BooleanField(default=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['admin_user', '-created_at']),
            models.Index(fields=['context_type', 'context_id']),
        ]

    def __str__(self):
        return f"Admin AI Conv {self.id} ({self.admin_user.email} - {self.context_type})"


class AdminAIMessage(models.Model):
    """
    Individual message in an admin AI conversation.
    """
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('ai', 'AI'),
        ('system', 'System'),
    ]
    ACTION_STATUS_CHOICES = [
        ('success', 'Success'),
        ('error', 'Error'),
        ('pending_confirmation', 'Pending Confirmation'),
        ('processing', 'Processing'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    conversation = models.ForeignKey(
        AdminAIConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()

    # AI metadata
    model_used = models.CharField(max_length=100, blank=True, null=True)
    complexity_score = models.IntegerField(
        null=True, blank=True,
        help_text="Message complexity score (1-7)"
    )

    # Tool/action tracking
    action_executed = models.CharField(
        max_length=100, blank=True, null=True,
        help_text="Tool function name that was executed"
    )
    action_params = models.JSONField(
        null=True, blank=True,
        help_text="Parameters passed to the tool"
    )
    action_result = models.JSONField(
        null=True, blank=True,
        help_text="Result returned from the tool"
    )
    action_status = models.CharField(
        max_length=30, blank=True, null=True,
        choices=ACTION_STATUS_CHOICES
    )

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"{self.role.upper()} - {self.content[:50]}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            self.conversation.last_message_at = self.created_at
            self.conversation.save(update_fields=['last_message_at', 'updated_at'])


class AdminAIFeedback(models.Model):
    """
    Feedback on AI assistant responses from admin users.
    """
    ISSUE_TYPE_CHOICES = [
        ('wrong_data', 'Wrong Data'),
        ('wrong_action', 'Wrong Action'),
        ('poor_explanation', 'Poor Explanation'),
        ('hallucination', 'Hallucination'),
        ('helpful', 'Helpful'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    conversation = models.ForeignKey(
        AdminAIConversation,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    message = models.ForeignKey(
        AdminAIMessage,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    admin_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_ai_feedback_given'
    )

    is_positive = models.BooleanField(help_text="True = thumbs up, False = thumbs down")
    issue_type = models.CharField(
        max_length=30,
        choices=ISSUE_TYPE_CHOICES,
        default='other'
    )
    correction_text = models.TextField(
        blank=True,
        help_text="The correct response or data"
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        sentiment = "positive" if self.is_positive else "negative"
        return f"Feedback ({sentiment}) on {self.message_id} by {self.admin_user.email}"


class AdminAITrainingExample(models.Model):
    """
    Curated training examples for few-shot learning in admin AI.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    question = models.TextField(help_text="Example user question")
    ideal_response = models.TextField(help_text="Ideal AI response")

    source_feedback = models.ForeignKey(
        AdminAIFeedback,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='training_examples',
        help_text="Feedback that generated this training example"
    )

    weight = models.IntegerField(
        default=5,
        help_text="Importance weight (1-10). Higher = more likely to be included"
    )
    issue_type = models.CharField(
        max_length=30, blank=True, null=True,
        help_text="Category of the issue this example addresses"
    )
    tags = models.JSONField(
        default=list, blank=True,
        help_text="Tags for categorizing examples"
    )
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-weight', '-created_at']

    def __str__(self):
        return f"Training: {self.question[:50]}"


class TradingReport(models.Model):
    """Stores generated top-5 trading leaderboard reports (weekly/monthly/custom)."""
    PERIOD_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom'),
    ]

    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='generated_reports',
    )
    data = models.JSONField(help_text="Full report data (all 6 metrics, top 5 each)")
    is_auto_generated = models.BooleanField(default=False)
    slack_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.get_period_type_display()} Report: {self.period_start} – {self.period_end}"


class TradingReportConfig(models.Model):
    """Singleton configuration for automated trading report generation and Slack integration."""
    id = models.CharField(max_length=50, primary_key=True, default='trading_report')
    is_enabled = models.BooleanField(default=False)
    slack_webhook_url = models.URLField(blank=True, default='')
    slack_enabled = models.BooleanField(default=False)
    auto_weekly = models.BooleanField(default=True)
    auto_monthly = models.BooleanField(default=True)
    weekly_day = models.IntegerField(default=1, help_text="Day of week for weekly report (1=Monday, 7=Sunday)")
    monthly_day = models.IntegerField(default=1, help_text="Day of month for monthly report (1-28)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Trading Report Configuration'

    def __str__(self):
        return f"Trading Report Config ({self.id})"

class BreachEvidence(models.Model):
    """
    One evidence snapshot per breach event.
    Stores both:
      - structured numeric fields (for UI/reporting)
      - raw JSON payloads (for audit / disputes)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    breach = models.OneToOneField(
        "BreachHistory",
        on_delete=models.CASCADE,
        related_name="evidence",
    )

    enrollment = models.ForeignKey(
        "ChallengeEnrollment",
        on_delete=models.CASCADE,
        related_name="breach_evidences",
    )

    account_id = models.BigIntegerField(null=True, blank=True)

    # capture times
    captured_at = models.DateTimeField(help_text="UTC aware capture time (Django)")
    broker_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Broker/MT5 server time if available",
    )

    # live state at capture time
    equity = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    balance = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    margin = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    free_margin = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)

    # rule context (optional but super useful)
    start_balance = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    threshold = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    max_loss_amount = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    max_loss_percent = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # raw payloads for audit/debug
    equity_payload = models.JSONField(null=True, blank=True)
    positions_payload = models.JSONField(null=True, blank=True)

    positions_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["enrollment", "captured_at"]),
            models.Index(fields=["account_id", "captured_at"]),
        ]

    def __str__(self):
        return f"BreachEvidence(breach={self.breach_id}, account_id={self.account_id})"


    @property
    def order_number(self):
        return str(self.id)[:8].upper()


class BreachEvidencePosition(models.Model):
    """
    Structured view of each open position at the time of breach evidence capture.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    evidence = models.ForeignKey(
        BreachEvidence,
        on_delete=models.CASCADE,
        related_name="positions",
    )

    ticket = models.BigIntegerField()
    symbol = models.CharField(max_length=32)
    side = models.CharField(max_length=8)  # buy/sell (or cmd string)

    # keep raw volume (since MT5 Manager sometimes returns units)
    volume = models.DecimalField(max_digits=18, decimal_places=2)

    open_price = models.DecimalField(max_digits=18, decimal_places=5, null=True, blank=True)
    current_price = models.DecimalField(max_digits=18, decimal_places=5, null=True, blank=True)

    sl = models.DecimalField(max_digits=18, decimal_places=5, null=True, blank=True)
    tp = models.DecimalField(max_digits=18, decimal_places=5, null=True, blank=True)

    profit = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)  # floating PnL
    swap = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)
    commission = models.DecimalField(max_digits=18, decimal_places=2, null=True, blank=True)

    opened_at = models.DateTimeField(null=True, blank=True)  # broker timestamp converted to dt
    magic = models.BigIntegerField(null=True, blank=True)
    comment = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["evidence", "ticket"]),
            models.Index(fields=["symbol"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["evidence", "ticket"],
                name="uniq_evidence_ticket",
            )
        ]

    def __str__(self):
        return f"{self.symbol} {self.side} ticket={self.ticket}"


# -------------------------------------------------------------------
# Trade Journal Models
# -------------------------------------------------------------------

class TagCategory(models.Model):
    """System + user-defined tag groups for trade journaling."""
    CATEGORY_TYPE_CHOICES = [
        ('strategy', 'Strategy'),
        ('setup', 'Setup'),
        ('mistake', 'Mistake'),
        ('emotion', 'Emotion'),
        ('market_condition', 'Market Condition'),
        ('custom', 'Custom'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES)
    color = models.CharField(max_length=7, default='#28BFFF', help_text='Hex color code')
    icon = models.CharField(max_length=30, blank=True, help_text='Lucide icon name')
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Tag Categories'
        ordering = ['category_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.category_type})"


class TradeTag(models.Model):
    """Per-user tags within categories for trade annotation."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trade_tags')
    category = models.ForeignKey(TagCategory, on_delete=models.CASCADE, related_name='tags')
    name = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#28BFFF')
    usage_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'name')]
        ordering = ['-usage_count', 'name']

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class TradeJournalEntry(models.Model):
    """OneToOne with MT5Trade - trader annotations per trade."""
    EMOTIONAL_STATE_CHOICES = [
        ('confident', 'Confident'),
        ('calm', 'Calm'),
        ('anxious', 'Anxious'),
        ('fearful', 'Fearful'),
        ('greedy', 'Greedy'),
        ('frustrated', 'Frustrated'),
        ('revenge', 'Revenge Trading'),
        ('fomo', 'FOMO'),
        ('bored', 'Bored'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_entries')
    enrollment = models.ForeignKey(
        ChallengeEnrollment, on_delete=models.CASCADE,
        related_name='journal_entries', null=True, blank=True
    )
    trade = models.OneToOneField(
        MT5Trade, on_delete=models.CASCADE,
        related_name='journal_entry'
    )

    # Notes
    notes = models.TextField(blank=True)
    setup_description = models.TextField(blank=True)

    # Tags
    tags = models.ManyToManyField(TradeTag, blank=True, related_name='journal_entries')

    # Rating
    rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text='1-5 rating')

    # Plan tracking
    planned_entry = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    planned_sl = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    planned_tp = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    followed_plan = models.BooleanField(null=True, blank=True)

    # Psychology
    emotional_state = models.CharField(
        max_length=20, choices=EMOTIONAL_STATE_CHOICES, blank=True
    )

    # Screenshots (BunnyCDN URLs)
    screenshot_entry = models.URLField(max_length=500, blank=True)
    screenshot_exit = models.URLField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'enrollment']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Journal for Trade #{self.trade.order}"


class TradingSession(models.Model):
    """Daily session journal with psychology tracking."""
    EMOTIONAL_STATE_CHOICES = TradeJournalEntry.EMOTIONAL_STATE_CHOICES
    MARKET_CONDITION_CHOICES = [
        ('trending', 'Trending'),
        ('ranging', 'Ranging'),
        ('volatile', 'Volatile'),
        ('low_vol', 'Low Volatility'),
        ('news_driven', 'News Driven'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trading_sessions')
    enrollment = models.ForeignKey(
        ChallengeEnrollment, on_delete=models.CASCADE,
        related_name='trading_sessions', null=True, blank=True
    )
    date = models.DateField()

    # Notes
    pre_session_notes = models.TextField(blank=True)
    post_session_notes = models.TextField(blank=True)
    key_lessons = models.TextField(blank=True)

    # Psychology
    energy_level = models.PositiveSmallIntegerField(null=True, blank=True, help_text='1-5')
    discipline_score = models.PositiveSmallIntegerField(null=True, blank=True, help_text='1-5')
    emotional_state_start = models.CharField(
        max_length=20, choices=EMOTIONAL_STATE_CHOICES, blank=True
    )
    emotional_state_end = models.CharField(
        max_length=20, choices=EMOTIONAL_STATE_CHOICES, blank=True
    )

    # Market context
    market_conditions = models.CharField(
        max_length=20, choices=MARKET_CONDITION_CHOICES, blank=True
    )

    # Rules
    followed_rules = models.BooleanField(null=True, blank=True)
    rule_violations = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('user', 'enrollment', 'date')]
        ordering = ['-date']

    def __str__(self):
        return f"Session {self.date} - {self.user.username}"


class JournalInsight(models.Model):
    """Cached AI-generated insights for trade journal."""
    INSIGHT_TYPE_CHOICES = [
        ('daily_summary', 'Daily Summary'),
        ('weekly_report', 'Weekly Report'),
        ('monthly_report', 'Monthly Report'),
        ('pattern_detection', 'Pattern Detection'),
        ('chat_response', 'Chat Response'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_insights')
    enrollment = models.ForeignKey(
        ChallengeEnrollment, on_delete=models.CASCADE,
        related_name='journal_insights', null=True, blank=True
    )

    insight_type = models.CharField(max_length=20, choices=INSIGHT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    prompt_hash = models.CharField(max_length=64, blank=True, db_index=True)
    input_data = models.JSONField(default=dict, blank=True)
    content = models.JSONField(default=dict, blank=True)

    question = models.TextField(blank=True, help_text='For chat Q&A')

    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    model_used = models.CharField(max_length=50, blank=True)
    tokens_used = models.PositiveIntegerField(default=0)
    generation_time_ms = models.PositiveIntegerField(default=0)

    expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'insight_type']),
            models.Index(fields=['prompt_hash']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'enrollment', 'insight_type', 'period_start'],
                name='unique_journal_insight_per_period',
            ),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.insight_type} - {self.user.username}"


class JournalConfig(models.Model):
    """Per-user journal preferences."""
    CALENDAR_VIEW_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='journal_config')

    auto_tag_enabled = models.BooleanField(default=True)
    ai_insights_enabled = models.BooleanField(default=True)
    daily_reminder_enabled = models.BooleanField(default=False)

    default_chart_period = models.CharField(max_length=10, default='30d')
    calendar_view = models.CharField(
        max_length=10, choices=CALENDAR_VIEW_CHOICES, default='monthly'
    )
    breach_alert_threshold = models.PositiveSmallIntegerField(
        default=80, help_text='Alert at this % of limit'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"JournalConfig - {self.user.username}"


class MentorAccess(models.Model):
    """Mentor/coach sharing for journal."""
    ACCESS_LEVEL_CHOICES = [
        ('read_only', 'Read Only'),
        ('comment', 'Comment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trader = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='mentor_grants'
    )
    mentor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='mentee_access'
    )

    access_level = models.CharField(
        max_length=10, choices=ACCESS_LEVEL_CHOICES, default='read_only'
    )
    is_active = models.BooleanField(default=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    shared_enrollments = models.ManyToManyField(
        ChallengeEnrollment, blank=True, related_name='mentor_shares'
    )

    class Meta:
        unique_together = [('trader', 'mentor')]

    def __str__(self):
        return f"Mentor: {self.mentor.username} -> {self.trader.username}"


class JournalShareLink(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journal_share_links')
    enrollment = models.ForeignKey(ChallengeEnrollment, on_delete=models.CASCADE, related_name='share_links')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('user', 'enrollment')]

    def __str__(self):
        return f"ShareLink: {self.user.username} - {self.enrollment.mt5_account_id}"


# -------------------------------------------------------------------
# Release Notes
# -------------------------------------------------------------------

class Release(models.Model):
    REPO_CHOICES = [
        ('api', 'API'),
        ('crm', 'CRM'),
        ('app', 'App'),
        ('website', 'Website'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(help_text="Markdown-formatted release notes")
    version = models.CharField(max_length=30, blank=True)
    release_date = models.DateField()
    repos_affected = ArrayField(
        models.CharField(max_length=20, choices=REPO_CHOICES),
        default=list,
        help_text="Which repositories this release touches"
    )
    is_major = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='releases'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-release_date']
        indexes = [
            models.Index(fields=['-release_date']),
        ]

    def __str__(self):
        return f"{self.title} ({self.version})" if self.version else self.title


# ==========================================
# Blog Models
# ==========================================

class BlogCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = 'Blog Categories'

    def __str__(self):
        return self.name


class BlogTag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=60)
    slug = models.SlugField(max_length=80, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class BlogPost(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Content
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    excerpt = models.TextField(max_length=500, blank=True,
        help_text="Short summary shown in listings and meta description")
    content = models.TextField(blank=True, help_text="HTML content from rich text editor")

    # Taxonomy
    category = models.ForeignKey(BlogCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='posts')
    tags = models.ManyToManyField(BlogTag, blank=True, related_name='posts')

    # Media
    featured_image = models.URLField(max_length=500, blank=True,
        help_text="BunnyCDN URL for featured/hero image")
    featured_image_alt = models.CharField(max_length=255, blank=True,
        help_text="Alt text for featured image (SEO)")

    # SEO
    meta_title = models.CharField(max_length=70, blank=True,
        help_text="Custom title for search results (max 60 chars recommended)")
    meta_description = models.CharField(max_length=160, blank=True,
        help_text="Custom description for search results")
    focus_keyword = models.CharField(max_length=100, blank=True,
        help_text="Primary keyword this article targets")
    canonical_url = models.URLField(max_length=500, blank=True)

    # Publishing
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='blog_posts')
    author_display_name = models.CharField(max_length=100, blank=True,
        help_text="Public author name (defaults to user's full name)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Metadata
    reading_time_minutes = models.PositiveIntegerField(default=0)
    ai_generated = models.BooleanField(default=False,
        help_text="Whether AI assisted in content generation")
    ai_metadata = models.JSONField(default=dict, blank=True,
        help_text="AI generation details: model, prompts, topic research")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['status', '-published_at']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return self.title


# ==========================================
# Website E-Commerce Models
# ==========================================

class WebsiteProduct(models.Model):
    """
    Represents a challenge product displayed on the marketing website.
    """
    CHALLENGE_TYPE_CHOICES = [
        ('1-step-algo', '1-Step Algo'),
        ('1-step-pro', '1-Step Pro'),
        ('2-step', '2-Step'),
        ('instant-funding', 'Instant Funding'),
    ]

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    sku_prefix = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    challenge_type = models.CharField(max_length=20, choices=CHALLENGE_TYPE_CHOICES)
    challenge = models.ForeignKey(
        Challenge,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='website_products',
        help_text="Link to the Challenge model for enrollment creation"
    )
    is_active = models.BooleanField(default=True)
    is_pay_after_pass = models.BooleanField(
        default=False,
        help_text="If True, clients pay a small entry fee upfront and full price only after passing the challenge"
    )
    pap_addon_flat_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=5,
        help_text="Flat fee charged per add-on during PAP initial purchase (full add-on price charged on completion)"
    )
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_challenge_type_display()})"


class WebsiteProductVariant(models.Model):
    """
    Represents a specific account size/price variant of a website product.
    """
    BROKER_TYPE_CHOICES = [
        ('mt5', 'MetaTrader 5'),
        ('ctrader', 'cTrader'),
        ('tradelocker', 'TradeLocker'),
    ]

    product = models.ForeignKey(
        WebsiteProduct, on_delete=models.CASCADE, related_name='variants'
    )
    account_size = models.IntegerField(help_text="Account size in USD (e.g. 10000, 25000, 50000)")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    entry_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Entry fee for Pay After Pass products (charged upfront instead of full price)"
    )
    original_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Original price before discount (shown as strikethrough)"
    )
    sku = models.CharField(max_length=100, unique=True)
    broker_type = models.CharField(max_length=20, choices=BROKER_TYPE_CHOICES, default='mt5')
    currency = models.CharField(max_length=10, default='USD')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'account_size']
        unique_together = ('product', 'account_size', 'broker_type')

    def __str__(self):
        return f"{self.product.name} - ${self.account_size:,} ({self.broker_type})"


class WebsiteProductAddon(models.Model):
    """
    Represents an optional add-on that can be purchased with a website product.
    """
    PRICE_TYPE_CHOICES = [
        ('fixed', 'Fixed Price'),
        ('percentage', 'Percentage of Variant Price'),
        ('free', 'Free'),
    ]

    EFFECT_TYPE_CHOICES = [
        ('none', 'No Effect'),
        ('profit_split', 'Profit Split Override'),
        ('accelerated_payout', 'Accelerated Payout'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price_type = models.CharField(max_length=10, choices=PRICE_TYPE_CHOICES, default='fixed')
    price_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    products = models.ManyToManyField(
        WebsiteProduct, related_name='addons', blank=True,
        help_text="Products this addon is available for. Leave blank for all products."
    )
    effect_type = models.CharField(
        max_length=30, choices=EFFECT_TYPE_CHOICES, default='none',
        help_text="Automation effect when this addon is purchased"
    )
    effect_value = models.CharField(
        max_length=50, blank=True, default='',
        help_text="Value for the effect (e.g. 90 for 90% profit split, 14 for 14-day payout delay)"
    )
    effect_from_payout = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Apply profit split effect from this payout number onwards (e.g. 3 for third payout)"
    )

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.name} (${self.price_value})" if self.price_type == 'fixed' else f"{self.name} (Free)"


class DiscountCode(models.Model):
    """Discount/coupon codes for the website checkout."""
    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
        ('buy_one_get_one', 'Buy One Get One'),
    ]

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_uses = models.IntegerField(null=True, blank=True, help_text="Max number of uses. Null = unlimited.")
    current_uses = models.IntegerField(default=0)
    usage_limit_per_user = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Max uses per customer (by email). Null = unlimited."
    )
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    applicable_products = models.ManyToManyField(
        WebsiteProduct, related_name='discount_codes', blank=True,
        help_text="Products this code applies to. Leave blank for all products."
    )
    bogo_challenge_types = models.JSONField(
        default=list, blank=True,
        help_text="Challenge types eligible for free second enrollment (e.g. ['1-step-algo', '2-step'])."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.discount_type == 'buy_one_get_one':
            if self.discount_value > 0:
                return f"{self.code} ({self.discount_value}% off + BOGO)"
            return f"{self.code} (BOGO)"
        if self.discount_type == 'percentage':
            return f"{self.code} ({self.discount_value}% off)"
        return f"{self.code} (${self.discount_value} off)"


class WebsiteOrder(models.Model):
    """Orders created through the website checkout flow."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('awaiting_payment', 'Awaiting Payment'),
        ('paid', 'Paid'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('failed', 'Failed'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('card', 'Card (Paytiko)'),
        ('crypto', 'Crypto (Confirmo)'),
        ('paypal', 'PayPal'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='website_order',
        null=True, blank=True,
        help_text="Link to the main Order record (created after payment confirmation)"
    )

    # Customer info
    customer_email = models.EmailField()
    customer_first_name = models.CharField(max_length=100)
    customer_last_name = models.CharField(max_length=100)
    customer_country = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=50, blank=True)
    customer_address = models.JSONField(default=dict, blank=True)
    customer_ip = models.GenericIPAddressField(null=True, blank=True)

    # Product info
    variant = models.ForeignKey(
        WebsiteProductVariant, on_delete=models.SET_NULL, null=True, related_name='website_orders'
    )
    addons = models.ManyToManyField(WebsiteProductAddon, blank=True)

    # Pricing
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    addon_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='USD')

    # Discount
    discount_code = models.ForeignKey(
        DiscountCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='website_orders'
    )

    # Payment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True)
    payment_id = models.CharField(max_length=255, blank=True, help_text="External payment gateway transaction ID")
    payment_url = models.URLField(max_length=500, blank=True, help_text="Payment gateway redirect URL")

    # Pay After Pass: link to existing enrollment for completion payments
    pap_enrollment = models.ForeignKey(
        'ChallengeEnrollment', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pap_orders',
        help_text="For PAP completion orders: the enrollment that passed and needs full payment"
    )

    # Affiliate tracking
    referral_code = models.CharField(max_length=50, blank=True)

    # Webhook data
    webhook_payload = models.JSONField(default=dict, blank=True)

    # Zoho Books
    zoho_invoice_number = models.PositiveIntegerField(null=True, blank=True, unique=True)
    zoho_contact_id = models.CharField(max_length=50, blank=True, default="")
    zoho_invoice_id = models.CharField(max_length=50, blank=True, default="")
    zoho_payment_id = models.CharField(max_length=50, blank=True, default="")

    # Facebook tracking
    tracking_data = models.JSONField(default=dict, blank=True, help_text='Facebook Pixel tracking data (fbp, fbc, user_agent)')

    # Klaviyo
    klaviyo_abandoned_sent = models.BooleanField(default=False)

    # Sequential order number (assigned on completion, starting at 40000)
    order_number = models.PositiveIntegerField(null=True, blank=True, unique=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"WebsiteOrder {self.id} - {self.customer_email} ({self.status})"

    def save(self, *args, **kwargs):
        if self.status == 'completed' and not self.order_number:
            from django.db import transaction
            with transaction.atomic():
                last = (
                    WebsiteOrder.objects
                    .select_for_update()
                    .filter(order_number__isnull=False)
                    .order_by('-order_number')
                    .values_list('order_number', flat=True)
                    .first()
                )
                self.order_number = (last + 1) if last else 40000
                update_fields = kwargs.get('update_fields')
                if update_fields is not None and 'order_number' not in update_fields:
                    update_fields.append('order_number')
                super().save(*args, **kwargs)
            return
        super().save(*args, **kwargs)


# ==========================================
# Zoho Sync Models
# ==========================================

class ZohoSyncJob(models.Model):
    """Tracks a Zoho Books API sync job executed via Celery."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('syncing_contacts', 'Syncing Contacts'),
        ('syncing_invoices', 'Syncing Invoices'),
        ('syncing_payments', 'Syncing Payments'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    date_from = models.DateField()
    date_to = models.DateField()
    start_invoice_number = models.PositiveIntegerField()

    total_orders = models.PositiveIntegerField(default=0)

    contacts_synced = models.PositiveIntegerField(default=0)
    contacts_skipped = models.PositiveIntegerField(default=0)
    contacts_failed = models.PositiveIntegerField(default=0)

    invoices_synced = models.PositiveIntegerField(default=0)
    invoices_skipped = models.PositiveIntegerField(default=0)
    invoices_failed = models.PositiveIntegerField(default=0)

    payments_synced = models.PositiveIntegerField(default=0)
    payments_skipped = models.PositiveIntegerField(default=0)
    payments_failed = models.PositiveIntegerField(default=0)

    errors = models.JSONField(default=list, blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True, default="")

    triggered_by = models.ForeignKey(
        'User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='zoho_sync_jobs'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ZohoSyncJob {self.id} ({self.status})"

    @property
    def progress_percent(self):
        if self.status == "completed":
            return 100
        if self.status == "failed":
            return 100
        if self.total_orders == 0:
            return 0

        contacts_done = self.contacts_synced + self.contacts_skipped + self.contacts_failed
        invoices_done = self.invoices_synced + self.invoices_skipped + self.invoices_failed
        payments_done = self.payments_synced + self.payments_skipped + self.payments_failed

        phase_pct = 0
        if self.status in ("syncing_contacts", "pending"):
            phase_pct = int((contacts_done / self.total_orders) * 33)
        elif self.status == "syncing_invoices":
            phase_pct = 33 + int((invoices_done / self.total_orders) * 33)
        elif self.status == "syncing_payments":
            denom = max(self.total_orders, 1)
            phase_pct = 66 + int((payments_done / denom) * 34)

        return min(99, phase_pct)


# -------------------------------------------------------------------
# WeMeet Booking System
# -------------------------------------------------------------------

class MeetingProfile(models.Model):
    """
    Admin's booking page configuration. One per staff user.
    Public page at meet.we-fund.com/:slug
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='meeting_profile'
    )
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    headline = models.CharField(max_length=200, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    durations_offered = ArrayField(
        models.IntegerField(),
        default=list,
        help_text='Subset of [15, 30, 60] minutes'
    )
    default_duration = models.IntegerField(default=30)
    timezone = models.CharField(max_length=50, default='UTC')
    buffer_minutes = models.IntegerField(default=10)
    max_days_ahead = models.IntegerField(default=30)
    min_notice_hours = models.IntegerField(default=24, help_text='Minimum hours before a slot can be booked. 0 = no restriction.')
    is_active = models.BooleanField(default=True)

    # Google Calendar integration
    google_calendar_connected = models.BooleanField(default=False)
    google_access_token = models.TextField(blank=True, default='')
    google_refresh_token = models.TextField(blank=True, default='')
    google_token_expiry = models.DateTimeField(null=True, blank=True)
    google_calendar_id = models.CharField(max_length=200, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Meeting profile for {self.user.username} ({self.slug})"


class MeetingAvailability(models.Model):
    """Weekly recurring available time windows."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting_profile = models.ForeignKey(
        MeetingProfile,
        on_delete=models.CASCADE,
        related_name='availabilities'
    )
    day_of_week = models.IntegerField(
        help_text='0=Monday, 6=Sunday'
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('meeting_profile', 'day_of_week', 'start_time')
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return f"{days[self.day_of_week]} {self.start_time}-{self.end_time}"


class MeetingDateOverride(models.Model):
    """Block or add custom availability for specific dates."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting_profile = models.ForeignKey(
        MeetingProfile,
        on_delete=models.CASCADE,
        related_name='date_overrides'
    )
    date = models.DateField()
    is_blocked = models.BooleanField(
        default=True,
        help_text='True=entire day blocked, False=custom hours below'
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)

    class Meta:
        unique_together = ('meeting_profile', 'date', 'start_time')
        ordering = ['date']

    def __str__(self):
        status = 'Blocked' if self.is_blocked else f'{self.start_time}-{self.end_time}'
        return f"{self.date} - {status}"


class MeetingBooking(models.Model):
    """Individual booked meeting."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting_profile = models.ForeignKey(
        MeetingProfile,
        on_delete=models.CASCADE,
        related_name='bookings'
    )
    guest_name = models.CharField(max_length=200)
    guest_email = models.EmailField()
    guest_notes = models.TextField(blank=True, default='')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_minutes = models.IntegerField()
    timezone = models.CharField(max_length=50, help_text="Guest's timezone")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    daily_room_name = models.CharField(max_length=100, blank=True, default='')
    daily_room_url = models.URLField(blank=True, default='')
    cancel_token = models.UUIDField(default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['start_time']),
            models.Index(fields=['status']),
            models.Index(fields=['meeting_profile', 'start_time']),
        ]

    def __str__(self):
        return f"Booking: {self.guest_name} with {self.meeting_profile.user.username} at {self.start_time}"


# -------------------------------------------------------------------
# WhatsApp AI Sales Agent Models
# -------------------------------------------------------------------

class WhatsAppConversation(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('human_handoff', 'Human Handoff'),
        ('resolved', 'Resolved'),
        ('archived', 'Archived'),
    ]
    LEAD_STATUS_CHOICES = [
        ('new', 'New'),
        ('engaged', 'Engaged'),
        ('qualified', 'Qualified'),
        ('converted', 'Converted'),
        ('lost', 'Lost'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wa_id = models.CharField(max_length=30, unique=True, db_index=True, help_text="E.164 phone number")
    profile_name = models.CharField(max_length=200, blank=True, default='')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='whatsapp_conversations',
        help_text="Linked when prospect registers"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    ai_enabled = models.BooleanField(default=True)
    assigned_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='whatsapp_assigned_conversations'
    )
    lead_status = models.CharField(max_length=20, choices=LEAD_STATUS_CHOICES, default='new')
    lead_data = models.JSONField(default=dict, blank=True, help_text="name, email, country, trading_experience, interested_products")
    last_message_at = models.DateTimeField(null=True, blank=True)
    message_count = models.IntegerField(default=0)
    ai_message_count = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['lead_status']),
            models.Index(fields=['last_message_at']),
        ]

    def __str__(self):
        return f"WhatsApp: {self.profile_name or self.wa_id} ({self.status})"


class WhatsAppMessage(models.Model):
    DIRECTION_CHOICES = [
        ('inbound', 'Inbound'),
        ('outbound', 'Outbound'),
    ]
    SENDER_TYPE_CHOICES = [
        ('user', 'User'),
        ('ai', 'AI'),
        ('agent', 'Agent'),
        ('system', 'System'),
    ]
    DELIVERY_STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        WhatsAppConversation, on_delete=models.CASCADE, related_name='messages'
    )
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    sender_type = models.CharField(max_length=10, choices=SENDER_TYPE_CHOICES)
    content = models.TextField()
    twilio_sid = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, null=True, blank=True)
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='whatsapp_messages_sent'
    )
    ai_model_used = models.CharField(max_length=100, blank=True, default='')
    ai_tokens_used = models.IntegerField(null=True, blank=True)
    ai_tool_calls = models.JSONField(default=list, blank=True)
    is_internal = models.BooleanField(default=False, help_text="Internal note, not sent via WhatsApp")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f"{self.sender_type} ({self.direction}): {self.content[:50]}"


class WhatsAppBotConfig(models.Model):
    bot_enabled = models.BooleanField(default=True)
    ai_model = models.CharField(max_length=100, blank=True, default='')
    ai_temperature = models.FloatField(default=0.3)
    ai_max_tokens = models.IntegerField(default=1024)
    system_prompt_override = models.TextField(blank=True, default='', help_text="Merged with base prompt")
    greeting_message = models.TextField(blank=True, default="Hello! Welcome to WeFund. How can I help you today?")
    handoff_message = models.TextField(blank=True, default="I'm connecting you with a human agent who can help you further. Please hold on!")
    out_of_hours_message = models.TextField(blank=True, default='')
    max_ai_messages_per_hour = models.IntegerField(default=30)
    max_messages_per_conversation_per_day = models.IntegerField(default=100)
    escalation_keywords = models.JSONField(
        default=list, blank=True,
        help_text="Keywords that trigger auto-handoff, e.g. ['speak to human', 'agent', 'manager']"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "WhatsApp Bot Configuration"
        verbose_name_plural = "WhatsApp Bot Configuration"

    def __str__(self):
        return f"WhatsApp Bot Config (enabled={self.bot_enabled})"

    def save(self, *args, **kwargs):
        # Singleton pattern: ensure only one config exists
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        config, _ = cls.objects.get_or_create(pk=1)
        return config


# -------------------------------------------------------------------
# Agent Shift Scheduling for Customer Service
# -------------------------------------------------------------------

class AgentShiftSchedule(models.Model):
    """Weekly recurring shift windows for support agents."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shift_schedules'
    )
    day_of_week = models.IntegerField(
        help_text='0=Monday, 6=Sunday'
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    timezone = models.CharField(max_length=50, default='UTC')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('agent', 'day_of_week', 'start_time')
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return f"{self.agent.get_full_name() or self.agent.email} - {days[self.day_of_week]} {self.start_time}-{self.end_time}"


class AgentShiftOverride(models.Model):
    """Date-specific shift exceptions (day off or custom hours)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shift_overrides'
    )
    date = models.DateField()
    is_blocked = models.BooleanField(
        default=True,
        help_text='True=day off, False=custom hours below'
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    reason = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('agent', 'date', 'start_time')
        ordering = ['date']

    def __str__(self):
        status = 'Day off' if self.is_blocked else f'{self.start_time}-{self.end_time}'
        return f"{self.agent.get_full_name() or self.agent.email} - {self.date} ({status})"

class AutoRewardRule(models.Model):
    TRIGGER_CHOICES = [
        ('purchase', 'Challenge Purchase'),
        ('payout_approved', 'Payout Approved'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_CHOICES)
    threshold = models.PositiveIntegerField(help_text="Number of events required to trigger this reward")
    reward_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="WeCoins to grant when milestone is reached")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['trigger_type', 'threshold']
        unique_together = ('trigger_type', 'threshold')

    def __str__(self):
        return f"{self.title} ({self.get_trigger_type_display()} × {self.threshold} → {self.reward_amount} WeCoins)"


class AutoRewardGrant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='auto_reward_grants'
    )
    rule = models.ForeignKey(
        AutoRewardRule,
        on_delete=models.CASCADE,
        related_name='grants'
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'rule')

    def __str__(self):
        return f"{self.user.username} → {self.rule.title}"


# Import RBAC models so Django discovers them in this app
from wefund.rbac_models import Permission, Role  # noqa: E402, F401

