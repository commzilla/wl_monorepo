# WeFund API - Comprehensive Documentation

**Version:** 1.0.0
**Last Updated:** 2026-02-04
**Framework:** Django 5.2.3 + Django REST Framework 3.16.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Data Models (Complete Schema)](#3-data-models-complete-schema)
4. [API Endpoints (Complete Catalog)](#4-api-endpoints-complete-catalog)
5. [Business Logic & Workflows](#5-business-logic--workflows)
6. [Integrations](#6-integrations)
7. [Background Tasks (Celery)](#7-background-tasks-celery)
8. [Signal Handlers](#8-signal-handlers)
9. [Services & Utilities](#9-services--utilities)
10. [Deployment & Configuration](#10-deployment--configuration)

---

# 1. PROJECT OVERVIEW

## 1.1 Purpose & Architecture

WeFund API is an enterprise-grade fintech trading challenge platform that enables traders to participate in multi-phase trading challenges with real MT5 broker integration. The platform provides:

- **Multi-Phase Trading Challenges**: 1-step and 2-step challenges with configurable rules
- **MT5 Broker Integration**: Real-time trading account management via JSON API
- **AI-Powered Risk Analysis**: Claude/OpenAI integration for payout compliance and risk assessment
- **Affiliate Management System**: Multi-tier commission structure with wallet management
- **KYC Verification**: Rise Protocol integration with Ethereum SIWE authentication
- **Trading Competitions**: Leaderboards and ranking snapshots
- **WeCoins Reward System**: Task-based rewards with redemption items
- **Multi-Channel Notifications**: In-app, email, Discord, and Telegram notifications

## 1.2 Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend Framework** | Django 5.2.3 |
| **API Framework** | Django REST Framework 3.16.0 |
| **Database** | PostgreSQL |
| **Cache/Message Broker** | Redis |
| **Task Queue** | Celery with Django Celery Beat |
| **Authentication** | JWT (Simple JWT) |
| **File Storage** | BunnyCDN (FTP Storage) |
| **Email** | SMTP (configurable) |
| **MT5 Integration** | Custom JSON API Client |
| **KYC Provider** | Rise Protocol (Ethereum SIWE) |
| **AI Services** | Claude (Anthropic), OpenAI, RunPod |

## 1.3 Directory Structure

```
wefund-api-clone/
├── api/                          # REST API application
│   ├── views.py                  # Admin API views (10,362 lines)
│   ├── client_views.py           # Client API views (2,836 lines)
│   ├── serializers.py            # DRF serializers (5,730 lines)
│   ├── urls.py                   # URL routing (562 lines, 198+ endpoints)
│   ├── signals.py                # API-level signals
│   ├── services/                 # Core services
│   │   ├── email_service.py      # Email handling
│   │   ├── mt5_client.py         # MT5 JSON API client
│   │   └── order_processing_service.py
│   ├── admin_trader_profile.py   # Trader profile admin views
│   ├── bulk_import.py            # CSV bulk import
│   ├── payout_export.py          # Payout CSV export
│   ├── rise.py                   # Rise webhook handler
│   ├── engine_supervisor.py      # Supervisor control API
│   ├── sse_views.py              # Server-Sent Events
│   ├── monitoring_views.py       # API analytics
│   ├── generic_wordpress_views.py # WordPress plugin integration
│   └── woocommerce_webhook.py    # WooCommerce integration
├── wefund/                       # Core application
│   ├── models.py                 # 82 Django models (~4,300 lines)
│   ├── signals.py                # Login history tracking
│   ├── event_logger.py           # Event logging utility
│   ├── tasks/                    # Celery tasks (12 modules)
│   │   ├── ai_tasks.py           # AI risk analysis tasks
│   │   ├── mt5_tasks.py          # MT5 trade syncing
│   │   ├── snapshot_tasks.py     # Daily snapshot tasks
│   │   ├── competitions_tasks.py # Competition leaderboards
│   │   ├── payout_tasks.py       # Payout automation
│   │   ├── risk_tasks.py         # Risk evaluation
│   │   ├── consistency_tasks.py  # Payout consistency checks
│   │   ├── sl_history_tasks.py   # Stop-loss tracking
│   │   └── schedule_notification.py
│   ├── integrations/             # External integrations
│   │   ├── rise/                 # Rise Protocol (KYC/Payouts)
│   │   │   ├── engine.py         # SIWE authentication
│   │   │   └── generate_wallet.py
│   │   └── social_media/         # Social notifications
│   │       ├── discord_notifier.py
│   │       └── telegram_notifier.py
│   ├── ai_analysis/              # AI payout analysis
│   ├── ai_risk/                  # AI risk detection
│   ├── challenges/               # Challenge engine
│   ├── compliance/               # Compliance analysis
│   ├── payouts/                  # Payout automation
│   ├── risk/                     # Risk engine v1
│   ├── risk_v2/                  # Risk engine v2
│   ├── services/
│   │   └── consistency_engine.py # Consistency checking
│   └── mt5_controller/           # MT5 database utilities
├── backend/                      # Django project settings
│   ├── settings.py               # Main settings
│   ├── celery.py                 # Celery configuration
│   ├── hosts.py                  # Django-hosts configuration
│   └── urls.py                   # Root URL config
├── templates/                    # Email templates
│   └── emails/
├── static/                       # Static files
│   └── certificates/             # Certificate backgrounds
└── requirements.txt              # Python dependencies
```

## 1.4 Environment Configuration

Key environment variables (from `.env`):

```bash
# Django Security
SECRET_KEY=your-secret-key
DEBUG=False

# Database
DB_NAME=wefund
DB_USER=nexada
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432

# Redis/Celery
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
REDIS_CACHE_URL=redis://127.0.0.1:6379/1

# MT5 Integration
MT5_API_URL=https://your-mt5-api-endpoint
MT5_API_KEY=your-mt5-api-key
MT5_AGENT_ACCOUNT=0
MT5_GROUP_NAME=your-group
MT5_LEVERAGE=100

# Rise Protocol (KYC)
RISE_COMPANY_PRIVATE_KEY=your-ethereum-private-key
RISE_COMPANY_WALLET=your-wallet-address

# AI Services
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OPENAI_API_KEY=your-openai-key
RUNPOD_API_KEY=your-runpod-key
RUNPOD_ENDPOINT_ID=your-endpoint

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email
EMAIL_HOST_PASSWORD=your-password

# WooCommerce
WC_API_URL=https://your-woocommerce-site.com
WC_CONSUMER_KEY=your-wc-key
WC_CONSUMER_SECRET=your-wc-secret
WC_WEBHOOK_SECRET=your-webhook-secret

# Social Notifications
DISCORD_PAYOUT_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=your-telegram-token
TELEGRAM_PAYOUT_CHAT_ID=your-chat-id

# BunnyCDN Storage
BUNNYCDN_STORAGE_ZONE=wefundcdn
BUNNYCDN_API_KEY=your-bunny-key
BUNNYCDN_PULL_ZONE_URL=https://cdn.example.com

# Frontend
FRONTEND_URL=https://dashboard.we-fund.com
```

---

# 2. AUTHENTICATION & AUTHORIZATION

## 2.1 JWT Configuration

The platform uses Simple JWT for token-based authentication.

**Settings** (`backend/settings.py:182-188`):

```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}
```

**Default Authentication Class**:
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}
```

## 2.2 User Roles & Permissions

Defined in `wefund/models.py:28-36`:

| Role | Description | Profile Model |
|------|-------------|---------------|
| `client` | Trading challenge participants | `ClientProfile` |
| `affiliate` | Referral partners | `AffiliateProfile` |
| `support` | Customer support staff | `SupportProfile` |
| `risk` | Risk analysts | `RiskProfile` |
| `admin` | Platform administrators | N/A |
| `content_creator` | Marketing content creators | N/A |
| `discord_manager` | Discord community managers | N/A |

**User Status Values** (`wefund/models.py:37-41`):
- `active` - Normal account
- `suspended` - Temporarily disabled
- `deleted` - Soft-deleted

## 2.3 Login/Registration Flows

### Admin Login
- **Endpoint**: `POST /auth/admin/login/`
- **View**: `SuperuserJWTLoginView`
- **Returns**: JWT access and refresh tokens

### Client Login
- **Endpoint**: `POST /auth/client/login/`
- **View**: `ClientLoginView`
- **Returns**: JWT tokens with user profile data

### Client Registration (OTP-Based)
1. **Request OTP**: `POST /auth/client/register/request/`
   - Sends 6-digit OTP to email
   - OTP valid for 10 minutes

2. **Verify OTP**: `POST /auth/client/register/verify-otp/`
   - Validates OTP code

3. **Complete Registration**: `POST /auth/client/register/complete/`
   - Creates user account with password

### Password Reset
1. **Request Reset**: `POST /auth/client/password-reset/request/`
2. **Confirm Reset**: `POST /auth/client/password-reset/confirm/`

## 2.4 Two-Factor Authentication

Supported methods (`wefund/models.py:48-53`):
- `email` - Letter at E-mail
- `sms` - SMS
- `phone_call` - Phone Call
- `auth_app` - Authenticator App

Toggle via `User.two_factor_enabled` (boolean).

---

# 3. DATA MODELS (Complete Schema)

## 3.1 Model Overview

The platform contains **82 Django models** organized into functional categories:

### User & Profile Models (8 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `User` | Extended AbstractUser | `id`, `role`, `status`, `two_factor_enabled`, `two_factor_method`, `date_of_birth`, `profile_picture`, `phone` |
| `ClientProfile` | Client-specific profile | `user`, `kyc_status`, `referred_by`, `first_login_completed`, `has_live_account`, `address_info` |
| `AffiliateProfile` | Affiliate partner profile | `user`, `referral_code`, `approved`, `website_url`, `promotion_strategy`, `manual_tier_override` |
| `SupportProfile` | Support staff profile | `user`, `phone_extension` |
| `RiskProfile` | Risk analyst profile | `user`, `risk_threshold` |
| `NotificationSettings` | User notification preferences | `user`, `system_*`, `email_*` (10 boolean flags) |
| `EmailOTP` | One-time password for registration | `email`, `otp`, `is_verified`, `expires_at` |
| `LoginHistory` | Login audit trail | `user`, `login_time`, `ip_address`, `device_fingerprint` |

### Challenge & Enrollment Models (9 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `Challenge` | Challenge type definition | `name`, `step_type` (1-step/2-step), `is_active` |
| `ChallengePhase` | Phase rules per challenge | `challenge`, `phase_type`, `trading_period`, `min_trading_days`, `max_daily_loss`, `max_loss`, `profit_target` |
| `ChallengeProduct` | Legacy product definition | `name`, `challenge_type`, `account_size`, `entry_fee`, `rules` |
| `ChallengeEnrollment` | User's challenge enrollment | `client`, `challenge`, `order`, `account_size`, `currency`, `status`, `mt5_account_id`, `mt5_password` |
| `ChallengePhaseGroupMapping` | MT5 group per phase | `challenge_phase`, `mt5_group`, `is_active` |
| `EnrollmentAccount` | MT5 account per phase | `enrollment`, `phase_type`, `broker_type`, `mt5_account_id`, `status` |
| `EnrollmentTransitionLog` | Status change audit | `enrollment`, `from_status`, `to_status`, `reason`, `meta` |
| `EnrollmentEvent` | Breach/pass events | `enrollment`, `event_type`, `balance`, `equity`, `notes` |
| `Order` | WooCommerce orders | `user`, `status`, `payment_status`, `product_name`, `mt5_account_id`, `affiliate`, `raw_data` |

### Payout Models (9 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `TraderPayout` | Payout requests | `trader`, `challenge_enrollment`, `amount`, `profit`, `profit_share`, `net_profit`, `method`, `status`, `extended_review_until` |
| `PayoutPolicy` | Challenge payout rules | `challenge`, `first_payout_delay_days`, `subsequent_cycle_days`, `min_net_amount`, `base_share_percent` |
| `PayoutSplitTier` | Tiered profit sharing | `policy`, `from_payout_number`, `to_payout_number`, `share_percent` |
| `PayoutConfiguration` | Per-enrollment payout config | `client`, `enrollment`, `config_type`, `live_trading_start_date`, `profit_share_percent`, `payment_cycle` |
| `ClientPaymentMethod` | Payment methods | `client`, `payment_type`, `paypal_email`, `rise_email`, `bank_*`, `crypto_*` |
| `TraderPayoutAIAnalysis` | AI analysis v1 | `payout`, `ai_recommendations`, `ai_trading_review`, `risk_score` |
| `TraderPayoutComplianceAnalysis` | Compliance analysis | `payout`, `hard_breach_detected`, `soft_breach_detected`, `metrics` |
| `ComplianceResponsibleTrade` | Flagged trades | `analysis`, `ticket_id`, `symbol`, `pnl`, `reason_flagged` |
| `PayoutConfigImportLog` | Bulk import tracking | `uploaded_by`, `file_name`, `total_rows`, `errors` |

### Affiliate Models (8 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `AffiliateReferral` | Referral tracking | `affiliate`, `referred_user`, `commission_amount`, `commission_status` |
| `AffiliateClick` | Click tracking | `referral_code`, `ip_address`, `user_agent`, `timestamp` |
| `AffiliateCommissionTier` | Commission tiers | `name`, `min_referrals`, `max_referrals`, `commission_rate` |
| `AffiliateCustomCommission` | Custom overrides | `affiliate`, `is_active`, `commission_rate`, `fixed_amount_per_referral` |
| `AffiliateWallet` | Affiliate balance | `affiliate`, `balance`, `total_earned` |
| `AffiliateWalletTransaction` | Wallet transactions | `wallet`, `transaction_type`, `amount`, `status` |
| `AffiliatePayout` | Affiliate payouts | `affiliate`, `payment_method`, `amount`, `status` |

### Trading & Risk Models (12 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `MT5Trade` | Closed trades | `account_id`, `order`, `symbol`, `cmd`, `volume`, `open_time`, `close_time`, `profit` |
| `MT5DailySnapshot` | Daily account snapshots | `enrollment`, `account_id`, `date`, `starting_balance`, `ending_balance`, `today_profit` |
| `BreachHistory` | Breach records | `user`, `enrollment`, `rule`, `reason`, `breached_at` |
| `SoftBreach` | Soft breaches | `user`, `enrollment`, `account_id`, `rule`, `severity`, `resolved` |
| `PositionSLState` | Stop-loss state | `position_id`, `login`, `symbol`, `last_sl`, `is_open` |
| `StopLossChange` | SL modification history | `position_id`, `old_sl`, `new_sl`, `changed_at` |
| `RiskScanReport` | Risk engine v2 output | `payout`, `report`, `global_score`, `recommended_action` |
| `PayoutAIAnalysis` | AI analysis v2 | `payout`, `stats`, `violations`, `overall_classification`, `recommendation` |
| `PayoutConsistencyReport` | Consistency analysis | `payout`, `analysis`, `verdict`, `deduction_percentage` |
| `AIRiskRule` | Prohibited strategies | `code`, `name`, `severity`, `detection_guidelines` |
| `AIRiskAnalysis` | AI risk per payout | `payout`, `consistency_score`, `ai_recommendation`, `ai_patterns_detected` |
| `AIRiskReviewFeedback` | Human feedback on AI | `analysis`, `human_decision`, `human_agrees_with_ai` |

### Notification Models (3 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `Notification` | In-app notifications | `user`, `title`, `message`, `type`, `is_read`, `is_global`, `is_custom` |
| `ScheduledNotification` | Future notifications | `user`, `title`, `scheduled_for`, `status`, `celery_task_id` |

### Competition Models (7 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `Competition` | Competition definition | `title`, `start_at`, `end_at`, `initial_balance`, `mt5_group`, `scoring_metric`, `status` |
| `CompetitionPrize` | Prize tiers | `competition`, `rank_from`, `rank_to`, `description` |
| `CompetitionRule` | Competition rules | `competition`, `rule_type`, `value`, `value_type` |
| `CompetitionRegistration` | User registrations | `competition`, `user`, `mt5_login`, `status` |
| `CompetitionRankingSnapshot` | Leaderboard snapshots | `competition`, `user`, `rank`, `growth_percent`, `equity` |
| `CompetitionStatusLog` | Status change log | `competition`, `old_status`, `new_status` |
| `CompetitionInvite` | Invite-only invites | `competition`, `email`, `used` |

### WeCoins & Rewards Models (6 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `RewardTask` | Available tasks | `title`, `description`, `url`, `reward_amount`, `status` |
| `RewardSubmission` | Task submissions | `user`, `task`, `proof_url`, `proof_image`, `status`, `reward_amount` |
| `WeCoinWallet` | User coin balance | `user`, `balance` |
| `WeCoinTransaction` | Coin transactions | `wallet`, `type`, `amount`, `description` |
| `RedeemItem` | Redeemable items | `title`, `category`, `required_wecoins`, `stock_quantity` |
| `Redemption` | Redemption requests | `user`, `item`, `status`, `delivery_data` |

### Beta Features Models (2 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `BetaFeature` | Beta features | `code`, `name`, `status`, `requires_kyc` |
| `BetaFeatureAccess` | User access requests | `feature`, `user`, `status`, `request_notes` |

### Logging & Audit Models (11 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `EventLog` | General event logging | `user`, `category`, `event_type`, `engine`, `metadata` |
| `EmailLog` | Email tracking | `user`, `subject`, `to_email`, `status`, `error_message` |
| `ActivityLog` | Generic activity log | `actor`, `action_type`, `content_type`, `object_id`, `details` |
| `MigrationHistory` | Migration imports | `uploaded_by`, `file_name`, `total_rows`, `errors` |
| `MigrationLog` | Per-row migration log | `batch_id`, `email`, `success`, `errors` |
| `MT5MigrationLog` | MT5 broker migration | `old_mt5_id`, `new_mt5_id`, `status` |
| `InternalNote` | Staff notes | `created_by`, `content_type`, `object_id`, `note` |
| `GeneratedPasswordLog` | Password generation audit | `admin`, `generated_password`, `length` |
| `MTActionPanelLogs` | MT5 action audit | `user`, `action`, `target_id`, `extra_data` |
| `ImpersonationLog` | Admin impersonation | `superuser`, `target_user`, `ip_address` |
| `Certificate` | Trader certificates | `user`, `certificate_type`, `enrollment`, `image_url`, `pdf_url` |

### WordPress/Plugin Models (4 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `APIRequestLog` | API request logging | `endpoint`, `method`, `ip_address`, `response_status`, `response_time_ms` |
| `WebhookProcessingLog` | Webhook processing | `webhook_id`, `order_id`, `processing_stage`, `status` |
| `WordPressIntegrationSettings` | WP site settings | `site_url`, `plugin_version`, `is_active`, `total_webhooks_processed` |
| `UsedJWTToken` | JWT token tracking | `token_jti`, `plugin_name`, `used_at` |

### Other Models (3 models)
| Model | Description | Key Fields |
|-------|-------------|------------|
| `Offer` | Promotional offers | `title`, `description`, `start_date`, `end_date`, `is_active` |
| `Coupon` | Discount coupons | `offer`, `code`, `discount_percent` |
| `CertificateTemplate` | Certificate templates | `key`, `title`, `background_file`, `name_x/y`, `date_x/y` |
| `EATradingBotRequest` | EA approval requests | `client`, `enrollment`, `mq5_file_url`, `status` |

## 3.2 Model Relationships Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER & PROFILES                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────┐                                                               │
│    │  User   │◄──────────────────────────────────────────────┐               │
│    └────┬────┘                                               │               │
│         │ OneToOne                                           │               │
│    ┌────┴────────────┬───────────────┬───────────────┐       │               │
│    ▼                 ▼               ▼               ▼       │               │
│ ┌─────────────┐ ┌──────────────┐ ┌──────────┐ ┌───────────┐  │               │
│ │ClientProfile│ │AffiliateProf │ │SupportProf│ │RiskProfile│  │               │
│ └──────┬──────┘ └──────┬───────┘ └──────────┘ └───────────┘  │               │
│        │               │                                      │               │
│        │               │ ForeignKey                           │               │
│        │               ▼                                      │               │
│        │    ┌────────────────────┐                            │               │
│        │    │AffiliateReferral   │────────────────────────────┘               │
│        │    └────────────────────┘                                            │
│        │                                                                      │
│        │ OneToOne                                                             │
│        ▼                                                                      │
│    ┌──────────┐                                                               │
│    │ClientKYC │                                                               │
│    └──────────┘                                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                           CHALLENGES & ENROLLMENTS                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌───────────┐        ┌──────────────┐                                     │
│    │ Challenge │◄───────│ChallengePhase│                                     │
│    └─────┬─────┘        └──────┬───────┘                                     │
│          │                     │                                             │
│          │ ForeignKey          │ OneToOne                                    │
│          ▼                     ▼                                             │
│   ┌──────────────────┐  ┌─────────────────────┐                              │
│   │ChallengeEnrollment│  │ChallengePhaseGroup  │                              │
│   │                  │  │Mapping              │                              │
│   └────────┬─────────┘  └─────────────────────┘                              │
│            │                                                                 │
│   ┌────────┼────────┬────────────────┬────────────────┐                      │
│   │        │        │                │                │                      │
│   ▼        ▼        ▼                ▼                ▼                      │
│ ┌──────┐┌──────────┐┌───────────────┐┌───────────────┐┌──────────────┐       │
│ │Order ││Enrollment││EnrollmentEvent││EnrollmentTrans││PayoutConfig  │       │
│ │      ││Account   ││               ││itionLog       ││              │       │
│ └──────┘└──────────┘└───────────────┘└───────────────┘└──────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                                 PAYOUTS                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────────┐                                                   │
│    │    TraderPayout     │                                                   │
│    └──────────┬──────────┘                                                   │
│               │                                                              │
│    ┌──────────┼──────────┬───────────────────┬───────────────────┐           │
│    │          │          │                   │                   │           │
│    ▼          ▼          ▼                   ▼                   ▼           │
│ ┌──────────┐┌──────────┐┌───────────────────┐┌──────────────────┐┌────────┐  │
│ │AIAnalysis││Compliance││RiskScanReport     ││PayoutAIAnalysis  ││PayoutCon│  │
│ │          ││Analysis  ││                   ││                  ││sistency │  │
│ └──────────┘└────┬─────┘└───────────────────┘└──────────────────┘└────────┘  │
│                  │                                                           │
│                  ▼                                                           │
│           ┌──────────────────┐                                               │
│           │ComplianceRespons │                                               │
│           │ibleTrade         │                                               │
│           └──────────────────┘                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                              AFFILIATE SYSTEM                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────┐      ┌─────────────────────┐                          │
│    │AffiliateProfile │◄─────│AffiliateCommission  │                          │
│    └────────┬────────┘      │Tier                 │                          │
│             │               └─────────────────────┘                          │
│    ┌────────┼────────┬───────────────────┐                                   │
│    │        │        │                   │                                   │
│    ▼        ▼        ▼                   ▼                                   │
│ ┌──────────┐┌─────────────┐┌────────────────────┐┌────────────────┐          │
│ │Affiliate ││Affiliate    ││AffiliateCustom     ││AffiliateReferral│          │
│ │Wallet    ││Payout       ││Commission          ││                │          │
│ └────┬─────┘└─────────────┘└────────────────────┘└────────────────┘          │
│      │                                                                       │
│      ▼                                                                       │
│ ┌────────────────────┐                                                       │
│ │AffiliateWallet     │                                                       │
│ │Transaction         │                                                       │
│ └────────────────────┘                                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 Status Choices Reference

### ChallengeEnrollment.status
```python
STATUS_CHOICES = [
    ('phase_1_in_progress', 'Phase 1 - In Progress'),
    ('phase_1_passed', 'Phase 1 - Passed'),
    ('phase_2_in_progress', 'Phase 2 - In Progress'),
    ('phase_2_passed', 'Phase 2 - Passed'),
    ('live_in_progress', 'Live - In Progress'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
]
```

### TraderPayout.status
```python
STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
    ('paid', 'Paid'),
    ('cancelled', 'Cancelled'),
    ('extended_review', 'Extended Review'),
]
```

### TraderPayout.method
```python
PAYOUT_METHOD_CHOICES = [
    ('paypal', 'PayPal'),
    ('bank', 'Bank Transfer'),
    ('crypto', 'Crypto'),
    ('rise', 'Rise Payout'),
]
```

### Order.status
```python
STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('processing', 'Processing'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled'),
    ('refunded', 'Refunded'),
    ('failed', 'Failed'),
]
```

### Competition.status
```python
STATUS_CHOICES = [
    ("draft", "Draft"),
    ("upcoming", "Upcoming"),
    ("ongoing", "Ongoing"),
    ("ended", "Ended"),
]
```

---

# 4. API ENDPOINTS (Complete Catalog)

## 4.1 Authentication Endpoints

| Method | Path | View | Description |
|--------|------|------|-------------|
| POST | `/auth/admin/login/` | `SuperuserJWTLoginView` | Admin JWT login |
| POST | `/auth/admin/refresh/` | `AdminTokenRefreshView` | Refresh admin token |
| POST | `/auth/client/login/` | `ClientLoginView` | Client JWT login |
| POST | `/auth/client/refresh/` | `ClientTokenRefreshView` | Refresh client token |
| POST | `/auth/client/register/request/` | `RegistrationRequestView` | Request OTP |
| POST | `/auth/client/register/verify-otp/` | `OTPVerificationView` | Verify OTP |
| POST | `/auth/client/register/complete/` | `CompleteRegistrationView` | Complete registration |
| POST | `/auth/client/password-reset/request/` | `PasswordResetRequestView` | Request password reset |
| POST | `/auth/client/password-reset/confirm/` | `PasswordResetConfirmView` | Confirm password reset |
| GET | `/auth/profile/<uuid:id>/` | `UserProfileView` | Get user profile by ID |
| GET | `/auth/profile/me/` | `MyProfileView` | Get current user profile |

## 4.2 Admin Endpoints

### Dashboard & Analytics
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/admin/dashboard/` | `AdminDashboardAPIView` | Admin dashboard stats |
| GET | `/admin/analytics/challenges/` | `ChallengeAnalyticsView` | Challenge analytics |
| GET | `/admin/analytics/payouts/` | `PayoutAnalyticsView` | Payout analytics |
| GET | `/admin/analytics/orders/` | `OrderAnalyticsView` | Order analytics |
| GET | `/admin/analytics/trades/` | `TradeAnalyticsView` | Trade analytics |
| GET | `/admin/analytics/challenge-wise-payouts/` | `ChallengeWisePayoutsView` | Payouts by challenge |
| GET | `/admin/analytics/account-size-wise-payouts/` | `AccountSizeWisePayoutsView` | Payouts by account size |
| GET | `/admin/analytics/country-wise-payouts/` | `CountryWisePayoutsView` | Payouts by country |
| GET | `/admin/analytics/unprofitable-countries/` | `UnprofitableCountriesView` | Unprofitable countries |
| GET | `/admin/analytics/risk/core-metrics/` | `RiskCoreMetricsView` | Risk core metrics |
| GET | `/admin/analytics/trends/` | `TrendsAnalyticsView` | Trend analytics |
| GET | `/admin/analytics/trader-behavior/` | `TraderBehaviorAnalyticsView` | Trader behavior |
| GET | `/admin/analytics/orders-pass-breach/` | `OrderPassBreachAnalyticsView` | Pass/breach analytics |

### User & Trader Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/admin/traders/` | `TraderViewSet` | List/create traders |
| GET/PUT/DELETE | `/admin/traders/<id>/` | `TraderViewSet` | Trader CRUD |
| GET | `/admin/traders/<uuid:trader_id>/full-profile/` | `trader_full_profile` | Full trader profile |
| GET | `/traders/` | `TraderListView` | List all traders |
| POST | `/add-trader/` | `AddTraderView` | Add new trader |
| POST | `/admin/reset-trader-password/` | `ResetTraderPasswordView` | Reset trader password |
| POST | `/admin/users/generate-password/` | `GenerateTraderPasswordView` | Generate password |
| GET/POST | `/admin/user-management/` | `AdminUserViewSet` | User management |
| POST | `/admin/impersonate/` | `ImpersonateUserView` | Impersonate user |

### Challenge Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/challenges/` | `ChallengeViewSet` | List/create challenges |
| GET/PUT/DELETE | `/challenges/<id>/` | `ChallengeViewSet` | Challenge CRUD |
| GET/POST | `/challenge-phases/` | `ChallengePhaseViewSet` | Phase management |
| GET | `/challenge-phases/options/` | `ChallengePhaseOptionsView` | Phase options |
| GET/POST | `/challenge-products/` | `ChallengeProductViewSet` | Product management |
| GET | `/challenge-enrollments/` | `ChallengeEnrollmentListView` | List enrollments |
| GET/POST | `/admin/challenge/enrollments/` | `ChallengeEnrollmentViewSet` | Admin enrollments |
| GET/POST | `/admin/challenge/group-mappings/` | `ChallengePhaseGroupMappingViewSet` | Phase-group mappings |
| POST | `/admin/challenges/bulk-import/` | `BulkChallengeEnrollmentImportView` | Bulk import |
| GET | `/admin/export-challenge-enrollments/` | `ExportChallengeEnrollmentCSVView` | Export CSV |

### Enrollment Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/admin/enrollments/review/<uuid:enrollment_id>/` | `ReviewChallengeEnrollmentView` | Review enrollment |
| GET | `/admin/enrollments/open-trades/<uuid:enrollment_id>/` | `EnrollmentOpenTradesView` | Open trades |
| POST | `/admin/enrollments/close-trades/<uuid:enrollment_id>/` | `CloseEnrollmentTradesView` | Close trades |
| GET | `/admin/enrollments/metrics/<uuid:enrollment_id>/` | `AccountMetricsView` | Account metrics |
| POST | `/admin/enrollments/funds/<uuid:enrollment_id>/` | `AccountFundsView` | Deposit/withdraw |
| POST | `/admin/enrollments/block/<uuid:enrollment_id>/` | `BlockAccountView` | Block account |
| GET | `/admin/enrollments/accounts/<uuid:enrollment_id>/` | `ChallengeAccountsView` | Challenge accounts |
| GET | `/admin/enrollments/snapshots/<uuid:enrollment_id>/` | `EnrollmentSnapshotsView` | Daily snapshots |
| GET/PUT | `/admin/enrollments/payout-config/<uuid:enrollment_id>/` | `EnrollmentPayoutConfigView` | Payout config |
| GET | `/admin/enrollments/payout-history/<uuid:enrollment_id>/` | `EnrollmentPayoutHistoryView` | Payout history |
| POST | `/admin/enrollments/manual-payout/<uuid:enrollment_id>/` | `AdminManualEnrollmentPayoutView` | Manual payout |
| GET | `/admin/enrollments/breach-history/<uuid:enrollment_id>/` | `EnrollmentBreachHistoryView` | Breach history |
| GET | `/admin/enrollments/events/<uuid:enrollment_id>/` | `EnrollmentEventListView` | Enrollment events |
| GET | `/admin/enrollments/logs/<uuid:enrollment_id>/` | `EnrollmentTransitionLogListView` | Transition logs |
| GET | `/admin/enrollments/account/details/<uuid:enrollment_id>/` | `AccountDetailsView` | Account details |
| POST | `/admin/enrollments/manual-breach-scan/<uuid:enrollment_id>/` | `EnrollmentManualBreachScanView` | Manual breach scan |
| GET | `/admin/enrollments/manual-breach-scan-sse/<uuid:enrollment_id>/` | `EnrollmentManualBreachScanSSEView` | Breach scan SSE |
| GET | `/admin/enrollments/event-logs/<uuid:enrollment_id>/` | `EnrollmentEventLogListView` | Event logs |
| POST | `/admin/enrollments/manual-upgrade/<uuid:enrollment_id>/` | `ManualEnrollmentStatusUpdateView` | Manual upgrade |
| POST | `/admin/enrollments/import-payout-configs/` | `BulkPayoutConfigImportView` | Import configs |

### Payout Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/payouts/` | `TraderPayoutViewSet` | List/create payouts |
| GET | `/admin/payouts/<uuid:id>/` | `TraderPayoutDetailView` | Payout detail |
| POST | `/admin/trader-payouts/action/<uuid:id>/` | `TraderPayoutActionView` | Payout action |
| POST | `/admin/payouts/<uuid:id>/extend-review/` | `TraderPayoutExtendReviewView` | Extend review |
| GET | `/admin/payouts/lookup/` | `PayoutLookupByEmailView` | Lookup by email |
| GET | `/payouts/compliance-analysis/<uuid:payout_id>/` | `PayoutComplianceAnalysisView` | Compliance analysis |
| POST | `/admin/payouts/trigger-analysis/` | `TriggerPayoutAnalysisView` | Trigger analysis |
| GET/POST | `/admin/payout-policies/` | `PayoutPolicyViewSet` | Payout policies |
| GET/POST | `/admin/payout-split-tiers/` | `PayoutSplitTierViewSet` | Split tiers |
| GET | `/admin/export-csv/payout/` | `ExportPayoutCSVView` | Export payouts |
| POST | `/admin/trader/create-payout/` | `AdminCreatePayoutView` | Admin create payout |

### AI Risk Analysis
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/admin/ai-risk-analysis/<uuid:payout_id>/` | `AIRiskAnalysisView` | AI risk analysis |
| POST | `/admin/ai-risk-analysis/feedback/<uuid:analysis_id>/` | `AIRiskReviewFeedbackView` | AI feedback |
| GET | `/admin/ai-risk-report/<uuid:payout_id>/` | `AIRiskReportExportView` | Export AI report |
| POST | `/admin/risk-scan/` | `RunRiskScanAPIView` | Run risk scan |
| POST | `/admin/run-ai-analysis/` | `RunPayoutAIAnalysisView` | Run AI analysis |
| GET | `/admin/risk-engine/payout-report/` | `RiskEngineReportView` | Risk report |
| GET | `/admin/payout-report/ai-analysis/<uuid:payout_id>/` | `GetPayoutAIAnalysisView` | Get AI analysis |
| POST | `/admin/payout-report/run-consistency/<uuid:payout_id>/` | `RunPayoutConsistencyCheckView` | Run consistency |
| GET/POST | `/admin/ai-risk-rules/` | `AIRiskRuleViewSet` | AI risk rules |

### Risk Dashboard
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/admin/risk-dashboard/overview/` | `RiskDashboardOverviewView` | Risk overview |
| GET | `/admin/risk-dashboard/soft-breaches/` | `RiskDashboardSoftBreachesView` | Soft breaches |
| GET | `/admin/risk-dashboard/hard-breaches/` | `RiskDashboardHardBreachesView` | Hard breaches |
| GET | `/admin/risk-dashboard/reverted-breaches/` | `RiskDashboardRevertedBreachesView` | Reverted breaches |
| GET | `/admin/risk-dashboard/ip-summary/` | `IPSummaryView` | IP summary |
| GET | `/admin/risk-dashboard/ip-accounts/<str:ip>/` | `AccountsByIPView` | Accounts by IP |
| GET | `/admin/risk/top-earning-traders/` | `TopEarningTradersView` | Top earners |
| GET | `/admin/risk/traders/breakdown/<uuid:user_id>/` | `TraderBreakdownView` | Trader breakdown |
| POST | `/admin/revert-breach/<int:breach_id>/` | `RevertBreachAndActivateView` | Revert breach |
| POST | `/admin/breaches/revert-bulk/` | `BulkRevertBreachAndActivateView` | Bulk revert |

### MT5 Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/mt5-trades/accounts/` | `MT5AccountListView` | List MT5 accounts |
| GET/POST | `/mt5-trades/` | `MT5TradeViewSet` | Trade management |
| GET | `/mt5-trades/account/<int:account_id>/` | `MT5AccountTradesViewSet` | Account trades |
| GET | `/admin/mt5-trades/` | `MT5TradeListView` | Admin trade list |
| GET | `/admin/mt5-trades/mt5-api/` | `MT5ClosedTradesSyncCheckView` | Sync check |
| POST | `/admin/mt5/resync-trades/` | `MT5TradeResyncView` | Resync trades |
| POST | `/admin/mt5/activate-trading/` | `ActivateTradingView` | Activate trading |
| POST | `/admin/mt5/disable-trading/` | `DisableTradingView` | Disable trading |
| POST | `/admin/mt5/enable-account/` | `EnableAccountView` | Enable account |
| POST | `/admin/mt5/disable-account/` | `DisableAccountView` | Disable account |
| POST | `/admin/mt5/change-group/` | `ChangeGroupView` | Change group |
| POST | `/admin/mt5/change-password/` | `ChangePasswordView` | Change password |
| POST | `/admin/mt5/retry-create-account/` | `RetryMT5AccountCreationView` | Retry creation |
| GET | `/admin/account/pnl/` | `AdminAccountPnLView` | Account PnL |

### Affiliate Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/admin/affiliate/dashboard/` | `AdminAffiliateDashboardView` | Affiliate dashboard |
| GET | `/admin/affiliate/wallet/` | `AdminAffiliateWalletView` | Affiliate wallet |
| GET | `/admin/affiliate/wallet/transactions/` | `AdminAffiliateWalletTransactionListView` | Wallet transactions |
| GET | `/admin/affiliate/top/` | `TopAffiliatesView` | Top affiliates |
| POST | `/admin/affiliate/assign-referral-code/` | `AdminAssignReferralCodeView` | Assign referral code |
| POST | `/api/admin/affiliate/tier/assign/` | `AdminAssignAffiliateTierView` | Assign tier |
| GET/POST | `/admin/affiliate-tiers/` | `AffiliateCommissionTierViewSet` | Commission tiers |
| GET/POST | `/admin/affiliates/` | `AffiliateUserViewSet` | Affiliate users |
| GET/POST | `/admin/affiliate-manager/` | `AdminAffiliateManagerViewSet` | Affiliate manager |
| GET/POST | `/admin/affiliate-management/` | `AffiliateManagementViewSet` | Affiliate management |
| GET/POST | `/admin-affiliate-referrals/` | `AdminAffiliateReferralViewSet` | Referrals |
| GET/POST | `/admin/affiliate/payouts/` | `AdminAffiliatePayoutViewSet` | Affiliate payouts |

### KYC Management
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/kyc-verifications/` | `ClientKYCListView` | KYC list |
| GET/POST | `/admin/kyc-management/` | `ClientKYCViewSet` | KYC management |
| POST | `/admin/rise/manual-invite/` | `ManualRiseInviteView` | Manual Rise invite |
| POST | `/rise-status/` | `rise_webhook_view` | Rise webhook |

### Notifications
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/notifications/global/` | `GlobalNotificationViewSet` | Global notifications |
| GET/POST | `/notifications/custom/` | `CustomNotificationViewSet` | Custom notifications |
| GET/POST | `/notifications/all/` | `AllNotificationViewSet` | All notifications |
| GET/POST | `/admin/scheduled-notifications/` | `ScheduledNotificationViewSet` | Scheduled notifications |

### Certificates
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/certificates/` | `CertificateViewSet` | Certificates |
| GET/POST | `/certificates2/` | `Certificate2ViewSet` | Certificates v2 |
| POST | `/certificates/issue/<uuid:enrollment_id>/` | `issue_certificate_view` | Issue certificate |
| POST | `/admin/certificates/manual-generate/challenge/` | `ManualCertificateGenerateView` | Manual challenge cert |
| POST | `/admin/certificates/manual-generate/payout/` | `ManualPayoutCertificateGenerateView` | Manual payout cert |
| GET/POST | `/admin/certificate-templates/` | `CertificateTemplateViewSet` | Certificate templates |

### Orders
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/admin/orders/` | `AdminOrderListView` | Order list |
| DELETE | `/orders/<int:id>/delete/` | `AdminOrderDeleteView` | Delete order |
| GET | `/admin/orders/<int:pk>/affiliate/` | `OrderAffiliateDetailView` | Order affiliate |
| POST | `/admin/orders/<int:pk>/affiliate/assign/` | `OrderAffiliateAssignView` | Assign affiliate |

### WeCoins/Rewards
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/admin/wecoins/access/` | `WeCoinsBetaAdminViewSet` | WeCoins beta access |
| GET/POST | `/admin/reward/tasks/` | `RewardTaskViewSet` | Reward tasks |
| GET/POST | `/admin/reward/submissions/` | `RewardSubmissionViewSet` | Submissions |
| GET/POST | `/admin/reward/redeem-items/` | `RedeemItemViewSet` | Redeem items |
| GET/POST | `/admin/reward/redeem-dashboard/` | `RedeemDashboardViewSet` | Redeem dashboard |
| GET/POST | `/admin/reward/redemption-actions/` | `RedemptionActionViewSet` | Redemption actions |
| GET/POST | `/admin/reward/wallets/` | `WeCoinWalletViewSet` | Wallets |

### Competitions
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/admin/competitions/` | `AdminCompetitionViewSet` | Competition CRUD |
| GET | `/admin/competitions/manage/` | `AdminCompetitionStatusListView` | Status list |
| GET | `/admin/competitions/registrations/<uuid:competition_id>/` | `AdminCompetitionRegistrationsView` | Registrations |
| GET | `/admin/competitions/leaderboard/<uuid:competition_id>/` | `AdminCompetitionLeaderboardView` | Leaderboard |
| GET | `/admin/competitions/leaderboard/export-csv/<uuid:competition_id>/` | `AdminCompetitionLeaderboardExportCSV` | Export CSV |
| GET | `/admin/competitions/leaderboard/live/<uuid:competition_id>/` | `LiveCompetitionLeaderboardView` | Live leaderboard |
| GET/POST | `/admin/competitions-beta/` | `CompetitionsBetaAdminViewSet` | Beta access |

### System & Utilities
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/countries/` | `CountryListView` | Country list |
| POST | `/utils/test-smtp/` | `SMTPTestView` | Test SMTP |
| GET/PUT | `/superuser/profile/` | `SuperUserProfileView` | Superuser profile |
| POST | `/superuser/change-password/` | `SuperUserPasswordChangeView` | Change password |
| GET | `/engine/tasks/` | `PeriodicTaskListView` | Celery tasks |
| POST | `/engine/tasks/<int:pk>/toggle/` | `PeriodicTaskToggleView` | Toggle task |
| PUT | `/engine/tasks/<int:pk>/edit/` | `PeriodicTaskEditView` | Edit task |
| GET | `/engine/supervisor/status/` | `SupervisorStatusView` | Supervisor status |
| POST | `/engine/supervisor/<str:process_name>/<str:action>/` | `SupervisorControlView` | Supervisor control |
| GET/POST | `/admin/event-logs/` | `EventLogViewSet` | Event logs |
| GET | `/admin/activity-logs/` | `ActivityLogListView` | Activity logs |
| GET | `/admin/activity-logs/<uuid:id>/` | `ActivityLogDetailView` | Activity detail |
| GET/POST | `/admin/beta-features/` | `BetaFeatureAdminViewSet` | Beta features |
| GET/POST | `/admin/internal-notes/` | `InternalNoteViewSet` | Internal notes |
| GET | `/admin/stoploss-history/` | `StopLossHistoryAdminViewSet` | SL history |
| GET | `/api/system/version/` | `SystemVersionView` | System version |
| GET | `/admin/api/analytics/` | `APIAnalyticsView` | API analytics |
| POST | `/admin/api/logs/clear/` | `clear_old_logs` | Clear old logs |
| GET | `/admin/api/logs/export/` | `export_logs` | Export logs |

### Migration Tools
| Method | Path | View | Description |
|--------|------|------|-------------|
| POST | `/admin/migration/upload-csv/` | `MigrationToolUploadView` | Upload CSV |
| GET | `/admin/migration/logs/` | `MigrationLogListView` | Migration logs |
| POST | `/admin/migration/send-emails/` | `MigrationSendEmailView` | Send emails |
| POST | `/admin/migration/mt5-broker/` | `MT5MigrationAPIView` | MT5 migration |
| GET | `/admin/migration/mt5-broker/logs/` | `MT5MigrationLogsAPIView` | MT5 logs |

### EA Requests
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET/POST | `/admin/ea-requests/` | `EATradingBotRequestAdminViewSet` | EA requests |

## 4.3 Client Endpoints

### Dashboard & Profile
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/dashboard/init/` | `ClientDashboardInitView` | Dashboard init data |
| GET | `/client/dashboard/` | `ClientDashboardView` | Dashboard data |
| GET/PUT | `/client/settings/` | `ClientProfileSettingsView` | Profile settings |
| POST | `/client/change-password/` | `PasswordChangeView` | Change password |
| POST | `/client/impersonate/exchange/` | `ImpersonateExchangeView` | Exchange impersonation |

### Challenges
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/challenges/active/` | `ClientActiveChallengesView` | Active challenges |
| GET | `/client/challenges/` | `ClientChallengeEnrollmentListView` | Challenge list |
| GET | `/client/offers/` | `ActiveOffersView` | Active offers |

### Trading
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/mt5/open-trades/` | `OpenTradesView` | Open trades |
| GET | `/client/daily-summary/<int:account_id>/` | `MonthlyPnlSummaryView` | Monthly summary |
| GET | `/client/daily-summary/<int:account_id>/<str:day>/` | `DailyPnlDetailView` | Daily detail |
| GET | `/client/trading-results/` | `TradingResultView` | Trading results |
| GET | `/client/leaderboard/` | `LeaderboardView` | Leaderboard |
| GET | `/client/mystats/` | `MyStatsView` | My stats |

### Payouts
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/payout/eligible-accounts/` | `EligibleAccountsView` | Eligible accounts |
| POST | `/client/payout/request/` | `RequestTraderPayoutView` | Request payout |
| GET | `/client/payment-methods/` | `ClientPaymentMethodListView` | Payment methods |
| GET | `/client/payout-history/<str:mt5_account_id>/` | `PayoutHistoryByAccountView` | Payout history |
| GET | `/client/withdrawal/` | `WithdrawalAPIView` | Withdrawal info |

### Notifications
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/notifications/` | `ClientNotificationListView` | Notifications |
| GET | `/client/notifications/<uuid:pk>/` | `ClientNotificationDetailView` | Notification detail |
| POST | `/client/notifications/mark-read/<uuid:pk>/` | `MarkNotificationReadView` | Mark read |
| DELETE | `/client/notifications/<uuid:pk>/delete/` | `ClientNotificationDeleteView` | Delete notification |

### WeCoins
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/wecoins/access/` | `WeCoinsAccessView` | WeCoins access |
| GET | `/client/wecoins/tasks/` | `ClientRewardTasksView` | Available tasks |
| POST | `/client/wecoins/tasks/submit/` | `ClientRewardSubmissionCreateView` | Submit task |
| GET | `/client/wecoins/submissions/` | `ClientRewardSubmissionsView` | My submissions |
| GET | `/client/wecoins/redeem-items/` | `ClientRedeemItemListView` | Redeem items |
| POST | `/client/wecoins/redeem-items/redeem/` | `ClientRedeemItemRedeemView` | Redeem item |
| GET | `/client/wecoins/redeem-items/history/` | `ClientRedemptionHistoryView` | Redemption history |
| GET | `/client/wecoins/wallet/` | `ClientWeCoinWalletView` | Wallet balance |

### Competitions
| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/client/competitions/access/` | `CompetitionsAccessView` | Competitions access |
| GET | `/client/competitions/` | `TraderCompetitionsHubView` | Competitions hub |
| GET | `/client/competitions/<uuid:competition_id>/` | `TraderCompetitionDetailView` | Competition detail |
| POST | `/client/competitions/join/<uuid:competition_id>/` | `TraderJoinCompetitionView` | Join competition |
| GET | `/client/competitions/leaderboard/table/<uuid:competition_id>/` | `ClientCompetitionLeaderboardTableView` | Leaderboard table |

### EA Requests
| Method | Path | View | Description |
|--------|------|------|-------------|
| POST | `/client/ea-request/upload/` | `EAApprovalRequestView` | Upload EA request |

## 4.4 Affiliate Endpoints

| Method | Path | View | Description |
|--------|------|------|-------------|
| GET | `/affiliate/profile/` | `AffiliateProfileView` | Affiliate profile |
| GET | `/affiliate/referrals/` | `AffiliateReferralListView` | Referral list |
| GET | `/affiliate/funnel-stats/` | `AffiliateFunnelStatsView` | Funnel statistics |
| POST | `/affiliate/payout-request/` | `AffiliatePayoutRequestView` | Request payout |
| GET | `/affiliate/wallet/transactions/` | `AffiliateWalletTransactionListView` | Wallet transactions |

## 4.5 Plugin/Integration Endpoints

### WordPress Plugin
| Method | Path | View | Description |
|--------|------|------|-------------|
| POST | `/plugin/generate-token/` | `JWTTokenGeneratorView` | Generate plugin token |
| POST | `/plugin/refresh-token/` | `JWTTokenRefreshView` | Refresh plugin token |
| POST | `/plugin/order/process/` | `GenericOrderProcessingView` | Process order |
| GET | `/plugin/health/` | `PluginHealthCheckView` | Health check |
| GET | `/plugin/test/` | `test_plugin_endpoint` | Test endpoint |
| GET | `/plugin/docs/` | `plugin_documentation_view` | API documentation |
| GET | `/plugin/postman-collection/` | `get_universal_postman_collection` | Postman collection |

### WooCommerce
| Method | Path | View | Description |
|--------|------|------|-------------|
| POST | `/webhooks/woocommerce/order/` | `WooCommerceOrderWebhookView` | Order webhook |
| GET | `/wc-webhook/status/` | `get_webhook_status` | Webhook status |
| POST | `/wc-webhook/enable/` | `enable_webhook` | Enable webhook |
| POST | `/wc-webhook/disable/` | `disable_webhook` | Disable webhook |

---

# 5. BUSINESS LOGIC & WORKFLOWS

## 5.1 User Registration & KYC Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER REGISTRATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. OTP Request                                                             │
│     POST /auth/client/register/request/                                     │
│     ├── Validate email (not existing)                                       │
│     ├── Generate 6-digit OTP                                                │
│     ├── Create EmailOTP record (expires in 10 min)                          │
│     └── Send OTP via EmailService.send_otp_email()                          │
│                                                                             │
│  2. OTP Verification                                                        │
│     POST /auth/client/register/verify-otp/                                  │
│     ├── Validate OTP against EmailOTP                                       │
│     ├── Mark OTP as verified                                                │
│     └── Return verification token                                           │
│                                                                             │
│  3. Complete Registration                                                   │
│     POST /auth/client/register/complete/                                    │
│     ├── Create User with role='client'                                      │
│     ├── Signal: create_related_profile → creates ClientProfile              │
│     ├── Signal: create_notification_settings → creates NotificationSettings │
│     └── Return JWT tokens                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              KYC FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Trigger: Phase passed (1-step: phase_1_passed, 2-step: phase_2_passed)     │
│                                                                             │
│  1. Signal: trigger_rise_invite_on_phase_passed                             │
│     ├── Check if client KYC status is 'pending'                             │
│     └── Start background thread: safe_rise_invite()                         │
│                                                                             │
│  2. safe_rise_invite()                                                      │
│     ├── Call invite_user_via_rise([email])                                  │
│     ├── SIWE authentication with Ethereum wallet                            │
│     ├── Create/update ClientKYC record                                      │
│     ├── Create ClientPaymentMethod with type='rise'                         │
│     └── Log event: rise_invite_sent                                         │
│                                                                             │
│  3. Rise Webhook (rise_webhook_view)                                        │
│     ├── Receive KYC status update from Rise                                 │
│     ├── Update ClientKYC.rise_webhook_response                              │
│     ├── Update ClientProfile.kyc_status                                     │
│     └── Log event: rise_kyc_approved or rise_kyc_rejected                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Challenge Enrollment Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHALLENGE ENROLLMENT LIFECYCLE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ORDER RECEIVED (WooCommerce Webhook)                                       │
│  ─────────────────────────────────────                                      │
│  WooCommerceOrderWebhookView → OrderProcessingService                       │
│  │                                                                          │
│  ├── 1. Parse order data                                                    │
│  ├── 2. Create/update User (if new)                                         │
│  ├── 3. Create Order record                                                 │
│  ├── 4. Create ChallengeEnrollment (status: phase_1_in_progress)            │
│  ├── 5. Create MT5 account via MT5Client.add_user()                         │
│  ├── 6. Store MT5 credentials in enrollment                                 │
│  ├── 7. Create EnrollmentAccount for phase-1                                │
│  └── 8. Send credentials email                                              │
│                                                                             │
│  PHASE 1 - IN PROGRESS                                                      │
│  ─────────────────────                                                      │
│  │                                                                          │
│  ├── Celery task: fetch_and_store_mt5_trades (every 1 min)                  │
│  ├── Celery task: run_risk_evaluation (evaluates breaches)                  │
│  │                                                                          │
│  ├── If breach detected:                                                    │
│  │   └── Update status to 'failed'                                          │
│  │       ├── Create BreachHistory                                           │
│  │       ├── Signal: close_and_disable_mt5_on_phase_pass (close trades)     │
│  │       └── Send breach notification                                       │
│  │                                                                          │
│  └── If profit target reached:                                              │
│      └── Update status to 'phase_1_passed'                                  │
│          ├── Signal: close_and_disable_mt5_on_phase_pass                    │
│          ├── Signal: trigger_rise_invite_on_phase_passed (for 1-step)       │
│          ├── Signal: generate_certificates_on_status_change                 │
│          └── Create Certificate (phase_one template)                        │
│                                                                             │
│  PHASE 2 - IN PROGRESS (2-step only)                                        │
│  ─────────────────────────────────────                                      │
│  │                                                                          │
│  ├── Create new MT5 account for phase-2                                     │
│  ├── Update status to 'phase_2_in_progress'                                 │
│  ├── Same monitoring as phase 1                                             │
│  │                                                                          │
│  └── If profit target reached:                                              │
│      └── Update status to 'phase_2_passed'                                  │
│          ├── Signal: trigger_rise_invite_on_phase_passed                    │
│          └── Create Certificate (phase_two template)                        │
│                                                                             │
│  LIVE TRADING                                                               │
│  ────────────                                                               │
│  │                                                                          │
│  ├── Create new MT5 account for live-trader                                 │
│  ├── Update status to 'live_in_progress'                                    │
│  ├── Signal: create_payout_config_on_live                                   │
│  │   └── Create PayoutConfiguration from PayoutPolicy                       │
│  ├── Signal: generate_certificates_on_status_change                         │
│  │   └── Create Certificate (funded template)                               │
│  │                                                                          │
│  └── Ongoing monitoring + payout eligibility                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Status Transitions Allowed:**
```python
# 1-Step Challenge
phase_1_in_progress → phase_1_passed → live_in_progress → completed
                    ↘ failed

# 2-Step Challenge
phase_1_in_progress → phase_1_passed → phase_2_in_progress → phase_2_passed → live_in_progress → completed
                    ↘ failed                              ↘ failed
```

## 5.3 Phase Transition Rules

Defined in challenge phase configuration:

| Phase | Max Daily Loss | Max Total Loss | Profit Target | Trading Period |
|-------|---------------|----------------|---------------|----------------|
| Phase 1 | 4-5% | 8-10% | 8-10% | Unlimited |
| Phase 2 | 4-5% | 8-10% | 5% | Unlimited |
| Live Trader | 4-5% | 8-10% | None | Unlimited |

**Breach Types:**
- **Hard Breach**: Max daily loss or max total loss exceeded → Immediate fail
- **Soft Breach**: Risk warning (tracked but not fail-inducing)

## 5.4 Payout Request & Processing

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYOUT PROCESSING FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. CLIENT REQUESTS PAYOUT                                                  │
│     POST /client/payout/request/                                            │
│     │                                                                       │
│     ├── Validate eligibility:                                               │
│     │   ├── Enrollment must be live_in_progress                             │
│     │   ├── KYC must be approved                                            │
│     │   ├── No pending payout exists                                        │
│     │   ├── Minimum net amount met (from PayoutPolicy)                      │
│     │   └── Payout cycle eligible (first_payout_delay or subsequent_cycle)  │
│     │                                                                       │
│     ├── Calculate profit share:                                             │
│     │   ├── Get payout number (count of previous payouts + 1)               │
│     │   ├── Get share_percent from PayoutSplitTier                          │
│     │   └── net_profit = profit * (share_percent / 100)                     │
│     │                                                                       │
│     └── Create TraderPayout (status: pending)                               │
│                                                                             │
│  2. SIGNAL: on_payout_created                                               │
│     │                                                                       │
│     ├── Background thread: safe_run_ai_functions()                          │
│     │   ├── generate_ai_payout_analysis() - AI trading review               │
│     │   ├── generate_compliance_analysis() - Compliance check               │
│     │   ├── run_payout_ai_analysis() - Claude AI analysis                   │
│     │   └── safe_run_risk_engine() - Risk Engine v2 scan                    │
│     │                                                                       │
│     └── For 1-step challenges:                                              │
│         └── Schedule: delayed_payout_auto_reject (10 min delay)             │
│                                                                             │
│  3. AUTO-REJECT CHECK (1-step only)                                         │
│     Celery: delayed_payout_auto_reject                                      │
│     │                                                                       │
│     ├── Check consistency report verdict                                    │
│     ├── If violations detected → auto_reject_payout_if_needed()             │
│     └── Updates payout status to 'rejected' if needed                       │
│                                                                             │
│  4. ADMIN REVIEW                                                            │
│     POST /admin/trader-payouts/action/<uuid:id>/                            │
│     │                                                                       │
│     ├── Review AI analysis, risk scan, compliance report                    │
│     ├── Actions:                                                            │
│     │   ├── approve → status = 'approved'                                   │
│     │   ├── reject → status = 'rejected' (with reason)                      │
│     │   ├── extend_review → status = 'extended_review'                      │
│     │   └── paid → status = 'paid'                                          │
│     │                                                                       │
│     └── If extended_review:                                                 │
│         └── Set extended_review_until (business days calculation)           │
│                                                                             │
│  5. PAYOUT EXECUTION (status: paid)                                         │
│     │                                                                       │
│     ├── MT5Client.withdraw_profit() - Deduct from MT5                       │
│     ├── Process via Rise/PayPal/Bank/Crypto                                 │
│     ├── Generate payout certificate                                         │
│     ├── Send Discord notification                                           │
│     └── Send email notification                                             │
│                                                                             │
│  6. AUTO-REVERT EXTENDED REVIEW                                             │
│     Celery: auto_revert_extended_reviews                                    │
│     └── Reverts expired extended_review → pending                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.5 Affiliate Commission System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AFFILIATE COMMISSION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. REFERRAL TRACKING                                                       │
│     │                                                                       │
│     ├── Client visits site with ?ref=WEF123456                              │
│     ├── Create AffiliateClick record                                        │
│     └── Store referral_code in session/cookie                               │
│                                                                             │
│  2. ORDER WITH REFERRAL                                                     │
│     │                                                                       │
│     ├── WooCommerce order includes referral_code                            │
│     ├── Order.affiliate = AffiliateProfile (looked up by code)              │
│     ├── Create AffiliateReferral (status: pending)                          │
│     └── Calculate commission_amount based on tier                           │
│                                                                             │
│  3. COMMISSION CALCULATION                                                  │
│     │                                                                       │
│     ├── Get affiliate's current_tier (based on referral_count)              │
│     ├── Check for manual_tier_override                                      │
│     ├── Check for AffiliateCustomCommission                                 │
│     │                                                                       │
│     ├── If fixed_amount_per_referral set:                                   │
│     │   └── commission = fixed_amount                                       │
│     └── Else:                                                               │
│         └── commission = order_total * (commission_rate / 100)              │
│                                                                             │
│  4. COMMISSION APPROVAL                                                     │
│     AdminAffiliateReferralViewSet                                           │
│     │                                                                       │
│     ├── Admin reviews referral                                              │
│     ├── On approve:                                                         │
│     │   ├── Update referral.commission_status = 'approved'                  │
│     │   ├── Create AffiliateWalletTransaction (type: commission)            │
│     │   └── Update AffiliateWallet.balance                                  │
│     │                                                                       │
│     └── On reject:                                                          │
│         └── Update referral.commission_status = 'rejected'                  │
│                                                                             │
│  5. AFFILIATE PAYOUT                                                        │
│     POST /affiliate/payout-request/                                         │
│     │                                                                       │
│     ├── Validate minimum balance                                            │
│     ├── Create AffiliatePayout (status: pending)                            │
│     ├── Create AffiliateWalletTransaction (type: payout, negative)          │
│     └── Deduct from wallet balance                                          │
│                                                                             │
│  6. TIER PROGRESSION                                                        │
│     │                                                                       │
│     ├── Tier based on approved referral count                               │
│     └── Example tiers:                                                      │
│         ├── Tier 1: 1-10 referrals → 10%                                    │
│         ├── Tier 2: 11-25 referrals → 12.5%                                 │
│         ├── Tier 3: 26-50 referrals → 15%                                   │
│         └── Tier 4: 51+ referrals → 20%                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 5.6 Certificate Generation

Triggered by signals on status changes:

| Status Change | Template | Title |
|---------------|----------|-------|
| `phase_1_passed` | `phase_one` | Phase 1 Certificate |
| `phase_2_passed` | `phase_two` | Phase 2 Certificate |
| `live_in_progress` | `funded` | Funded Trader Certificate |
| Payout paid | `payout` | Payout Certificate |

**Generation Process:**
1. `generate_and_upload_certificate()` renders template with trader name and date
2. Upload to BunnyCDN (image + PDF)
3. Create `Certificate` record with URLs
4. Signal: `send_certificate_email()` sends HTML email to trader

## 5.7 Risk & Breach Detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RISK ENGINE FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SCHEDULED TASK: run_risk_evaluation                                        │
│  ─────────────────────────────────────                                      │
│  │                                                                          │
│  └── evaluate_all_accounts()                                                │
│      ├── For each active ChallengeEnrollment:                               │
│      │   ├── Get current balance/equity from MT5                            │
│      │   ├── Get phase rules (max_daily_loss, max_loss)                     │
│      │   ├── Calculate loss percentages                                     │
│      │   │                                                                  │
│      │   ├── Check Max Daily Loss:                                          │
│      │   │   └── If (starting_balance - equity) > daily_limit → BREACH      │
│      │   │                                                                  │
│      │   ├── Check Max Total Loss:                                          │
│      │   │   └── If (account_size - equity) > total_limit → BREACH          │
│      │   │                                                                  │
│      │   └── On breach:                                                     │
│      │       ├── Create SoftBreach or BreachHistory                         │
│      │       ├── Update enrollment.status = 'failed'                        │
│      │       ├── disable_trading(account_id)                                │
│      │       ├── close_open_trades(account_id)                              │
│      │       └── Send breach notification                                   │
│      │                                                                       │
│  RISK ENGINE V2 (for payouts)                                               │
│  ─────────────────────────────                                              │
│  attach_report_to_payout(payout)                                            │
│  │                                                                          │
│  ├── Analyze trading patterns                                               │
│  ├── Detect prohibited strategies:                                          │
│  │   ├── Martingale                                                         │
│  │   ├── Grid trading                                                       │
│  │   ├── Pyramid schemes                                                    │
│  │   └── Bot/EA trading (if not approved)                                   │
│  │                                                                          │
│  ├── Generate RiskScanReport:                                               │
│  │   ├── global_score (0-1000+)                                             │
│  │   ├── max_severity                                                       │
│  │   └── recommended_action                                                 │
│  │                                                                          │
│  └── Store in RiskScanReport model                                          │
│                                                                             │
│  AI RISK ANALYSIS (RunPod)                                                  │
│  ─────────────────────────                                                  │
│  run_ai_risk_analysis_async(analysis_id)                                    │
│  │                                                                          │
│  ├── Send trade data to RunPod AI                                           │
│  ├── Parse AI response:                                                     │
│  │   ├── Recommendation (APPROVE/REJECT/MANUAL_REVIEW)                      │
│  │   ├── Detected patterns                                                  │
│  │   └── Confidence score                                                   │
│  │                                                                          │
│  └── Store in AIRiskAnalysis model                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 6. INTEGRATIONS

## 6.1 MT5 Broker Integration

**Client Location:** `api/services/mt5_client.py`

The MT5 integration uses a JSON-based API to communicate with MetaTrader 5 servers.

### Configuration
```python
# backend/settings.py
MT5_API_URL = os.getenv("MT5_API_URL", "")
MT5_API_KEY = os.getenv("MT5_API_KEY", "")
MT5_AGENT_ACCOUNT = int(os.getenv("MT5_AGENT_ACCOUNT", 0))
MT5_GROUP_NAME = os.getenv("MT5_GROUP_NAME", "")
MT5_LEVERAGE = int(os.getenv("MT5_LEVERAGE", 100))
```

### MT5Client Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `add_user(user_data_array)` | Create new MT5 account | User details array |
| `get_account_details(account_id)` | Fetch account info | Account ID |
| `get_account_balance(account_id)` | Get current balance | Account ID |
| `get_closed_trades(account_id, start_ts, end_ts)` | Fetch closed trades | Account, date range |
| `get_open_trades(account_id)` | Fetch open positions | Account ID |
| `withdraw_profit(account_id, amount)` | Execute withdrawal | Account, amount |
| `deposit_funds(account_id, amount)` | Execute deposit | Account, amount |
| `close_open_trades(account_id)` | Close all positions | Account ID |
| `activate_trading(account_id)` | Enable trading | Account ID |
| `disable_trading(account_id)` | Disable trading | Account ID |
| `enable_account(account_id)` | Enable account | Account ID |
| `disable_account(account_id)` | Disable account | Account ID |
| `change_group(account_id, new_group)` | Change MT5 group | Account, group name |
| `change_password(account_id, ...)` | Change passwords | Account, passwords, mode |

### MT5 API Request Format
```json
{
    "method": "AddUser",
    "key": "API_KEY",
    "array": [{
        "index": 0,
        "name": "John Doe",
        "email": "john@example.com",
        "groupName": "demo\\WEF\\Phase1",
        "leverage": 100,
        "mainPassword": "generated_password",
        "investorPassword": "generated_investor_pass",
        "balance": 50000.00
    }]
}
```

## 6.2 Rise Protocol (KYC/Payouts)

**Location:** `wefund/integrations/rise/engine.py`

Rise Protocol provides KYC verification and payout processing using Ethereum SIWE (Sign-In with Ethereum).

### Configuration
```python
RISE_COMPANY_PRIVATE_KEY = os.getenv("RISE_COMPANY_PRIVATE_KEY", "")
RISE_COMPANY_WALLET = os.getenv("RISE_COMPANY_WALLET", "")
```

### SIWE Authentication Flow
```python
def get_rise_token(wallet: str, private_key: str) -> str:
    # 1. Fetch SIWE message from Rise API
    message = _get_siwe_message(wallet)

    # 2. Sign message with Ethereum private key
    eth_msg = encode_defunct(text=message)
    signed = Account.sign_message(eth_msg, private_key=private_key)

    # 3. Exchange signature for JWT token
    token_data = _post_siwe_exchange(message, signature, wallet)

    return token_data["token"]
```

### Invite Users
```python
def invite_user_via_rise(emails: list, role: str = "contractor"):
    token = get_rise_token(WALLET, PRIVATE_KEY)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "inviteList": emails,
        "company_riseid": COMPANY_RISEID,
        "role": role,
    }
    resp = requests.post(f"{RISE_API}/invites", json=payload, headers=headers)
    return resp.json()
```

## 6.3 WooCommerce Integration

**Webhook Handler:** `api/views.py` - `WooCommerceOrderWebhookView`

### Configuration
```python
WC_API_URL = os.getenv('WC_API_URL')
WC_CONSUMER_KEY = os.getenv('WC_CONSUMER_KEY')
WC_CONSUMER_SECRET = os.getenv('WC_CONSUMER_SECRET')
WC_WEBHOOK_SECRET = os.getenv('WC_WEBHOOK_SECRET')
```

### Order Webhook Flow
1. WooCommerce sends order data to `/webhooks/woocommerce/order/`
2. Validate webhook signature
3. Parse order and customer data
4. Create/update User and ClientProfile
5. Create Order record
6. Create ChallengeEnrollment
7. Provision MT5 account
8. Send credentials email

### Webhook Payload Fields Used
```json
{
    "id": 12345,
    "status": "completed",
    "billing": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address_1": "123 Main St",
        "city": "New York",
        "state": "NY",
        "postcode": "10001",
        "country": "US"
    },
    "line_items": [{
        "name": "1-Step Challenge - $50,000",
        "meta_data": [
            {"key": "account_size", "value": "50000"},
            {"key": "broker_type", "value": "mt5"}
        ]
    }],
    "meta_data": [
        {"key": "referral_code", "value": "WEF123456"}
    ]
}
```

## 6.4 AI Services

### Claude (Anthropic)
```python
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
```

Used for:
- Payout consistency analysis (`wefund/services/consistency_engine.py`)
- Trade behavior analysis

### OpenAI
```python
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
```

Used for:
- AI payout analysis (`wefund/generate_ai_payout_analysis.py`)
- Compliance checking

### RunPod
```python
RUNPOD_API_KEY = os.getenv("RUNPOD_API_KEY", "")
RUNPOD_ENDPOINT_ID = os.getenv("RUNPOD_ENDPOINT_ID", "")
RUNPOD_TIMEOUT_SECONDS = int(os.getenv("RUNPOD_TIMEOUT_SECONDS", "600"))
```

Used for:
- AI risk analysis (`wefund/ai_risk/ai_client.py`)
- Pattern detection (Martingale, Grid, etc.)

## 6.5 Social Media Notifications

### Discord
**Location:** `wefund/integrations/social_media/discord_notifier.py`

```python
DISCORD_PAYOUT_WEBHOOK_URL = os.getenv("DISCORD_PAYOUT_WEBHOOK_URL")

def send_payout_certificate_to_discord(first_name, payout_amount, certificate_url):
    embed = {
        "title": f"🚀 Fresh WeFund payout confirmed: ${payout_amount:,.2f}",
        "description": "...",
        "color": 0x2ECC71,
        "image": {"url": certificate_url}
    }
    requests.post(webhook_url, json={"embeds": [embed]})
```

### Telegram
**Location:** `wefund/integrations/social_media/telegram_notifier.py`

```python
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_PAYOUT_CHAT_ID = os.getenv("TELEGRAM_PAYOUT_CHAT_ID")
```

---

# 7. BACKGROUND TASKS (Celery)

## 7.1 Celery Configuration

**Location:** `backend/celery.py`

```python
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

**Settings:**
```python
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
```

## 7.2 Task Categories

### MT5 Tasks (`wefund/tasks/mt5_tasks.py`)

| Task | Schedule | Description |
|------|----------|-------------|
| `fetch_and_store_mt5_trades` | Every 1 minute | Sync closed trades from MT5 MySQL database |

### Snapshot Tasks (`wefund/tasks/snapshot_tasks.py`)

| Task | Schedule | Description |
|------|----------|-------------|
| `create_daily_snapshots` | Broker midnight | Create MT5DailySnapshot for each enrollment |
| `update_daily_snapshots` | End of day | Update snapshots with ending values |

### Risk Tasks (`wefund/tasks/risk_tasks.py`)

| Task | Schedule | Description |
|------|----------|-------------|
| `run_risk_evaluation` | Configurable | Evaluate all accounts for breaches |

### Payout Tasks (`wefund/tasks/payout_tasks.py`)

| Task | Schedule | Description |
|------|----------|-------------|
| `auto_revert_extended_reviews` | Hourly | Revert expired extended_review to pending |

### Consistency Tasks (`wefund/tasks/consistency_tasks.py`)

| Task | On-demand | Description |
|------|-----------|-------------|
| `delayed_payout_auto_reject` | 10 min delay | Auto-reject non-compliant 1-step payouts |

### AI Tasks (`wefund/tasks/ai_tasks.py`)

| Task | On-demand | Description |
|------|-----------|-------------|
| `run_ai_risk_analysis_async` | Per payout | Execute RunPod AI risk analysis |

### Competition Tasks (`wefund/tasks/competitions_tasks.py`)

| Task | Schedule | Description |
|------|----------|-------------|
| `run_all_competition_snapshots` | Configurable | Dispatcher for ongoing competitions |
| `update_competition_ranking_snapshot` | Per competition | Update leaderboard rankings |

### Stop-Loss Tracking (`wefund/tasks/sl_history_tasks.py`)

| Task | Schedule | Description |
|------|----------|-------------|
| `track_stoploss_changes` | Frequent | Monitor SL modifications on open trades |

### Notification Tasks (`wefund/tasks/schedule_notification.py`)

| Task | On-demand | Description |
|------|-----------|-------------|
| `deliver_scheduled_notification` | Scheduled time | Deliver scheduled notifications |

## 7.3 Task Definitions

### fetch_and_store_mt5_trades
```python
@shared_task
def fetch_and_store_mt5_trades():
    """
    Fetch closed trades for each active MT5 account,
    store in MT5Trade model.
    """
    enrollments = ChallengeEnrollment.objects.filter(
        is_active=True,
        broker_type="mt5",
        mt5_account_id__isnull=False,
    )

    for enrollment in enrollments:
        trades = fetch_user_closed_trades(account_id, limit=500)
        for trade in trades:
            MT5Trade.objects.update_or_create(
                account_id=account_id,
                order=order_id,
                defaults={...}
            )
```

### run_ai_risk_analysis_async
```python
@shared_task(
    bind=True,
    autoretry_for=(RunPodAIClientError,),
    retry_kwargs={"max_retries": 3, "countdown": 30},
    retry_backoff=True,
)
def run_ai_risk_analysis_async(self, analysis_id: int):
    """
    Execute AI risk analysis via RunPod.
    Idempotent with status guards.
    """
    analysis = AIRiskAnalysis.objects.get(id=analysis_id)

    if analysis.status not in {"queued", "failed"}:
        return  # Already processed

    analysis.status = "running"
    analysis.save()

    result = ai_client.run_sync(messages=analysis.ai_raw_request["messages"])

    analysis.ai_recommendation = extract_recommendation(result)
    analysis.ai_patterns_detected = extract_patterns_from_table(result)
    analysis.status = "completed"
    analysis.save()
```

---

# 8. SIGNAL HANDLERS

## 8.1 API Signals (`api/signals.py`)

### create_notification_settings
**Trigger:** `User` post_save (created)
```python
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_notification_settings(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'notification_settings'):
        NotificationSettings.objects.create(user=instance)
```

### close_and_disable_mt5_on_phase_pass
**Trigger:** `ChallengeEnrollment` post_save (status in phase_1_passed, phase_2_passed)
```python
@receiver(post_save, sender=ChallengeEnrollment)
def close_and_disable_mt5_on_phase_pass(sender, instance, created, **kwargs):
    if instance.status in ["phase_1_passed", "phase_2_passed"]:
        threading.Thread(
            target=safe_close_and_disable_mt5,
            args=(int(instance.mt5_account_id),),
        ).start()
```

### on_payout_created
**Trigger:** `TraderPayout` post_save (created)
```python
@receiver(post_save, sender=TraderPayout)
def on_payout_created(sender, instance, created, **kwargs):
    if not created:
        return

    threading.Thread(
        target=safe_run_ai_functions,
        args=(str(instance.id), instance.trader, instance.challenge_enrollment),
    ).start()
```

### schedule_auto_reject_for_payout
**Trigger:** `TraderPayout` post_save (created, 1-step only)
```python
@receiver(post_save, sender=TraderPayout)
def schedule_auto_reject_for_payout(sender, instance, created, **kwargs):
    if not created or instance.status != "pending":
        return

    if instance.challenge_enrollment.challenge.step_type != "1-step":
        return

    delayed_payout_auto_reject.apply_async(
        args=[str(instance.id)],
        countdown=600  # 10 minutes
    )
```

### create_payout_config_on_live
**Trigger:** `ChallengeEnrollment` post_save (status = live_in_progress)
```python
@receiver(post_save, sender=ChallengeEnrollment)
def create_payout_config_on_live(sender, instance, created, **kwargs):
    if instance.status == "live_in_progress":
        if not hasattr(instance, "payout_config"):
            PayoutConfiguration.objects.create(
                client=instance.client.user,
                enrollment=instance,
                live_trading_start_date=instance.live_start_date,
                # ... inherit from PayoutPolicy
            )
```

### trigger_rise_invite_on_phase_passed
**Trigger:** `ChallengeEnrollment` post_save (phase passed)
```python
@receiver(post_save, sender=ChallengeEnrollment)
def trigger_rise_invite_on_phase_passed(sender, instance, **kwargs):
    if instance.client.kyc_status != "pending":
        return

    if instance.status == "phase_1_passed" and instance.challenge.step_type == "1-step":
        threading.Thread(target=safe_rise_invite, args=(instance,)).start()

    elif instance.status == "phase_2_passed" and instance.challenge.step_type == "2-step":
        threading.Thread(target=safe_rise_invite, args=(instance,)).start()
```

### send_certificate_email
**Trigger:** `Certificate` post_save (created)
```python
@receiver(post_save, sender=Certificate)
def send_certificate_email(sender, instance, created, **kwargs):
    if not created:
        return

    html_body = render_to_string("emails/certificates/challenge_certificate.html", {...})
    EmailService().send_email(to_email=instance.user.email, ...)
```

### generate_certificates_on_status_change
**Trigger:** `ChallengeEnrollment` post_save (status changes)
```python
@receiver(post_save, sender=ChallengeEnrollment)
def generate_certificates_on_status_change(sender, instance, created, **kwargs):
    if created:
        return

    if instance.status == "phase_1_passed":
        generate_certificate_for_enrollment(instance, "phase_one", ...)
    elif instance.status == "phase_2_passed":
        generate_certificate_for_enrollment(instance, "phase_two", ...)
    elif instance.status == "live_in_progress":
        generate_certificate_for_enrollment(instance, "funded", ...)
```

## 8.2 WeFund Signals (`wefund/signals.py`)

### create_login_history
**Trigger:** `user_logged_in` signal
```python
@receiver(user_logged_in)
def create_login_history(sender, request, user, **kwargs):
    ip_address = get_client_ip(request)
    device_fingerprint = request.META.get('HTTP_USER_AGENT', '')[:255]

    LoginHistory.objects.create(
        user=user,
        login_time=now(),
        ip_address=ip_address,
        device_fingerprint=device_fingerprint,
    )
```

## 8.3 Model Signals (`wefund/models.py`)

### create_related_profile
**Trigger:** `User` post_save (created)
```python
@receiver(post_save, sender=User)
def create_related_profile(sender, instance, created, **kwargs):
    if created:
        if instance.role == 'client':
            ClientProfile.objects.create(user=instance)
        elif instance.role == 'affiliate':
            code = generate_referral_code()
            AffiliateProfile.objects.create(user=instance, referral_code=code)
```

### save_related_profile
**Trigger:** `User` post_save
```python
@receiver(post_save, sender=User)
def save_related_profile(sender, instance, **kwargs):
    if instance.role == 'client' and hasattr(instance, 'client_profile'):
        instance.client_profile.save()
    if instance.role == 'affiliate' and hasattr(instance, 'affiliate_profile'):
        instance.affiliate_profile.save()
```

---

# 9. SERVICES & UTILITIES

## 9.1 Email Service

**Location:** `api/services/email_service.py`

### Methods

| Method | Description |
|--------|-------------|
| `send_user_credentials(to_email, subject, context)` | Send login credentials |
| `send_otp_email(to_email, otp_code, first_name)` | Send OTP verification |
| `send_migration_email(to_email, context)` | Migration notification |
| `send_broker_migration_email(to_email, context)` | Broker migration |
| `send_affiliate_credentials(to_email, subject, context)` | Affiliate credentials |
| `send_challenge_notifications(to_email, subject, context, template)` | Challenge notifications |
| `send_password_reset(to_email, reset_link, full_name)` | Password reset |
| `send_password_reset_confirmation(to_email, full_name)` | Reset confirmation |
| `send_extended_review_email(user, payout, days)` | Extended review notice |

### Email Templates
Located in `templates/emails/`:
- `user_credentials.html` - Login credentials
- `otp_email.html` - OTP verification
- `password_reset.html` - Password reset link
- `password_reset_confirmation.html` - Reset success
- `certificates/challenge_certificate.html` - Certificate notification
- `payout/extended_review.html` - Extended review
- `migration/user_credentials.html` - Migration notice
- `migration/broker_migration.html` - Broker migration

## 9.2 MT5 Client

**Location:** `api/services/mt5_client.py`

Full MT5 API client with 20+ methods for account and trade management. See [Section 6.1](#61-mt5-broker-integration).

## 9.3 Order Processing Service

**Location:** `api/services/order_processing_service.py`

### Classes
```python
class ProcessingStage(Enum):
    RECEIVED = "received"
    VALIDATING = "validating"
    USER_CREATION = "user_creation"
    MT5_ACCOUNT = "mt5_account"
    ENROLLMENT = "enrollment"
    COMPLETED = "completed"

class ProcessingStatus(Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

class OrderProcessingService:
    def process_order(self, order_data: dict) -> ProcessingResult:
        # Full order processing pipeline
```

## 9.4 Certificate Generator

**Location:** `api/utils/certificate_generator.py`

```python
def generate_and_upload_certificate(
    template_key: str,
    trader_name: str,
    issue_date: datetime,
    profit_share: str = None
) -> dict:
    """
    Renders certificate image and PDF, uploads to BunnyCDN.
    Returns: {"image_url": "...", "pdf_url": "..."}
    """
```

Uses `CertificateTemplate` model for positioning.

## 9.5 Event Logger

**Location:** `wefund/event_logger.py`

```python
def log_engine_event(
    event_type: str,
    engine: str,
    user=None,
    challenge_enrollment=None,
    metadata: dict = None,
    description: str = ""
):
    """
    Create EventLog entry for system events.
    """
    EventLog.objects.create(
        user=user,
        challenge_enrollment=challenge_enrollment,
        event_type=event_type,
        engine=engine,
        metadata=metadata or {},
        description=description,
    )
```

## 9.6 Risk Engine

### Risk Engine v1 (`wefund/risk/`)
- `engine.py` - Core evaluation logic
- `utils.py` - Helper functions (disable_trading, activate_trading)

### Risk Engine v2 (`wefund/risk_v2/`)
- `engine.py` - Enhanced risk scanning
- Generates `RiskScanReport` with global scores

```python
def attach_report_to_payout(payout, admin_user=None) -> RiskScanReport:
    """
    Run full risk analysis and attach report to payout.
    """
```

## 9.7 Consistency Engine

**Location:** `wefund/services/consistency_engine.py`

Claude AI-powered consistency analysis for payouts:
- Analyzes trading patterns
- Detects violations
- Provides deduction recommendations
- Generates `PayoutConsistencyReport`

---

# 10. DEPLOYMENT & CONFIGURATION

## 10.1 Environment Variables

### Required Variables

```bash
# Django
SECRET_KEY=                    # Django secret key
DEBUG=False                    # Debug mode
FRONTEND_URL=                  # Frontend dashboard URL

# Database
DB_NAME=wefund
DB_USER=
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# Redis
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
REDIS_CACHE_URL=redis://127.0.0.1:6379/1

# MT5
MT5_API_URL=
MT5_API_KEY=
MT5_GROUP_NAME=
MT5_LEVERAGE=100

# Rise Protocol
RISE_COMPANY_PRIVATE_KEY=
RISE_COMPANY_WALLET=

# Email
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
EMAIL_USE_TLS=True
```

### Optional Variables

```bash
# AI Services
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-20250514
OPENAI_API_KEY=
RUNPOD_API_KEY=
RUNPOD_ENDPOINT_ID=

# WooCommerce
WC_API_URL=
WC_CONSUMER_KEY=
WC_CONSUMER_SECRET=
WC_WEBHOOK_SECRET=

# WordPress Plugin
WORDPRESS_PLUGIN_API_KEY=

# Social
DISCORD_PAYOUT_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_PAYOUT_CHAT_ID=

# BunnyCDN
BUNNYCDN_STORAGE_ZONE=
BUNNYCDN_API_KEY=
BUNNYCDN_PULL_ZONE_URL=
MEDIA_URL=

# Misc
EXCHANGE_RATE_API_KEY=
```

## 10.2 Database Setup

PostgreSQL required with the following extensions:
- `pg_trgm` (for text search)
- `uuid-ossp` (for UUID generation)

```bash
# Create database
createdb wefund

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

## 10.3 Redis/Celery Configuration

### Start Redis
```bash
redis-server
```

### Start Celery Worker
```bash
celery -A backend worker -l info
```

### Start Celery Beat (Scheduler)
```bash
celery -A backend beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Recommended Production Setup
Use Supervisor to manage Celery processes:

```ini
[program:celery-worker]
command=/path/to/venv/bin/celery -A backend worker -l info
directory=/path/to/wefund-api
user=www-data
numprocs=1
autostart=true
autorestart=true

[program:celery-beat]
command=/path/to/venv/bin/celery -A backend beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
directory=/path/to/wefund-api
user=www-data
numprocs=1
autostart=true
autorestart=true
```

## 10.4 CDN Setup (BunnyCDN)

### Storage Zone Configuration
1. Create storage zone in BunnyCDN dashboard
2. Enable FTP access
3. Configure pull zone for public access

### Django Settings
```python
BUNNYCDN_STORAGE_ZONE = os.getenv("BUNNYCDN_STORAGE_ZONE", "")
BUNNYCDN_API_KEY = os.getenv("BUNNYCDN_API_KEY", "")
BUNNYCDN_PULL_ZONE_URL = os.getenv("BUNNYCDN_PULL_ZONE_URL", "")
MEDIA_URL = os.getenv("MEDIA_URL", "")
```

### Usage
Files are uploaded via FTP to BunnyCDN storage, then served via pull zone URL.

## 10.5 Django-Hosts Configuration

**Location:** `backend/hosts.py`

The platform supports multiple subdomains:
- `api.we-fund.com` - API endpoints
- `crm.we-fund.com` - Admin CRM
- `admin.we-fund.com` - Django admin
- `dashboard.we-fund.com` - Client dashboard

```python
# backend/settings.py
PARENT_HOST = 'we-fund.com'
ROOT_HOSTCONF = 'backend.hosts'
DEFAULT_HOST = 'admin'
```

## 10.6 Static Files

```bash
# Collect static files
python manage.py collectstatic

# Static file locations
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']
```

---

# Appendix A: Model Field Reference

## A.1 User Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `username` | CharField | Inherited from AbstractUser |
| `email` | EmailField | Inherited |
| `first_name` | CharField | Inherited |
| `last_name` | CharField | Inherited |
| `role` | CharField | client/support/affiliate/risk/admin/content_creator/discord_manager |
| `status` | CharField | active/suspended/deleted |
| `two_factor_enabled` | BooleanField | 2FA toggle |
| `two_factor_method` | CharField | email/sms/phone_call/auth_app |
| `date_of_birth` | DateField | Optional DOB |
| `profile_picture` | URLField | CDN URL |
| `phone` | CharField | Phone number |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

## A.2 ChallengeEnrollment Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `client` | ForeignKey | → ClientProfile |
| `challenge` | ForeignKey | → Challenge |
| `order` | ForeignKey | → Order (nullable) |
| `account_size` | DecimalField | Account balance |
| `currency` | CharField | USD default |
| `status` | CharField | Phase status |
| `start_date` | DateField | Enrollment date |
| `completed_date` | DateField | Completion date |
| `live_start_date` | DateField | Live trading start |
| `is_active` | BooleanField | Active flag |
| `notes` | TextField | Internal notes |
| `broker_type` | CharField | mt5/mt4 |
| `mt5_account_id` | CharField | MT5 login ID |
| `mt5_password` | CharField | Master password |
| `mt5_investor_password` | CharField | Investor password |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

## A.3 TraderPayout Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `trader` | ForeignKey | → User |
| `challenge_enrollment` | ForeignKey | → ChallengeEnrollment |
| `amount` | DecimalField | Requested amount |
| `profit` | DecimalField | Total profit |
| `profit_share` | DecimalField | Share percentage |
| `net_profit` | DecimalField | After share calculation |
| `released_fund` | DecimalField | Actual released amount |
| `method` | CharField | paypal/bank/crypto/rise |
| `method_details` | JSONField | Method-specific data |
| `status` | CharField | Payout status |
| `admin_note` | TextField | Admin notes |
| `rejection_reason` | TextField | If rejected |
| `is_custom_amount` | BooleanField | Custom amount flag |
| `exclude_amount` | DecimalField | Exclusion amount |
| `exclude_reason` | TextField | Exclusion reason |
| `conversion_metadata` | JSONField | Currency conversion |
| `requested_at` | DateTimeField | Request time |
| `reviewed_at` | DateTimeField | Review time |
| `paid_at` | DateTimeField | Payment time |
| `extended_review_until` | DateTimeField | Review deadline |
| `extended_review_days` | PositiveIntegerField | Business days |

---

# Appendix B: Event Types Reference

Complete list of `EventLog.event_type` choices:

### Account/Profile Events
- `account_created`, `login_success`, `login_failed`
- `password_reset_requested`, `password_reset_success`, `password_changed`
- `profile_updated`, `profile_picture_updated`
- `payment_method_updated`, `notification_settings_updated`

### KYC Events
- `rise_invite_sent`, `rise_kyc_approved`, `rise_kyc_rejected`
- `kyc_initiated`, `kyc_submitted`, `kyc_approved`, `kyc_rejected`

### Challenge Events
- `challenge_purchased`, `challenge_started`, `challenge_completed`
- `challenge_failed`, `challenge_phase_changed`, `challenge_transition`

### MT5 Events
- `mt5_account_created`, `mt5_balance_updated`
- `mt5_trade_opened`, `mt5_trade_closed`
- `mt5_trading_disabled`, `mt5_trading_enabled`
- `mt5_password_changed`, `mt5_group_changed`

### Payout Events
- `payout_requested`, `payout_approved`, `payout_rejected`, `payout_paid`
- `payout_extended`, `payout_ai_triggered`
- `certificate_generated`

### Affiliate Events
- `affiliate_created`, `affiliate_approved`
- `affiliate_sale_recorded`, `affiliate_commission_approved`
- `affiliate_tier_upgraded`, `affiliate_payout_requested`

### Risk Events
- `soft_breach_detected`, `hard_breach_detected`
- `breach_resolved`, `breach_reverted`

### System Events
- `system_error`, `webhook_received`, `admin_action`
- `engine_task_started`, `engine_task_stopped`

---

# Appendix C: API Response Formats

## Standard Success Response
```json
{
    "status": "success",
    "data": { ... }
}
```

## Pagination Response
```json
{
    "count": 100,
    "next": "http://api.example.com/items/?page=2",
    "previous": null,
    "results": [ ... ]
}
```

## Error Response
```json
{
    "detail": "Error message",
    "code": "error_code"
}
```

## Validation Error Response
```json
{
    "field_name": [
        "Error message 1",
        "Error message 2"
    ]
}
```

---

*End of Documentation*

**Generated:** 2026-02-04
**Total Models:** 82
**Total Endpoints:** 198+
**Lines of Code Documented:** ~15,000
