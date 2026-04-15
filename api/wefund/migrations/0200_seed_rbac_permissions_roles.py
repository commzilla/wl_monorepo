from django.db import migrations


PERMISSIONS = [
    # Dashboard
    ("dashboard.view", "View Dashboard", "dashboard", "Access the main dashboard"),
    ("dashboard.view_stats", "View Dashboard Statistics", "dashboard", "View dashboard statistics and metrics"),

    # Traders
    ("traders.view", "View Traders", "traders", "View trader list"),
    ("traders.view_detail", "View Trader Details", "traders", "View individual trader details"),
    ("traders.edit", "Edit Traders", "traders", "Edit trader information"),
    ("traders.add", "Add Traders", "traders", "Create new traders"),
    ("traders.delete", "Delete Traders", "traders", "Delete traders"),
    ("traders.reset_password", "Reset Trader Password", "traders", "Reset trader passwords"),
    ("traders.impersonate", "Impersonate Trader", "traders", "Log in as a trader"),

    # Challenges
    ("challenges.view", "View Challenges", "challenges", "View challenge list"),
    ("challenges.create", "Create Challenges", "challenges", "Create new challenges"),
    ("challenges.delete", "Delete Challenges", "challenges", "Delete challenges"),

    # Enrollments
    ("enrollments.view", "View Enrollments", "enrollments", "View enrollment list"),
    ("enrollments.review", "Review Enrollments", "enrollments", "Review and approve enrollments"),
    ("enrollments.manual_upgrade", "Manual Upgrade", "enrollments", "Manually upgrade enrollments"),
    ("enrollments.breach_scan", "Run Breach Scan", "enrollments", "Run breach scans on enrollments"),
    ("enrollments.revert_breach", "Revert Breach", "enrollments", "Revert breach status"),
    ("enrollments.bulk_import", "Bulk Import", "enrollments", "Bulk import enrollments"),
    ("enrollments.export", "Export Enrollments", "enrollments", "Export enrollment data"),

    # Trades & MT5
    ("trades.view", "View Trades", "trades", "View trade history"),
    ("trades.sync", "Sync Trades", "trades", "Sync trades from MT5"),
    ("mt5.activate_trading", "Activate Trading", "mt5", "Activate MT5 trading"),
    ("mt5.disable_trading", "Disable Trading", "mt5", "Disable MT5 trading"),
    ("mt5.enable_account", "Enable Account", "mt5", "Enable MT5 account"),
    ("mt5.disable_account", "Disable Account", "mt5", "Disable MT5 account"),
    ("mt5.change_group", "Change Group", "mt5", "Change MT5 account group"),
    ("mt5.change_password", "Change Password", "mt5", "Change MT5 account password"),
    ("mt5.retry_create", "Retry Create", "mt5", "Retry MT5 account creation"),

    # Payouts
    ("payouts.view", "View Payouts", "payouts", "View payout requests"),
    ("payouts.approve", "Approve Payouts", "payouts", "Approve or reject payouts"),
    ("payouts.create", "Create Payouts", "payouts", "Create manual payouts"),
    ("payouts.extend_review", "Extend Review", "payouts", "Extend payout review period"),
    ("payouts.export", "Export Payouts", "payouts", "Export payout data"),
    ("payouts.view_config", "View Payout Config", "payouts", "View payout configuration"),
    ("payouts.edit_config", "Edit Payout Config", "payouts", "Edit payout configuration"),
    ("payouts.import_config", "Import Payout Config", "payouts", "Import payout configuration"),
    ("payouts.trigger_analysis", "Trigger Analysis", "payouts", "Trigger payout analysis"),

    # Orders
    ("orders.view", "View Orders", "orders", "View order list"),
    ("orders.delete", "Delete Orders", "orders", "Delete orders"),
    ("orders.export", "Export Orders", "orders", "Export order data"),
    ("orders.assign_affiliate", "Assign Affiliate", "orders", "Assign affiliate to orders"),

    # Website
    ("website_products.view", "View Products", "website", "View website products"),
    ("website_products.create", "Create Products", "website", "Create website products"),
    ("website_products.delete", "Delete Products", "website", "Delete website products"),
    ("discount_codes.view", "View Discount Codes", "website", "View discount codes"),
    ("discount_codes.create", "Create Discount Codes", "website", "Create discount codes"),
    ("discount_codes.delete", "Delete Discount Codes", "website", "Delete discount codes"),
    ("website_orders.view", "View Website Orders", "website", "View website orders"),
    ("website_orders.export", "Export Website Orders", "website", "Export website orders"),

    # KYC
    ("kyc.view", "View KYC", "kyc", "View KYC submissions"),
    ("kyc.manage", "Manage KYC", "kyc", "Approve or reject KYC submissions"),

    # Risk
    ("risk.view_dashboard", "View Risk Dashboard", "risk", "View risk dashboard"),
    ("risk.view_stoploss", "View Stop Loss", "risk", "View stop loss history"),
    ("risk.view_ip_analysis", "View IP Analysis", "risk", "View IP analysis"),
    ("risk.view_top_earners", "View Top Earners", "risk", "View top earning traders"),
    ("risk.view_copy_trading", "View Copy Trading", "risk", "View copy trading detection"),
    ("risk.view_hedging", "View Hedging", "risk", "View hedging detection"),
    ("risk.run_scan", "Run Scan", "risk", "Run risk scans"),
    ("risk.manage_ea", "Manage EA", "risk", "Manage expert advisors"),
    ("risk.ai_analysis", "AI Analysis", "risk", "Use AI risk analysis"),
    ("risk.ai_learning", "AI Learning", "risk", "Access AI learning center"),

    # Affiliates
    ("affiliates.view", "View Affiliates", "affiliates", "View affiliate list"),
    ("affiliates.manage", "Manage Affiliates", "affiliates", "Manage affiliates"),
    ("affiliates.assign_referral", "Assign Referral", "affiliates", "Assign referral codes"),
    ("affiliates.assign_tier", "Assign Tier", "affiliates", "Assign commission tiers"),
    ("affiliates.view_payouts", "View Affiliate Payouts", "affiliates", "View affiliate payouts"),
    ("affiliates.manage_payouts", "Manage Affiliate Payouts", "affiliates", "Manage affiliate payouts"),
    ("affiliates.convert_to_client", "Convert to Client", "affiliates", "Convert affiliate to client"),
    ("affiliates.reset_password", "Reset Password", "affiliates", "Reset affiliate password"),

    # WeCoins
    ("wecoins.view_tasks", "View Tasks", "wecoins", "View WeCoins tasks"),
    ("wecoins.manage_tasks", "Manage Tasks", "wecoins", "Create and manage WeCoins tasks"),
    ("wecoins.view_submissions", "View Submissions", "wecoins", "View task submissions"),
    ("wecoins.manage_submissions", "Manage Submissions", "wecoins", "Approve or reject submissions"),
    ("wecoins.view_redeem_items", "View Redeem Items", "wecoins", "View redeemable items"),
    ("wecoins.manage_redeem_items", "Manage Redeem Items", "wecoins", "Manage redeemable items"),
    ("wecoins.view_redemptions", "View Redemptions", "wecoins", "View redemption requests"),
    ("wecoins.manage_redemptions", "Manage Redemptions", "wecoins", "Manage redemption requests"),
    ("wecoins.view_ledger", "View Ledger", "wecoins", "View WeCoins ledger"),
    ("wecoins.manage_beta", "Manage Beta", "wecoins", "Manage WeCoins beta features"),

    # Competitions
    ("competitions.view", "View Competitions", "competitions", "View competitions"),
    ("competitions.manage", "Manage Competitions", "competitions", "Create and manage competitions"),
    ("competitions.view_registrations", "View Registrations", "competitions", "View competition registrations"),
    ("competitions.view_leaderboard", "View Leaderboard", "competitions", "View competition leaderboard"),
    ("competitions.export_leaderboard", "Export Leaderboard", "competitions", "Export leaderboard data"),
    ("competitions.manage_beta", "Manage Beta", "competitions", "Manage competition beta features"),

    # Communication
    ("support.view", "View Support", "communication", "View support conversations"),
    ("support.manage", "Manage Support", "communication", "Manage support conversations"),
    ("support.view_config", "View Support Config", "communication", "View support configuration"),
    ("support.manage_config", "Manage Support Config", "communication", "Manage support configuration"),
    ("meetings.view", "View Meetings", "communication", "View meetings"),
    ("meetings.manage", "Manage Meetings", "communication", "Manage meetings"),
    ("whatsapp.view", "View WhatsApp", "communication", "View WhatsApp conversations"),
    ("whatsapp.manage", "Manage WhatsApp", "communication", "Manage WhatsApp conversations"),
    ("notifications.view", "View Notifications", "communication", "View notifications"),
    ("notifications.manage", "Manage Notifications", "communication", "Manage notifications"),
    ("email.view", "View Email", "communication", "View email templates and logs"),
    ("email.manage", "Manage Email", "communication", "Manage email templates"),

    # Content
    ("blog.view", "View Blog", "content", "View blog posts"),
    ("blog.manage", "Manage Blog", "content", "Create and manage blog posts"),
    ("blog.ai_generate", "AI Generate", "content", "Use AI to generate blog content"),
    ("faq.view", "View FAQ", "content", "View FAQ articles"),
    ("faq.manage", "Manage FAQ", "content", "Create and manage FAQ articles"),
    ("economic_calendar.view", "View Economic Calendar", "content", "View economic calendar"),
    ("economic_calendar.manage", "Manage Economic Calendar", "content", "Manage economic calendar"),

    # Analytics
    ("analytics.view_challenge_payouts", "View Challenge Payouts", "analytics", "View challenge-wise payouts"),
    ("analytics.view_account_size_payouts", "View Account Size Payouts", "analytics", "View account size-wise payouts"),
    ("analytics.view_country_payouts", "View Country Payouts", "analytics", "View country-wise payouts"),
    ("analytics.view_unprofitable_countries", "View Unprofitable Countries", "analytics", "View unprofitable countries"),
    ("analytics.view_risk_metrics", "View Risk Metrics", "analytics", "View risk core metrics"),
    ("analytics.view_trends", "View Trends", "analytics", "View trends analytics"),
    ("analytics.view_trader_behavior", "View Trader Behavior", "analytics", "View trader behavior analytics"),
    ("analytics.view_trader_journey", "View Trader Journey", "analytics", "View trader journey analytics"),

    # System
    ("config.view", "View Configuration", "system", "View system configuration"),
    ("config.edit", "Edit Configuration", "system", "Edit system configuration"),
    ("config.manage_beta_features", "Manage Beta Features", "system", "Manage beta feature flags"),
    ("config.manage_ai_rules", "Manage AI Rules", "system", "Manage AI rules and settings"),
    ("system.view_health", "View Health", "system", "View system health"),
    ("system.view_activity_logs", "View Activity Logs", "system", "View activity logs"),
    ("system.view_event_logs", "View Event Logs", "system", "View event logs"),
    ("system.view_releases", "View Releases", "system", "View release notes"),
    ("system.manage_engine", "Manage Engine", "system", "Manage engine supervisor"),
    ("system.zoho_export", "Zoho Export", "system", "Export data to Zoho"),
    ("system.view_migration_logs", "View Migration Logs", "system", "View migration logs"),

    # Admin
    ("users.view", "View Users", "admin", "View admin users"),
    ("users.create", "Create Users", "admin", "Create admin users"),
    ("users.edit", "Edit Users", "admin", "Edit admin users"),
    ("users.delete", "Delete Users", "admin", "Delete admin users"),
    ("roles.view", "View Roles", "admin", "View roles"),
    ("roles.create", "Create Roles", "admin", "Create roles"),
    ("roles.edit", "Edit Roles", "admin", "Edit roles"),
    ("roles.delete", "Delete Roles", "admin", "Delete roles"),

    # Certificates
    ("certificates.view", "View Certificates", "certificates", "View certificates"),
    ("certificates.manage", "Manage Certificates", "certificates", "Manage certificates"),

    # Leaderboard
    ("leaderboard.view", "View Leaderboard", "leaderboard", "View leaderboard"),
    ("leaderboard.manage", "Manage Leaderboard", "leaderboard", "Manage leaderboard"),

    # Trading Reports
    ("trading_reports.view", "View Trading Reports", "trading_reports", "View trading reports"),
    ("trading_reports.manage", "Manage Trading Reports", "trading_reports", "Manage trading reports"),
]


# System roles with their permission codenames
SYSTEM_ROLES = {
    "admin": {
        "name": "Admin",
        "slug": "admin",
        "description": "Full system access — all permissions",
        "permissions": "__all__",
    },
    "support": {
        "name": "Support",
        "slug": "support",
        "description": "Customer support access",
        "permissions": [
            "dashboard.view", "dashboard.view_stats",
            "traders.view", "traders.view_detail",
            "challenges.view",
            "trades.view",
            "payouts.view",
            "orders.view",
            "kyc.view", "kyc.manage",
            "support.view", "support.manage",
            "meetings.view", "meetings.manage",
            "notifications.view", "notifications.manage",
            "email.view",
            "certificates.view",
            "system.view_event_logs",
        ],
    },
    "risk": {
        "name": "Risk Analyst",
        "slug": "risk",
        "description": "Risk management and analysis",
        "permissions": [
            "dashboard.view", "dashboard.view_stats",
            "traders.view", "traders.view_detail",
            "challenges.view",
            "enrollments.view", "enrollments.review", "enrollments.breach_scan", "enrollments.revert_breach",
            "trades.view",
            "payouts.view", "payouts.approve", "payouts.trigger_analysis",
            "orders.view",
            "kyc.view", "kyc.manage",
            "risk.view_dashboard", "risk.view_stoploss", "risk.view_ip_analysis",
            "risk.view_top_earners", "risk.view_copy_trading", "risk.view_hedging",
            "risk.run_scan", "risk.manage_ea", "risk.ai_analysis", "risk.ai_learning",
            "analytics.view_challenge_payouts", "analytics.view_account_size_payouts",
            "analytics.view_country_payouts", "analytics.view_unprofitable_countries",
            "analytics.view_risk_metrics", "analytics.view_trends",
            "analytics.view_trader_behavior", "analytics.view_trader_journey",
            "system.view_event_logs",
        ],
    },
    "content_creator": {
        "name": "Content Creator",
        "slug": "content_creator",
        "description": "Blog and content management",
        "permissions": [
            "dashboard.view",
            "blog.view", "blog.manage", "blog.ai_generate",
            "faq.view", "faq.manage",
            "economic_calendar.view", "economic_calendar.manage",
            "certificates.view",
        ],
    },
    "discord_manager": {
        "name": "Discord Manager",
        "slug": "discord_manager",
        "description": "Discord community management",
        "permissions": [
            "dashboard.view", "dashboard.view_stats",
            "traders.view", "traders.view_detail",
            "payouts.view",
            "affiliates.view",
            "wecoins.view_tasks", "wecoins.view_submissions",
            "wecoins.view_redeem_items", "wecoins.view_redemptions", "wecoins.view_ledger",
            "trading_reports.view",
        ],
    },
}


# Mapping from legacy User.role string to RBAC role slug
LEGACY_ROLE_MAP = {
    "admin": "admin",
    "support": "support",
    "risk": "risk",
    "content_creator": "content_creator",
    "discord_manager": "discord_manager",
}


def seed_permissions_and_roles(apps, schema_editor):
    Permission = apps.get_model("wefund", "Permission")
    Role = apps.get_model("wefund", "Role")
    User = apps.get_model("wefund", "User")

    # Create all permissions
    perm_objects = {}
    for codename, name, category, description in PERMISSIONS:
        perm, _ = Permission.objects.get_or_create(
            codename=codename,
            defaults={"name": name, "category": category, "description": description},
        )
        perm_objects[codename] = perm

    all_perm_objs = list(perm_objects.values())

    # Create system roles
    role_objects = {}
    for key, data in SYSTEM_ROLES.items():
        role, _ = Role.objects.get_or_create(
            slug=data["slug"],
            defaults={
                "name": data["name"],
                "description": data["description"],
                "is_system": True,
            },
        )
        if data["permissions"] == "__all__":
            role.permissions.set(all_perm_objs)
        else:
            role.permissions.set([perm_objects[c] for c in data["permissions"] if c in perm_objects])
        role_objects[data["slug"]] = role

    # Map existing CRM users to RBAC roles and fix is_superuser
    for user in User.objects.filter(role__in=LEGACY_ROLE_MAP.keys()):
        slug = LEGACY_ROLE_MAP.get(user.role)
        if slug and slug in role_objects:
            user.rbac_role = role_objects[slug]
            # Only admin role keeps is_superuser
            if slug != "admin":
                user.is_superuser = False
            user.save(update_fields=["rbac_role", "is_superuser"])


def reverse_seed(apps, schema_editor):
    Permission = apps.get_model("wefund", "Permission")
    Role = apps.get_model("wefund", "Role")
    User = apps.get_model("wefund", "User")

    # Restore is_superuser for all CRM staff
    User.objects.filter(is_staff=True).update(is_superuser=True, rbac_role=None)

    Role.objects.filter(is_system=True).delete()
    Permission.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("wefund", "0199_permission_role_user_rbac_role"),
    ]

    operations = [
        migrations.RunPython(seed_permissions_and_roles, reverse_seed),
    ]
