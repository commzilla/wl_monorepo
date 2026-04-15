# WeFund Backend API - Complete Handover Documentation

> **Repository**: `commzilla/wefund-api`
> **Framework**: Django 5.2.3 + Django REST Framework 3.16.0
> **Task Queue**: Celery 5.5.3 with Redis broker
> **Database**: PostgreSQL (psycopg2-binary 2.9.10)
> **Deploys to**: `backend.we-fund.com` (91.99.144.153) + `celery-tasks.we-fund.com` (138.201.186.232)
> **Python**: 3.x (virtualenv at `/home/api/venv/bin/python` on backend, `/home/broker/venv/bin/python` on celery)

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Django Settings & Configuration](#2-django-settings--configuration)
3. [All Django Models (84+)](#3-all-django-models-84)
4. [All API Endpoints](#4-all-api-endpoints)
5. [Serializers](#5-serializers)
6. [Celery Configuration & Tasks](#6-celery-configuration--tasks)
7. [Authentication & JWT](#7-authentication--jwt)
8. [Payment Integrations](#8-payment-integrations)
9. [MT5 (MetaTrader 5) Integration](#9-mt5-metatrader-5-integration)
10. [Risk Evaluation System](#10-risk-evaluation-system)
11. [AI Risk Analysis](#11-ai-risk-analysis)
12. [Payment & Payout Processing](#12-payment--payout-processing)
13. [Support Chat System](#13-support-chat-system)
14. [KYC Integration](#14-kyc-integration)
15. [Blog System](#15-blog-system)
16. [WeCoins & Gamification](#16-wecoins--gamification)
17. [Affiliate System](#17-affiliate-system)
18. [Competitions](#18-competitions)
19. [Email & Notifications](#19-email--notifications)
20. [File Storage (BunnyCDN)](#20-file-storage-bunnycdn)
21. [Environment Variables](#21-environment-variables)
22. [Dependencies](#22-dependencies)
23. [Migrations](#23-migrations)
24. [Server Architecture & Deployment](#24-server-architecture--deployment)
25. [Operational Notes](#25-operational-notes)

---

## 1. Project Structure

```
wefund-api/
├── api/                              # REST API layer
│   ├── urls.py                       # All URL routing
│   ├── views.py                      # Main viewsets & views
│   ├── serializers.py                # DRF serializers
│   ├── permissions.py                # Custom permission classes
│   ├── website_views.py             # Website/e-commerce endpoints
│   ├── website_serializers.py       # Website serializers
│   ├── support_views.py             # Support chat endpoints
│   ├── support_serializers.py       # Support serializers
│   ├── support_services.py          # Support business logic
│   ├── client_views.py              # Client-facing API views
│   ├── client_serializers.py        # Client serializers
│   └── services/
│       └── mt5_client.py            # MT5 Gateway API client
├── backend/                          # Django project settings
│   ├── settings.py                  # Main settings
│   ├── celery.py                    # Celery configuration
│   ├── urls.py                      # Root URL conf
│   ├── hosts.py                     # Django-hosts virtual host routing
│   └── wsgi.py / asgi.py           # Server entry points
├── wefund/                           # Main Django app
│   ├── models.py                    # ALL models (~7000 lines, 84+ models)
│   ├── admin.py                     # Django admin registrations
│   ├── signals.py                   # Django signals
│   ├── migrations/                  # 214+ database migrations
│   ├── tasks/                       # Celery task files
│   │   ├── mt5_tasks.py            # MT5 trade sync
│   │   ├── risk_tasks.py           # Risk evaluation
│   │   ├── payment_tasks.py        # Payment processing
│   │   ├── payout_tasks.py         # Payout automation
│   │   ├── journal_tasks.py        # Journal AI insights
│   │   ├── klaviyo_tasks.py        # Klaviyo abandoned carts
│   │   ├── ai_tasks.py            # AI analysis tasks
│   │   ├── whatsapp_tasks.py      # WhatsApp messaging
│   │   ├── support_email_tasks.py # Email threading
│   │   ├── zoho_sync_tasks.py     # Zoho Books sync
│   │   ├── trading_report_tasks.py # Report generation
│   │   ├── snapshot_tasks.py      # MT5 snapshots
│   │   ├── challenge_tasks.py     # Challenge state machine
│   │   ├── competitions_tasks.py  # Competition ranking
│   │   └── economic_calendar_tasks.py # Economic calendar
│   ├── integrations/               # Third-party integrations
│   │   ├── rise/                   # Rise KYC (SIWE/blockchain)
│   │   ├── stripe/                 # Stripe payments
│   │   ├── twilio/                 # SMS/WhatsApp
│   │   ├── google_calendar/       # Google Calendar
│   │   ├── daily/                  # Daily.co video
│   │   ├── whatsapp/              # WhatsApp
│   │   ├── discord/               # Discord webhooks
│   │   └── telegram/              # Telegram bot
│   ├── risk/                       # Risk evaluation engine v1
│   │   ├── engine.py              # Main evaluation logic
│   │   └── rules/                 # Individual risk rules
│   ├── risk_v2/                    # Risk evaluation engine v2
│   ├── ai_risk/                    # AI-powered risk analysis
│   │   ├── engine.py              # AI risk engine
│   │   ├── ai_client.py           # Claude API client
│   │   ├── gemini_client.py       # Gemini fallback
│   │   ├── prompt_builder.py      # Prompt construction
│   │   ├── knowledge_base.py      # Risk knowledge base
│   │   ├── policy_manager.py      # Policy rules
│   │   └── training_service.py    # Feedback-based improvement
│   ├── ai_analysis/               # AI payout analysis orchestrator
│   ├── challenges/                # Challenge enrollment state machine
│   ├── compliance/                # Compliance analysis engine
│   ├── payouts/                   # Payout processing logic
│   ├── mt5_controller/            # MT5 API interactions (MySQL-based)
│   └── management/               # Custom Django management commands
├── templates/                      # Email & HTML templates
├── static/                        # Static files
├── requirements.txt               # Python dependencies
└── manage.py                      # Django CLI
```

---

## 2. Django Settings & Configuration

**File**: `backend/settings.py`

### Key Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| Database | PostgreSQL | Via `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| Auth User Model | Custom `User` | UUID primary key, role-based |
| REST Framework | SimpleJWT | 1-hour access, 30-day refresh |
| CORS | All origins allowed | `CORS_ALLOW_ALL_ORIGINS = True` |
| Email | SMTP | Via `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` |
| Cache | Redis | Via `REDIS_CACHE_URL` |
| File Storage | BunnyCDN FTP | Via django-storages |
| Celery Broker | Redis | Via `CELERY_BROKER_URL` |
| Time Zone | UTC | `TIME_ZONE = 'UTC'` (converted to UTC+2 on display) |

### Installed Apps
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_hosts',                              # Virtual host routing
    'rest_framework',                            # DRF
    'corsheaders',                               # CORS
    'api',                                       # REST API app
    'wefund',                                    # Main app
    'django_celery_beat',                        # Periodic tasks
    'storages',                                  # BunnyCDN storage
    'rest_framework_simplejwt.token_blacklist',  # JWT blacklist
]
```

### Middleware Stack
1. `django_hosts.middleware.HostsRequestMiddleware`
2. `corsheaders.middleware.CorsMiddleware`
3. `django.middleware.security.SecurityMiddleware`
4. `SessionMiddleware`, `CommonMiddleware`, `CsrfViewMiddleware`
5. `AuthenticationMiddleware`, `MessageMiddleware`
6. `ClickJackingMiddleware`
7. `django_hosts.middleware.HostsResponseMiddleware`

---

## 3. All Django Models (84+)

**File**: `wefund/models.py` (~7,000 lines)

### User & Authentication

| Model | Description | Key Fields |
|-------|-------------|------------|
| **User** (AbstractUser) | Custom user with UUID PK | `role` (client/support/affiliate/risk/admin/content_creator/discord_manager), `rbac_role` FK |
| **NotificationSettings** | User notification prefs | System & email toggles |
| **ClientProfile** | OneToOne with User | KYC status, referral tracking, address |
| **AffiliateProfile** | OneToOne with User | Referral code, commission tier |
| **SupportProfile** | OneToOne with User | Phone extension |
| **RiskProfile** | OneToOne with User | Risk threshold |
| **EmailOTP** | Email verification | OTP code, 10-min expiry |
| **ClientKYC** | KYC session details | Rise invite ID, webhook responses |

### Challenge & Trading

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Challenge** | Challenge definitions | 1-step, 2-step types |
| **ChallengeProduct** | Product variants | Account sizes, fees |
| **ChallengePhase** | Phase-level rules | Max daily loss, max loss, profit target |
| **ChallengePhaseGroupMapping** | MT5 group mappings | Phase → MT5 group name |
| **ChallengeEnrollment** | User enrollment | Status (phase_1_in_progress, awaiting_payment, awaiting_kyc, phase_2_in_progress, live_in_progress, etc.), `payment_type` (standard/pay_after_pass/instant_funding) |
| **EnrollmentAccount** | MT5 account info | Account ID, credentials |
| **EnrollmentEvent** | Status milestones | Event type, timestamp |
| **EnrollmentTransitionLog** | Audit log | From/to status, reason |

### Payment & Orders

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Order** | WooCommerce orders | Payment tracking, MT5 account creation |
| **WebsiteOrder** | Website product orders | Distinct from challenge orders |
| **ClientPaymentMethod** | Stored payment methods | PayPal, bank, crypto |
| **DiscountCode** | Discount codes | Percentage/fixed/BOGO, usage limits, valid dates |
| **Coupon** | Offer-linked coupons | |
| **Offer** | Promotional offers | Date-based |

### Payout & Risk

| Model | Description | Key Fields |
|-------|-------------|------------|
| **TraderPayout** | Payout requests | Status (pending/approved/rejected/paid/cancelled/extended_review), profit, profit_share, net_profit, released_fund, methods (paypal/bank/crypto/rise) |
| **PayoutConfiguration** | Payout rules | Per challenge/account size |
| **PayoutSplitTier** | Revenue split tiers | Company profit share |
| **PayoutPolicy** | Policy rules | Min holding time, max withdrawals/month |
| **TraderPayoutAIAnalysis** | AI compliance reports | |
| **TraderPayoutComplianceAnalysis** | Compliance flags | |
| **BreachHistory** | Hard breach records | Rule violations |
| **SoftBreach** | Soft breach warnings | |
| **BreachEvidence** | Evidence capture | Trades, screenshots |
| **BreachEvidencePosition** | Individual trade evidence | |
| **AIRiskRule** | AI risk rule definitions | |
| **AIRiskAnalysis** | AI risk results | |
| **AIRiskReviewFeedback** | Feedback on AI | |

### Trading & Reporting

| Model | Description | Key Fields |
|-------|-------------|------------|
| **MT5Trade** | Synced MT5 trade data | Order, symbol, open/close time/price, profit, commission |
| **MT5DailySnapshot** | Daily balance snapshot | |
| **TradeTag** | Trade tags | grid_trading, hedging, etc. |
| **TradeJournalEntry** | Trade journal | Notes, screenshots |
| **JournalInsight** | AI-generated insights | |
| **TradingReport** | Monthly/custom reports | |
| **TradingSession** | Session tracking | |

### Support & Communication

| Model | Description | Key Fields |
|-------|-------------|------------|
| **SupportConversation** | Multi-channel chat | Status (active/resolved/escalated), source (widget/discord/email/website), supports guest conversations |
| **SupportMessage** | Individual messages | Types (text/email/system/ai_response), edit/delete tracking |
| **SupportAIConfig** | AI behavior config | Escalation keywords, model settings |
| **SupportAIFeedback** | AI response rating | |
| **FAQCollection** | FAQ categories | |
| **FAQArticle** | FAQ articles | AI-powered search |
| **EmailLog** | Email audit trail | |
| **EmailTemplate** | DB email templates | File fallback |

### Notifications

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Notification** | In-app notifications | Types: info, success, warning, error, kyc, challenge, payout, system, mention |
| **ScheduledNotification** | Future-scheduled | Celery task ID |

### Affiliate & Commissions

| Model | Description | Key Fields |
|-------|-------------|------------|
| **AffiliateReferral** | Commission tracking | Per referral |
| **AffiliateClick** | Click tracking | Affiliate links |
| **AffiliateWallet** | Balance tracking | |
| **AffiliateWalletTransaction** | Earnings/withdrawals | |
| **AffiliatePayout** | Payout requests | |
| **AffiliateCommissionTier** | Tiered rates | 0-10: 20%, 11-50: 25%, etc. |
| **AffiliateCustomCommission** | Per-affiliate overrides | |

### Gamification & Rewards

| Model | Description | Key Fields |
|-------|-------------|------------|
| **RewardTask** | WeCoin earning tasks | starts_at, expires_at, URL submission |
| **RewardSubmission** | User submissions | Status: pending/approved/declined |
| **WeCoinWallet** | User balance | |
| **WeCoinTransaction** | Earn/spend history | |
| **AutoRewardRule** | Auto-award rules | |
| **AutoRewardGrant** | Auto-grant records | |
| **RedeemItem** | Marketplace items | |
| **Redemption** | Redemption records | |

### Competitions

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Competition** | Competition definitions | |
| **CompetitionRule** | Rule sets | |
| **CompetitionPrize** | Prize definitions | |
| **CompetitionRegistration** | User registrations | |
| **CompetitionRankingSnapshot** | Point snapshots | |
| **CompetitionStatusLog** | Status transitions | |
| **CompetitionInvite** | Invite tracking | |

### Blog & Content

| Model | Description | Key Fields |
|-------|-------------|------------|
| **BlogPost** | Articles | Status: draft/published/archived, SEO fields |
| **BlogCategory** | Categories | |
| **BlogTag** | Tags | |
| **Release** | Release notes | |

### Admin AI

| Model | Description | Key Fields |
|-------|-------------|------------|
| **AdminAIConfig** | AI assistant settings | |
| **AdminAIConversation** | AI chat threads | |
| **AdminAIMessage** | AI chat messages | |
| **AdminAIFeedback** | Admin feedback | |
| **AdminAITrainingExample** | Training data | |

### Website & E-commerce

| Model | Description | Key Fields |
|-------|-------------|------------|
| **WebsiteProduct** | Product listings | |
| **WebsiteProductVariant** | Product variants | Sizes, prices |
| **WebsiteProductAddon** | Add-on products | Upsells |

### Meetings & Scheduling

| Model | Description | Key Fields |
|-------|-------------|------------|
| **MeetingProfile** | User availability | |
| **MeetingAvailability** | Time slots | |
| **MeetingDateOverride** | Holiday overrides | |
| **MeetingBooking** | Booked meetings | |
| **AgentShiftSchedule** | Agent shifts | |
| **AgentShiftOverride** | Shift overrides | |

### Audit & Logging

| Model | Description | Key Fields |
|-------|-------------|------------|
| **EventLog** | Event audit trail | |
| **ActivityLog** | User activity | |
| **ImpersonationLog** | Admin impersonation | |
| **GeneratedPasswordLog** | Password generation | |
| **MTActionPanelLogs** | MT5 action audit | |
| **LoginHistory** | Login tracking | |
| **StopLossChange** | Stop loss adjustments | |
| **ZohoSyncJob** | Zoho sync audit | |

### Other

| Model | Description | Key Fields |
|-------|-------------|------------|
| **Certificate** | Phase pass & payout certs | |
| **CertificateTemplate** | Certificate designs | |
| **ResetToken** | Password reset tokens | |
| **ResetTokenConfig** | Reset token configuration | |
| **BetaFeature** | Feature flags | |
| **BetaFeatureAccess** | User beta access | |
| **WhatsAppConversation** | WhatsApp threads | |
| **WhatsAppMessage** | WhatsApp messages | |
| **WhatsAppBotConfig** | Bot settings | |
| **EconomicEvent** | Calendar events | |
| **InternalNote** | Admin notes | |

---

## 4. All API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | User registration |
| POST | `/api/auth/login/` | JWT token obtain |
| POST | `/api/auth/refresh/` | Token refresh |
| POST | `/api/auth/logout/` | Token blacklist |
| POST | `/api/superuser/login/` | Superuser JWT login |
| POST | `/api/auth/client/login/` | Client login |
| POST | `/api/auth/client/refresh/` | Client token refresh |
| POST | `/api/auth/client/change-password/` | Client password change |
| POST | `/api/auth/client/password-reset/` | Password reset request |
| POST | `/api/auth/client/password-reset-confirm/` | Confirm reset |
| GET | `/api/auth/permissions/me/` | Current user permissions |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/user/profile/` | Current user profile |
| GET | `/api/user/{id}/` | User details |
| POST | `/api/users/superuser/` | Superuser profile CRUD |
| POST | `/api/users/impersonate/{id}/` | Admin impersonation |

### Challenge Enrollment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/api/challenges/enroll/` | Enroll in challenge |
| GET | `/api/challenges/{id}/enrollments/` | List enrollments |
| POST | `/api/enrollments/{id}/review/` | Admin review |
| POST | `/api/enrollments/{id}/transition/` | Manual status transition |
| GET | `/api/enrollments/{id}/trades/` | Open trades view |
| POST | `/api/enrollments/{id}/close-trades/` | Force close trades |

### Trading Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trades/mt5/` | MT5 trades list |
| GET | `/api/trades/{account_id}/` | Account trade details |
| GET | `/api/accounts/{id}/metrics/` | Account metrics |
| GET | `/api/accounts/{id}/funds/` | Fund flow tracking |
| POST | `/api/accounts/{id}/block/` | Block trading |

### Risk
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/risk/dashboard/` | Risk overview |
| GET | `/api/risk/soft-breaches/` | Soft breach list |
| GET | `/api/risk/hard-breaches/` | Hard breach list |
| POST | `/api/risk/scan/` | Manual risk scan |

### Payouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payouts/request/` | Request payout |
| GET | `/api/payouts/` | Payout list |
| POST | `/api/payouts/{id}/approve/` | Admin approve |
| POST | `/api/payouts/{id}/reject/` | Admin reject |
| POST | `/api/payouts/{id}/extend/` | Extended review |
| POST | `/api/payouts/{id}/revert-breach/` | Revert breach |
| GET | `/api/payouts/{id}/certificate/` | Generate certificate |
| POST | `/api/payouts/trigger-analysis/` | Trigger AI analysis |

### Affiliates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/affiliates/` | Affiliate profile CRUD |
| POST | `/api/affiliates/register/` | Register as affiliate |
| GET | `/api/affiliates/dashboard/` | Affiliate metrics |
| GET | `/api/affiliates/referrals/` | Referral history |
| GET | `/api/affiliates/payouts/` | Payout history |

### Support Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/support/chat/start-conversation/` | Start chat |
| POST | `/api/support/chat/send-message/` | Send message |
| GET | `/api/support/conversations/` | List conversations |
| POST | `/api/support/conversations/{id}/reply/` | Agent reply |
| POST | `/api/support/conversations/{id}/escalate/` | Escalate |
| POST | `/api/support/conversations/{id}/assign/` | Assign agent |
| GET | `/api/support/faq/` | FAQ search |
| POST | `/api/support/email/webhook/` | Inbound email webhook |

### KYC
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/kyc/initiate/` | Start KYC session |
| GET | `/api/kyc/{id}/` | KYC status |
| POST | `/api/kyc/{id}/invite-rise/` | Rise KYC invite |
| POST | `/api/kyc/webhooks/rise/` | Rise webhook |

### Orders & Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders/` | Create order |
| GET | `/api/orders/` | Order history |
| POST | `/api/orders/webhook/woocommerce/` | WooCommerce webhook |
| POST | `/api/orders/webhook/confirmo/` | Confirmo webhook |
| POST | `/api/orders/webhook/paytiko/` | Paytiko webhook |
| POST | `/api/orders/webhook/paypal/` | PayPal webhook |

### Website (Public, for marketing site)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/website/products/` | Product catalog |
| POST | `/website/validate-discount/` | Validate discount code |
| POST | `/website/orders/create/` | Create website order |
| POST | `/website/payments/create/` | Initiate payment |
| GET | `/website/orders/{id}/status/` | Order status polling |
| POST | `/website/payments/paypal/capture/` | Capture PayPal |
| GET | `/website/pap-checkout/{enrollment_id}/` | PAP checkout details |

### Client-Facing API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/client/dashboard/` | Client dashboard data |
| POST | `/client/dashboard/init/` | First login confirmation |
| GET | `/client/my-stats/` | Trading statistics |
| GET | `/client/active-challenges/` | Active challenges |
| GET | `/client/grid-challenges/` | Challenge grid |
| GET | `/client/eligible-accounts/` | Payout-eligible accounts |
| POST | `/client/request-payout/` | Request payout |
| GET | `/client/withdrawal-data/` | Withdrawal history |
| GET | `/client/certificates/` | User certificates |
| GET | `/client/offers/` | Active offers |
| GET | `/client/leaderboards/` | Leaderboard data |
| GET | `/client/reward-tasks/` | Available reward tasks |
| POST | `/client/reward-submissions/` | Submit task |
| GET | `/client/wecoins/wallet/` | WeCoin balance |
| GET | `/client/wecoins/redeem-items/` | Redeem catalog |
| POST | `/client/wecoins/redeem/` | Redeem WeCoins |
| GET | `/client/notifications/` | User notifications |
| GET | `/client/affiliate/profile/` | Affiliate profile |
| GET | `/client/competitions/` | Competitions list |
| POST | `/client/competitions/{id}/join/` | Join competition |
| POST | `/client/ea-approval/` | Submit EA for approval |
| GET | `/client/profile-settings/` | Profile settings |
| PUT | `/client/profile-settings/` | Update profile |
| GET | `/client/payment-methods/` | Payment methods |
| GET | `/client/eligible-resets/` | Eligible reset tokens |
| POST | `/client/purchase-reset-token/` | Purchase reset token |

### Analytics (CRM)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/challenges/` | Challenge analytics |
| GET | `/api/analytics/account-sizes/` | By account size |
| GET | `/api/analytics/countries/` | By country |
| GET | `/api/analytics/orders/` | Order analytics |
| GET | `/api/analytics/trades/` | Trade analytics |
| GET | `/api/analytics/breaches/` | Breach analytics |
| GET | `/api/analytics/trends/` | Trend analytics |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard/` | Admin dashboard |
| GET | `/api/admin/users/` | User management |
| GET | `/api/health/` | Health check |

---

## 5. Serializers

**File**: `api/serializers.py` (~272KB)

### Major Serializers
- **TraderCreateSerializer** - Registration payload
- **TraderListSerializer / TraderDetailSerializer** - User profiles
- **ChallengeEnrollmentSerializer** - Enrollment data
- **ChallengeEnrollmentCRUDSerializer** - Admin editing
- **TraderPayoutSerializer** - Payout details
- **TraderPayoutComplianceAnalysisSerializer** - Risk analysis
- **MT5TradeSerializer** - Trade serialization
- **SoftBreachSerializer / HardBreachSerializer** - Breach data
- **AffiliateProfileSerializer** - Affiliate profile
- **OrderSerializer** - Order data
- **NotificationSerializer** - Notifications
- **CertificateSerializer** - Certificates
- **RewardTaskSerializer** - Gamification tasks
- **ClientTokenObtainPairSerializer** - Custom JWT claims
- **PayoutConfigurationSerializer** - Payout rules
- **ConversationSerializer / ConversationDetailSerializer** - Support chat
- **MessageSerializer** - Chat messages
- **AIRiskAnalysisSerializer** - Risk analysis results
- **CompetitionSerializer** - Competition data
- **BlogPostSerializer** - Blog articles

### Key Features
- Nested serializers for related objects
- Custom validation (email uniqueness, password strength)
- Transaction handling for atomic operations
- Profile auto-creation on user registration
- MT5 account data serialization
- Multi-level pagination & filtering

---

## 6. Celery Configuration & Tasks

### Configuration

**File**: `backend/celery.py`

```python
# Broker & Backend: Redis
# Queues: 'celery', 'default', 'trades', 'risk'
# Scheduler: django_celery_beat.DatabaseScheduler

# Task routing:
#   fetch_and_store_mt5_trades → 'trades' queue
#   run_risk_evaluation → 'risk' queue
#   Others → 'default' queue
```

### Beat Schedule (Periodic Tasks)

| Task | Schedule | Purpose |
|------|----------|---------|
| `generate_daily_journal_insights` | Daily 23:30 | AI journal insights |
| `check_abandoned_checkouts` | Every 15 min | Klaviyo abandoned carts |
| `capture_approved_paypal_orders` | Every 5 min | PayPal payment capture |
| `check_confirmo_payments` | Every 10 min | Confirmo payment polling |
| `expire_stale_card_orders` | Hourly | Expire old card orders |
| `auto_extend_pending_payouts` | Hourly | Auto-extend 72h+ payouts |
| `fetch_and_store_mt5_trades` | Every 1 min | MT5 trade sync |
| `run_risk_evaluation` | Hourly | Risk rule evaluation |

### Task Files

| File | Tasks | Description |
|------|-------|-------------|
| `payment_tasks.py` | `capture_approved_paypal_orders`, `check_confirmo_payments`, `expire_stale_card_orders` | Payment processing |
| `payout_tasks.py` | `auto_extend_pending_payouts`, `auto_revert_extended_reviews` | Payout automation |
| `mt5_tasks.py` | `fetch_and_store_mt5_trades` | Sync MT5 MySQL → PostgreSQL |
| `risk_tasks.py` | `run_risk_evaluation`, `evaluate_risk_chunk` | Risk evaluation (100-enrollment chunks) |
| `journal_tasks.py` | `generate_daily_journal_insights` | AI-powered journal insights |
| `klaviyo_tasks.py` | `check_abandoned_checkouts` | Abandoned cart tracking |
| `ai_tasks.py` | Various AI analysis tasks | |
| `whatsapp_tasks.py` | WhatsApp message handling | |
| `support_email_tasks.py` | Email threading for support | |
| `zoho_sync_tasks.py` | Zoho Books sync | |
| `trading_report_tasks.py` | Report generation | |
| `snapshot_tasks.py` | MT5 account snapshots | |
| `challenge_tasks.py` | Enrollment state machine | |
| `competitions_tasks.py` | Ranking & leaderboard | |
| `economic_calendar_tasks.py` | Economic event sync | |

### Celery Server Details

- **Server**: `celery-tasks.we-fund.com` (138.201.186.232)
- **App directory**: `/home/broker/app`
- **Processes**: `celery-worker` + `celery-beat` (managed by supervisord)
- **Same codebase** as backend (wefund-api repo)
- **NEVER run migrations on celery** - migrations only on backend server
- Both must be deployed simultaneously and kept in sync

---

## 7. Authentication & JWT

### SimpleJWT Configuration
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

### Token Endpoints
- `POST /api/token/` - Obtain access + refresh tokens
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/token/blacklist/` - Logout (blacklist refresh)

### RBAC (Role-Based Access Control)
- **User.rbac_role** → ForeignKey to Role model
- **Role** model has many **Permission** codenames
- Permission check: `user.has_perm_code('codename')`
- Roles: admin, support, risk, content_creator, discord_manager, client, affiliate

### Custom JWT Claims
Via `ClientTokenObtainPairSerializer`:
- User ID, email, username, role, permissions

---

## 8. Payment Integrations

### Confirmo (Crypto Payments)
- **API**: `https://confirmo.net/api/v3/invoices`
- **Env**: `CONFIRMO_API_KEY`, `CONFIRMO_CALLBACK_PASSWORD`
- **Webhook**: `POST /api/orders/webhook/confirmo/`
- **Polling**: Every 10 min via `check_confirmo_payments` task

### Paytiko (Card + Crypto)
- **API**: `https://api.paytiko.com/v1/payments`
- **Env**: `PAYTIKO_API_KEY`
- **Webhook**: `POST /api/orders/webhook/paytiko/`

### PayPal
- **API**: `https://api-m.paypal.com`
- **Env**: `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET_KEY`, `PAYPAL_WEBHOOK_ID`
- **Webhook**: `POST /api/orders/webhook/paypal/`
- **Auto-capture**: Every 5 min via `capture_approved_paypal_orders` task

### WooCommerce
- **Env**: `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `WC_API_URL`
- **Webhook**: `POST /api/orders/webhook/woocommerce/`
- **Flow**: WooCommerce order → Webhook → MT5 account creation → Email credentials

---

## 9. MT5 (MetaTrader 5) Integration

### MT5 Gateway Service
- **Separate repo**: `commzilla/mt5-gateway-django`
- **Server**: `gateway.we-fund.com` (auto-deploys on push)
- **Database**: `mt5_client_wefund_main` on `188.245.47.89:5432`
- **API Key**: Stored in `MT5_GATEWAY_API_KEY` env var

### MT5Client API (`api/services/mt5_client.py`)

| Method | Purpose |
|--------|---------|
| `add_user(user_data)` | Create MT5 account |
| `get_account_details(account_id)` | Get user by login |
| `get_account_balance(account_id)` | Fetch balance |
| `get_closed_trades(account_id, start, end)` | Fetch closed trades |
| `get_open_trades(account_id)` | Fetch open trades |
| `withdraw_profit(account_id, amount)` | Negative deposit |
| `deposit_funds(account_id, amount)` | Positive deposit |
| `close_open_trades(account_id)` | Force close all |
| `activate_trading(account_id)` | Enable trading |
| `disable_trading(account_id)` | Disable trading |
| `enable_account(account_id)` | Enable account |
| `disable_account(account_id)` | Disable account |
| `change_group(account_id, group)` | Change MT5 group |
| `change_password(account_id, ...)` | Reset passwords |

### Trade Sync
- `fetch_and_store_mt5_trades()` runs every minute
- Queries MT5 `deals` table in MySQL
- Stores as `MT5Trade` records in PostgreSQL
- Marks closed trades when status='closed'

### Environment Variables
```
MT5_API_URL, MT5_API_KEY, MT5_AGENT_ACCOUNT
MT5_GROUP_NAME, MT5_LEVERAGE, MT5_USER_COLOR, MT5_TAX_RATE
MT5_GATEWAY_DB_HOST, MT5_GATEWAY_DB_PORT, MT5_GATEWAY_DB_NAME
MT5_GATEWAY_DB_USER, MT5_GATEWAY_DB_PASSWORD
MT5_GATEWAY_API_URL, MT5_GATEWAY_API_KEY
```

---

## 10. Risk Evaluation System

### Two Engines

**Risk V1** (`wefund/risk/engine.py`):
- `evaluate_enrollments(enrollment_ids)` - Main function
- Runs in 100-enrollment chunks via Celery
- Evaluates all risk rules per enrollment
- Creates/updates breach records

**Risk V2** (`wefund/risk_v2/`):
- Newer implementation
- Uses `RiskScanReport` model
- Called via `run_risk_scan_for_payout()` before approval

### Risk Rules
- Inactivity detection (no trades for X days)
- Copy trading detection (identical trades across accounts)
- Hedging detection (buy + sell same pair within seconds)
- Withdrawal patterns (unusual frequency)
- Large loss spikes (single trade > threshold)
- Account manipulation (rapid status changes)

### Breach Actions
1. Disable trading via MT5 API
2. Create alert notification
3. Flag for manual review
4. Auto-apply extended payout review
5. Send email notification

---

## 11. AI Risk Analysis

**Module**: `wefund/ai_risk/`

### Components
| File | Purpose |
|------|---------|
| `engine.py` | Main AI risk engine |
| `ai_client.py` | Claude (Anthropic) API client |
| `gemini_client.py` | Google Gemini fallback |
| `prompt_builder.py` | Prompt construction |
| `content_builder.py` | Context assembly |
| `knowledge_base.py` | Risk knowledge base |
| `policy_manager.py` | Policy rules |
| `training_service.py` | Feedback-based improvement |

### How It Works
1. Takes payout context (enrollment, trades, profit, history)
2. Builds prompt with risk knowledge base
3. Sends to Claude API (Gemini fallback)
4. Generates risk score + detailed analysis
5. Detects patterns (pump-and-dump, grid trading, copy trading)
6. Returns structured analysis for admin review

### Environment
```
ANTHROPIC_API_KEY - Claude API
OPENAI_API_KEY - OpenAI (if used)
GOOGLE_API_KEY - Gemini API
```

---

## 12. Payment & Payout Processing

### Order Flow
1. Customer purchases challenge via website/WooCommerce
2. Webhook received → `Order`/`WebsiteOrder` created
3. MT5 account created via MT5 API
4. Credentials emailed to user
5. `ChallengeEnrollment` created with status `phase_1_in_progress`

### Payout Flow
1. User requests payout → `TraderPayout` created (status='pending')
2. Admin reviews → optional AI analysis
3. Risk scan performed (optional)
4. Compliance check → `TraderPayoutComplianceAnalysis`
5. Admin approves → status='approved'
6. Payout processed → funds withdrawn from MT5
7. Released to user → status='paid'
8. If not processed in 72h → auto-extended review

### Pay After Pass (PAP)
1. Entry fee paid → Phase 1 starts
2. Phase 1 passed → status `awaiting_payment`
3. Full payment collected
4. Phase 2 starts (or goes live, depending on challenge type)

### Instant Funding
1. User purchases instant funding product
2. KYC check: approved → live immediately; pending → `awaiting_kyc`
3. Trading disabled until KYC approved
4. KYC webhook → enable trading on MT5

---

## 13. Support Chat System

### Architecture
- **Multi-channel**: Widget, Discord, email, website
- **AI-powered**: Claude/Gemini auto-responses with escalation detection
- **Guest support**: Unauthenticated widget access
- **Email threading**: `support+{conversation_uuid}@we-fund.com`

### Components
| File | Purpose |
|------|---------|
| `api/support_views.py` | API endpoints |
| `api/support_serializers.py` | Data serialization |
| `api/support_services.py` | Business logic |
| Widget JS files | Frontend chat widgets |

### Configuration
- Escalation keywords (refund, scam, lawyer, etc.)
- AI model selection (Claude/Gemini)
- Response tone settings
- Knowledge base URLs

---

## 14. KYC Integration

### Provider: Rise (Blockchain-based KYC)
- SIWE (Sign-In with Ethereum) authentication
- Wallet-based identity
- Blockchain-based KYC attestations

### Flow
1. User requests KYC → `ClientKYC` created
2. Rise invite generated
3. User completes KYC on Rise
4. Webhook received → `ClientProfile.kyc_status` updated
5. If approved → Trading enabled

### Environment
```
RISE_COMPANY_PRIVATE_KEY
RISE_COMPANY_WALLET
```

---

## 15. Blog System

### Models
- **BlogPost** - Articles (draft/published/archived)
- **BlogCategory** - Categories
- **BlogTag** - Tags
- **Release** - Release notes

### Features
- Draft/publish workflow
- SEO fields (slug, meta description)
- Featured images on BunnyCDN
- Author tracking

---

## 16. WeCoins & Gamification

### System Overview
Users earn WeCoins by completing tasks, spend them on marketplace items.

### Models
- **RewardTask** - Tasks with scheduling (starts_at, expires_at)
- **RewardSubmission** - User submissions with proof
- **WeCoinWallet** - Balance tracking
- **WeCoinTransaction** - Transaction history
- **AutoRewardRule** - Auto-award triggers
- **RedeemItem** - Marketplace items
- **Redemption** - Redemption records

---

## 17. Affiliate System

### Architecture
- **AffiliateProfile** - Per-user affiliate identity
- **AffiliateCommissionTier** - Tiered commission rates
- **AffiliateReferral** - Referral tracking
- **AffiliateWallet** - Balance
- **AffiliatePayout** - Payout requests

### Commission Tiers (Default)
| Referrals | Commission Rate |
|-----------|----------------|
| 0-10 | 20% |
| 11-50 | 25% |
| 50+ | Custom |

---

## 18. Competitions

### Models
- **Competition** - Definitions with rules
- **CompetitionRule** - Rule sets
- **CompetitionPrize** - Prize definitions
- **CompetitionRegistration** - User registrations
- **CompetitionRankingSnapshot** - Point tracking
- Beta feature gating via `BetaFeatureAccess`

---

## 19. Email & Notifications

### Email
- SMTP backend (configurable)
- Templates: DB first, file fallback
- All sends logged to `EmailLog`
- Support email threading via plus-addressing

### Notifications
- In-app via `Notification` model
- Types: info, success, warning, error, kyc, challenge, payout, system, mention
- Scheduled via `ScheduledNotification` with Celery task ID

### External Channels
- **Discord**: Payout webhooks via `DISCORD_PAYOUT_WEBHOOK_URL`
- **Slack**: Health alerts via `SLACK_HEALTH_WEBHOOK_URL`
- **Telegram**: Payout notifications via `TELEGRAM_BOT_TOKEN`
- **WhatsApp**: Via Twilio integration
- **Klaviyo**: Email marketing & abandoned cart tracking

---

## 20. File Storage (BunnyCDN)

### Configuration
```
BUNNYCDN_STORAGE_ZONE - Storage zone name
BUNNYCDN_API_KEY - API key
BUNNYCDN_PULL_ZONE_URL - CDN URL for serving files
```

### Usage
- All media files (certificates, profile pics, proof images)
- Stored via FTP using django-storages
- Served via BunnyCDN pull zone URL

---

## 21. Environment Variables

### Critical (Must Set)
```
SECRET_KEY=<random>
DEBUG=False
DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
REDIS_CACHE_URL=redis://...
MT5_API_URL, MT5_API_KEY
```

### Email
```
EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD
DEFAULT_FROM_EMAIL=WeFund <support@we-fund.com>
INBOUND_EMAIL_WEBHOOK_SECRET
SUPPORT_EMAIL_REPLY_DOMAIN=we-fund.com
```

### Payment Gateways
```
PAYTIKO_API_KEY, PAYTIKO_API_URL
CONFIRMO_API_KEY, CONFIRMO_CALLBACK_PASSWORD, CONFIRMO_API_URL
PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY, PAYPAL_API_URL, PAYPAL_WEBHOOK_ID
WC_API_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, WC_WEBHOOK_SECRET
```

### AI Services
```
ANTHROPIC_API_KEY
OPENAI_API_KEY
GOOGLE_API_KEY
```

### Integrations
```
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER
DAILY_API_KEY, DAILY_API_URL
GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET
ZOHO_BOOKS_CLIENT_ID, ZOHO_BOOKS_CLIENT_SECRET, ZOHO_BOOKS_REFRESH_TOKEN
RISE_COMPANY_PRIVATE_KEY, RISE_COMPANY_WALLET
KLAVIYO_PRIVATE_API_KEY
```

### File Storage
```
BUNNYCDN_STORAGE_ZONE, BUNNYCDN_API_KEY, BUNNYCDN_PULL_ZONE_URL
```

### Notifications
```
DISCORD_PAYOUT_WEBHOOK_URL
SLACK_HEALTH_WEBHOOK_URL
TELEGRAM_BOT_TOKEN, TELEGRAM_PAYOUT_CHAT_ID
```

### MT5 Gateway
```
MT5_GATEWAY_DB_HOST, MT5_GATEWAY_DB_PORT, MT5_GATEWAY_DB_NAME
MT5_GATEWAY_DB_USER, MT5_GATEWAY_DB_PASSWORD
MT5_GATEWAY_API_URL, MT5_GATEWAY_API_KEY
```

---

## 22. Dependencies

### Core Framework
```
Django==5.2.3
djangorestframework==3.16.0
djangorestframework-simplejwt==5.5.0
django-cors-headers==4.7.0
django-celery-beat==2.8.1
django-filter==25.1
django-hosts==6.0
django-storages==1.14.6
django-timezone-field==7.1
```

### Task Queue
```
celery==5.5.3
redis==6.2.0
```

### Database
```
psycopg2-binary==2.9.10
```

### AI Services
```
anthropic==0.75.0
openai==1.99.9
google-generativeai>=0.8.0
```

### Communication
```
twilio>=9.0.0
```

### Web Server
```
gunicorn (production)
fastapi>=0.115.0 (WebSocket)
uvicorn[standard]>=0.34.0
websockets>=14.0
```

### Other
```
requests==2.32.4
python-dotenv==1.1.1
pytz==2025.2
pillow==11.3.0
weasyprint==67.0 (PDF generation)
qrcode[pil]>=7.4
openpyxl==3.1.5 (Excel)
pandas==2.3.3
WooCommerce==3.0.0
eth-account==0.13.7 (Rise KYC)
drf-yasg==1.21.11 (API docs)
```

---

## 23. Migrations

- **Latest**: `0214_reset_token.py` (March 18, 2026)
- **Total**: 214+ migrations
- **Strategy**: Non-destructive (ADD columns/tables, not DROP)
- **Run on**: Backend server ONLY, never on celery

### Recent Key Migrations
| Migration | Purpose |
|-----------|---------|
| `0207_pay_after_pass_fields.py` | PAP feature |
| `0210_instant_funding_enrollment.py` | Instant funding + KYC |
| `0213_auto_reward_rules.py` | Auto-reward engine |
| `0214_bogo_discount.py` | BOGO discount codes |
| `0214_reset_token.py` | Reset token management |

---

## 24. Server Architecture & Deployment

### Backend Server (`backend.we-fund.com` / 91.99.144.153)
- **App path**: `/home/api/app`
- **Python venv**: `/home/api/venv/bin/python`
- **Process manager**: supervisord
- **Web server**: gunicorn behind nginx
- **Deploy**: `git pull` → `pip install` → `migrate` → `supervisorctl restart all`

### Celery Server (`celery-tasks.we-fund.com` / 138.201.186.232)
- **App path**: `/home/broker/app`
- **Processes**: `celery-worker` + `celery-beat`
- **Process manager**: supervisord
- **Deploy**: `git pull` → `pip install` → `supervisorctl restart celery-worker celery-beat`
- **NEVER run migrations here**

### Deploy Order (MANDATORY)
1. Backend FIRST → pull, pip install, migrate, restart, verify
2. Celery SECOND → pull, pip install, restart both processes, verify
3. Never deploy one without the other

### Health Monitoring
After celery deploy, verify both processes 4 times:
- Immediately, +10s, +30s, +60s
- Both `celery-worker` and `celery-beat` must be RUNNING at all checks

---

## 25. Operational Notes

1. **Risk evaluation** runs hourly, processes 700+ enrollments in 100-size chunks
2. **MT5 trade sync** runs every minute from MT5 MySQL to PostgreSQL
3. **Email templates** check DB first, fall back to file system
4. **Celery Beat schedule** stored in DB via `django_celery_beat.DatabaseScheduler`
5. **JWT tokens**: 1-hour access, 30-day refresh, rotation enabled, old tokens blacklisted
6. **Payment webhooks**: Confirmo, PayPal, Paytiko, WooCommerce all verify webhook secrets
7. **Support chat**: Guest access allowed, AI-powered with escalation detection
8. **Payouts**: Extended review auto-triggers after 72h if not approved
9. **BunnyCDN**: All media stored via FTP, served via pull zone
10. **Timezone**: All stored as UTC, displayed as UTC+2 (fixed, no DST)
