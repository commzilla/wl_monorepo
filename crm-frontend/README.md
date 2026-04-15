# WeFund CRM Frontend - Complete Handover Documentation

> **Repository**: `commzilla/wefund-crm-frontend`
> **Framework**: React 18.3.1 + TypeScript 5.5.3
> **Build Tool**: Vite 5.4.1
> **UI**: Tailwind CSS 3.4.11 + shadcn/ui (Radix UI)
> **Deploys to**: `frontend-crm.we-fund.com` (188.245.54.141)

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack](#2-tech-stack)
3. [All Pages & Routes (59)](#3-all-pages--routes-59)
4. [Components (330+)](#4-components-330)
5. [Services / API Layer (88)](#5-services--api-layer-88)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [State Management](#7-state-management)
8. [Styling](#8-styling)
9. [Key Features](#9-key-features)
10. [Environment Variables](#10-environment-variables)
11. [Build & Deployment](#11-build--deployment)
12. [TypeScript Types (53 files)](#12-typescript-types-53-files)
13. [Widgets](#13-widgets)
14. [Real-time Features](#14-real-time-features)
15. [Internationalization](#15-internationalization)
16. [Important Notes](#16-important-notes)

---

## 1. Project Structure

```
/root/wefund-crm-frontend/
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Main router & providers
│   ├── index.css                 # Global Tailwind styles + design tokens
│   ├── App.css                   # App-specific styles
│   ├── assets/                   # Images & static assets
│   ├── components/               # 330+ reusable React components
│   │   ├── ui/                   # shadcn/ui base components (48)
│   │   ├── layout/               # AppLayout, AppSidebar, PageHeader
│   │   ├── auth/                 # ProtectedRoute, RoleBasedRoute
│   │   ├── traders/              # Trader management components
│   │   ├── support/              # Support dashboard (17 components)
│   │   ├── challenges/           # Challenge components
│   │   ├── blog/                 # Blog editor
│   │   ├── admin-ai/            # AI assistant widget
│   │   └── [feature]/            # Feature-specific components
│   ├── pages/                    # 59 page components
│   ├── services/                 # 88 API service files
│   ├── hooks/                    # 12 custom React hooks
│   ├── contexts/                 # Auth & Theme contexts
│   ├── providers/                # AuthProvider
│   ├── lib/
│   │   ├── types/                # 53 TypeScript type files
│   │   ├── utils.ts              # cn() Tailwind helper
│   │   └── i18n.ts               # i18n translations
│   ├── integrations/
│   │   └── supabase/             # Supabase client (configured but minimal use)
│   └── utils/
│       ├── clientTracking.ts
│       └── audioNotifications.ts
├── public/
│   ├── chat-widget.js            # Embedded chat widget
│   └── wefund-logo.svg
├── index.html
├── package.json                  # 81 dependencies
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env
```

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.5.3 |
| Build | Vite + React SWC | 5.4.1 |
| UI Components | Radix UI (shadcn/ui) | ~1.x |
| Styling | Tailwind CSS | 3.4.11 |
| Routing | React Router DOM | 6.26.2 |
| Server State | TanStack React Query | 5.56.2 |
| Forms | React Hook Form + Zod | 7.53.0 / 3.23.8 |
| Rich Text | TipTap | 3.19.0 |
| Charts | Recharts | 2.12.7 |
| Icons | Lucide React | 0.462.0 |
| Code Editor | Monaco Editor | 4.7.0 |
| Toasts | Sonner | 1.5.0 |
| Dates | date-fns | 3.6.0 |
| i18n | i18next + react-i18next | 25.2.1 / 15.5.2 |
| Markdown | React Markdown + remark-gfm | 10.1.0 / 4.0.1 |
| PDF Export | jsPDF | 3.0.3 |
| Excel Export | XLSX | 0.18.5 |
| Sanitization | DOMPurify | 3.3.1 |

---

## 3. All Pages & Routes (59)

### Dashboard
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Index | Main dashboard with KPIs |

### Trader Management
| Route | Component | Description |
|-------|-----------|-------------|
| `/traders` | Traders | Trader list with search/filter |
| `/traders/:traderId/review` | ReviewTraderProfile | Detailed trader profile |
| `/traders/:traderId/detail` | TraderDetail | Trader detail page |

### Challenge/Enrollment
| Route | Component | Description |
|-------|-----------|-------------|
| `/challenges` | Challenges | Challenge management |
| `/challenge-products` | ChallengeProducts | Product configuration |
| `/challenge-configurations` | ChallengeConfigurations | Rules & settings |
| `/bulk-challenge-enrollments` | BulkChallengeEnrollments | Bulk CSV import |
| `/enrollment-review/:enrollmentId` | EnrollmentReview | Review enrollment |
| `/offers` | Offers | Order management |

### Trading & Activity
| Route | Component | Description |
|-------|-----------|-------------|
| `/trade-management` | TradeManagement | Trade data management |
| `/trading-activity/:traderId/:challengeId` | TradingActivity | Historical trades |
| `/trading-activity/payout/:payoutId` | PayoutTradingActivity | Payout trades |

### Payout Management
| Route | Component | Description |
|-------|-----------|-------------|
| `/payouts` | Payouts | Payout list & status |
| `/payout-request` | PayoutRequest | Request/approve payouts |
| `/payout-configuration` | PayoutConfiguration | Payout policy rules |
| `/payout-ai-analysis` | PayoutAIAnalysis | AI risk analysis |

### Risk Management
| Route | Component | Description |
|-------|-----------|-------------|
| `/risk-management` | RiskManagement | Risk dashboard |
| `/risk-scan` | RiskScan | Risk scanning |
| `/stoploss-history` | StopLossHistory | Stop-loss events |
| `/ip-analysis` | IPAnalysis | IP fraud detection |
| `/top-earning-traders` | TopEarningTraders | High-profit tracking |
| `/copy-trading` | CopyTrading | Copy trading detection |
| `/hedging` | Hedging | Hedging monitoring |

### KYC
| Route | Component | Description |
|-------|-----------|-------------|
| `/kyc` | KYC | KYC verification management |

### Support & Communication
| Route | Component | Description |
|-------|-----------|-------------|
| `/support` | Support | Basic support page |
| `/support-dashboard` | SupportDashboard | Main support chat dashboard |
| `/tickets` | Tickets | Ticket management |
| `/chat-widget` | ChatWidget | Widget configuration |
| `/meetings` | Meetings | Meeting management |
| `/whatsapp` | WhatsAppDashboard | WhatsApp integration |

### WeCoins/Rewards
| Route | Component | Description |
|-------|-----------|-------------|
| `/wecoins/tasks` | WeCoinsTasks | Reward task management |
| `/wecoins/auto-rules` | WeCoinsAutoRules | Auto-reward rules |
| `/wecoins/submissions` | WeCoinsSubmissions | Submission review |
| `/wecoins/redeem-items` | WeCoinsRedeemItems | Redeem catalog |
| `/wecoins/redemption` | WeCoinsRedemption | Redemption tracking |
| `/wecoins/reset-tokens` | WeCoinsResetTokens | Reset token management |
| `/wecoins/ledger-book` | WeCoinsLedgerBook | WeCoin ledger audit |
| `/wecoins/beta-access` | WeCoinsBetaAccess | Beta feature control |

### Affiliate Management
| Route | Component | Description |
|-------|-----------|-------------|
| `/affiliates` | Affiliates | Affiliate overview |
| `/affiliates/manager/:userId` | AffiliateManager | Affiliate detail |

### Website/Commerce
| Route | Component | Description |
|-------|-----------|-------------|
| `/order-history` | OrderHistory | All orders |
| `/website-products` | WebsiteProducts | Product catalog |
| `/website-orders` | WebsiteOrders | Website orders |
| `/discount-codes` | DiscountCodes | Discount code management |

### Blog & Content
| Route | Component | Description |
|-------|-----------|-------------|
| `/blog` | BlogManagement | Blog post list |
| `/blog/new` | BlogPostEditorPage | Create post |
| `/blog/edit/:postId` | BlogPostEditorPage | Edit post |

### Competitions
| Route | Component | Description |
|-------|-----------|-------------|
| `/competitions/campaign` | Campaign | Campaign management |
| `/competitions/registrations` | Registrations | Registration tracking |
| `/competitions/leaderboard` | Leaderboard | Leaderboard display |
| `/competitions/beta-access` | CompetitionsBetaAccess | Beta access |
| `/leaderboard-management` | LeaderboardManagement | Leaderboard admin |

### Analytics (10 pages)
| Route | Component | Description |
|-------|-----------|-------------|
| `/analytics/challenge-wise-payouts` | ChallengeWisePayouts | By challenge |
| `/analytics/account-size-wise-payouts` | AccountSizeWisePayouts | By account size |
| `/analytics/country-wise-payouts` | CountryWisePayouts | By country |
| `/analytics/unprofitable-countries` | UnprofitableCountries | Loss by region |
| `/analytics/risk-core-metrics` | RiskCoreMetrics | Risk KPIs |
| `/analytics/trends` | TrendsAnalytics | Trends & forecasting |
| `/analytics/trader-behavior` | TraderBehavior | Trader patterns |
| `/analytics/trader-journey` | TraderJourney | Trader lifecycle |

### Admin & Configuration
| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/expert-advisors` | ExpertAdvisors | EA management |
| `/configuration` | Configuration | Global settings |
| `/email` | Email | Email templates |
| `/notifications` | Notifications | Notification settings |
| `/certificates` | Certificates | Certificate management |
| `/faq-management` | FAQManagement | FAQ content |
| `/ai-learning` | AILearningCenter | AI training & rules |
| `/admin-ai-settings` | AdminAISettings | AI configuration |
| `/economic-calendar` | EconomicCalendar | Economic events |
| `/trading-reports` | TradingReports | Report generation |
| `/system-health` | SystemHealth | System monitoring |
| `/zoho-exports` | ZohoExports | Zoho CRM export |
| `/releases` | Releases | Changelog |
| `/migration-logs` | MigrationLogs | Migration history |
| `/activity-logs` | ActivityLogs | Activity audit |
| `/event-logs` | EventLogs | System events |
| `/settings` | Settings | User preferences |

### Auth & Error
| Route | Component | Description |
|-------|-----------|-------------|
| `/auth` | Auth | Login page (public) |
| `/unauthorized` | Unauthorized | 403 page |
| `/*` | NotFound | 404 page |

### Meeting Booking (Public, on meet.we-fund.com)
| Route | Component | Description |
|-------|-----------|-------------|
| `/:slug` | BookingPage | Meeting booking form |
| `/booking/:bookingId` | ConfirmationPage | Booking confirmation |
| `/room/:bookingId` | RoomPage | Video meeting room |

---

## 4. Components (330+)

### UI Components (shadcn/ui - 48)
Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, DateTimePicker, Dialog, Drawer, DropdownMenu, FilterBar, Form, HoverCard, Input, InputOtp, Label, Menubar, Pagination, Popover, Progress, RadioGroup, RichTextEditor, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, TimePicker, Toast, Toggle, ToggleGroup, Tooltip

### Layout & Navigation
- `AppLayout` - Main app layout (sidebar + header + theme toggle)
- `AppSidebar` - Collapsible nav sidebar with role-based menu
- `PageHeader` - Page title + breadcrumb

### Auth
- `ProtectedRoute` - Auth guard
- `RoleBasedRoute` - RBAC permission guard

### Support Dashboard (17 components)
- `ConversationTabs`, `CSStatsPanel`, `MentionTextarea`, `ConversationFilters`, `AgentStatsTable`, `TranslatedMessage`, `AIFeedbackDialog`, `EmailComposePanel`, `ChatMessageRenderer`, `EmailMessageBubble`, `MentionNotificationBell`, `EmailRichTextEditor`, `NewEmailDialog`, `SystemMessage`, `AgentAssignmentDropdown`, `TypingIndicator`, `FeedbackIndicator`

### Blog
- `BlogPostEditor` - TipTap WYSIWYG editor with AI content generation

### Admin AI
- `AdminAIWidget` - Floating AI assistant chat

---

## 5. Services / API Layer (88)

### Core
| Service | Purpose |
|---------|---------|
| `apiService.ts` | Base HTTP client with Bearer auth, auto token refresh |
| `authService.ts` | Sign in/up, token management |
| `realAuthService.ts` | Auth wrapper with session |
| `tokenRefreshService.ts` | JWT refresh logic |
| `rbacService.ts` | Role-based access control |
| `userManagementService.ts` | User CRUD |

### Support/Chat
| Service | Purpose |
|---------|---------|
| `supportService.ts` | Conversations, messages, email, polling |
| `whatsappService.ts` | WhatsApp conversations |
| `aiFeedbackService.ts` | AI response feedback |

### Traders & Challenges
| Service | Purpose |
|---------|---------|
| `traderService.ts` | Trader CRUD |
| `challengeService.ts` | Challenge management |
| `enrollmentReviewService.ts` | Enrollment review workflow |
| `competitionService.ts` | Competition management |
| `competitionRegistrationService.ts` | Registration tracking |
| `competitionLeaderboardService.ts` | Leaderboard data |

### Payouts
| Service | Purpose |
|---------|---------|
| `payoutService.ts` | Approval/rejection flow |
| `payoutHistoryService.ts` | Historical data |
| `payoutConfigurationService.ts` | Policy rules |
| `payoutConfigImportService.ts` | Bulk import |
| `payoutPolicyService.ts` | Policy CRUD |

### Analytics (12 services)
`dashboardService.ts`, `challengePayoutAnalyticsService.ts`, `accountSizePayoutAnalyticsService.ts`, `countryPayoutAnalyticsService.ts`, `unprofitableCountryAnalyticsService.ts`, `challengeAnalyticsService.ts`, `trendsAnalyticsService.ts`, `traderBehaviorService.ts`, `traderJourneyService.ts`, `riskCoreMetricsService.ts`, `tradingReportService.ts`

### Risk Management (7 services)
`riskService.ts`, `riskScanService.ts`, `stopLossHistoryService.ts`, `ipAnalysisService.ts`, `copyTradingService.ts`, `hedgingService.ts`, `aiRiskAnalysisService.ts`

### WeCoins/Rewards (8 services)
`rewardTaskService.ts`, `autoRewardRuleService.ts`, `rewardSubmissionService.ts`, `redeemItemService.ts`, `redemptionService.ts`, `weCoinWalletService.ts`, `resetTokenService.ts`, `weCoinsBetaAccessService.ts`

### Blog & Content
`blogService.ts`, `faqService.ts`, `emailTemplateService.ts`

### Orders & Products
`orderService.ts`, `websiteOrderService.ts`, `websiteProductService.ts`, `discountCodeService.ts`

### Affiliates
`affiliateService.ts`, `affiliateManagerService.ts`

### Communication
`emailService.ts`, `notificationService.ts`, `meetingService.ts`

### Admin & System
`adminAIService.ts`, `aiLearningService.ts`, `betaFeatureService.ts`, `activityLogService.ts`, `eventLogService.ts`, `healthService.ts`, `versionService.ts`, `releaseService.ts`

### External
`mt5Service.ts`, `eaService.ts`, `economicCalendarService.ts`, `webhookService.ts`, `certificateService.ts`

---

## 6. Authentication & Authorization

### Login Flow
1. User enters email/password on `/auth`
2. POST `/auth/admin/login/` → returns `{access, refresh, username, email, is_superuser}`
3. Tokens stored in localStorage: `'access'`, `'refresh'`, `'user_info'`
4. `apiService` includes `Authorization: Bearer {access}` in all requests
5. On 401: auto-refresh token, retry request

### RBAC Permissions
1. `AuthProvider` fetches `/auth/permissions/me/` on mount
2. Returns `{role_id, role_name, role_slug, permissions: string[], is_superuser}`
3. Context provides: `hasPermission(codename)`, `hasAnyPermission()`, `hasAllPermissions()`
4. `RoleBasedRoute` checks roles AND permissions before rendering

### Roles
- `admin` - Full access
- `support` - Support & chat
- `risk` - Risk analysis & trading
- `content_creator` - Blog & content
- `discord_manager` - Discord integration

### Permission Codenames (used in route guards)
`dashboard.view`, `traders.view`, `trades.view`, `challenges.view`, `enrollments.review`, `payouts.view`, `kyc.view`, `support.view`, `affiliates.view`, `orders.view`, `risk.view_dashboard`, `risk.run_scan`, `risk.ai_analysis`, `wecoins.view_tasks`, `competitions.view`, `blog.view`, `analytics.view_challenge_payouts`, `system.view_health`, etc.

---

## 7. State Management

### React Query
- Server state management (API data caching)
- 5-minute staleTime, 10-minute gcTime
- No auto-refetch on window focus (explicit control)
- 1 retry on failure

### React Hook Form + Zod
- Client-side form validation
- Used across all forms

### Context API
1. **AuthContext** - User, session, roles, permissions
2. **ThemeContext** - Dark/light mode

### Polling (Support Dashboard)
- Conversations: 5-second interval
- Messages: 3-second interval
- Timestamp-based deduplication

---

## 8. Styling

### Tailwind CSS Configuration
```
Primary: HSL 220 80% 60% (bright blue)
Secondary: HSL 200 80% 50%
Accent: HSL 190 90% 55% (cyan)
Success: HSL 142 76% 36% (green)
Warning: HSL 48 96% 53% (yellow)
Destructive: HSL 0 63% 31% (red)
Dark background: HSL 222 47% 11% (navy)
```

### Dark/Light Mode
- Togglable via ThemeContext
- CSS custom properties for theming
- Moon/Sun toggle in header

### Layout
- Sidebar navigation (collapsible on mobile)
- Full-height flexbox layout
- Responsive breakpoints (sm, md, lg, xl, 2xl)
- `useIsMobile()` hook for mobile detection

---

## 9. Key Features

### Trader Management
- List/search/filter traders with pagination
- Add/edit trader profiles
- View trader's challenges, accounts, KYC status

### Challenge/Enrollment Management
- CRUD challenge products with rules
- Bulk CSV enrollment import
- Enrollment review & approval workflow

### Payout Management
- Approval/rejection workflow
- Custom amount override
- Extended review triggers
- AI-powered risk analysis
- Analytics by challenge/country/account size

### Support Dashboard
- Real-time polling (5s conversations, 3s messages)
- Email integration (compose, send, thread)
- AI assistant with confidence scores
- Agent assignment & mentions
- Unread indicators (pulsing blue dot, badges)
- Message editing/deletion
- Attachment uploads
- Statistics panel

### Risk Management
- Risk scoring & alerts
- Copy trading abuse detection
- Hedging monitoring
- IP fraud analysis
- Stop-loss event tracking
- AI-powered analysis with explainability

### Blog Management
- TipTap WYSIWYG editor
- AI content generation (outline, article, SEO)
- Draft/publish workflow
- Categories, tags, featured images

### WeCoins/Rewards
- Task CRUD with scheduling
- Auto-reward rules
- Submission review
- Redeem catalog management
- Ledger audit log

### Analytics (8 dashboards)
- Challenge-wise, account-size, country payout analysis
- Risk core metrics
- Trader behavior patterns
- Trader journey funnel
- Trends & forecasting

### Admin AI Assistant
- Floating widget in corner
- Streaming responses with Markdown
- Context-aware queries

---

## 10. Environment Variables

```env
VITE_API_BASE_URL="https://api.we-fund.com"
VITE_SUPABASE_PROJECT_ID="fdbwwgnioqhxxmifvjam"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_URL="https://fdbwwgnioqhxxmifvjam.supabase.co"
```

Build-time:
- `VITE_GIT_COMMIT` - Auto-generated commit hash
- `VITE_BUILD_TIME` - Build timestamp

---

## 11. Build & Deployment

### Build
```bash
npm run build    # Production build → dist/
npm run dev      # Dev server on port 8080
npm run preview  # Preview production build
```

### Deployment Target
- **Server**: `frontend-crm.we-fund.com` (188.245.54.141)
- **App path**: `/home/crm/app`
- **Serve from**: `/home/crm/htdocs/crm.we-fund.com/`
- **Deploy**: `git pull` → `npm run build` → `cp -r dist/* htdocs/crm.we-fund.com/`
- **Bastion limitation**: OOM on `vite build` due to low RAM; builds happen on target server

### Vite Config
- React SWC transpiler
- Path alias: `@` → `./src/`
- Git commit hash injection at build time

---

## 12. TypeScript Types (53 files)

Located in `src/lib/types/`:

`auth.ts`, `authContext.ts`, `rbac.ts`, `affiliate.ts`, `certificate.ts`, `adminAI.ts`, `chat.ts`, `tickets.ts`, `betaFeature.ts`, `offer.ts`, `rewardTask.ts`, `autoRewardRule.ts`, `rewardSubmission.ts`, `redeemItem.ts`, `weCoinWallet.ts`, `weCoinsOverview.ts`, `weCoinsBetaAccess.ts`, `resetToken.ts`, `payoutAnalytics.ts`, `payoutDetails.ts`, `payoutConfiguration.ts`, `payoutPolicy.ts`, `payoutHistory.ts`, `payoutConfigImport.ts`, `challengePayoutAnalytics.ts`, `accountSizePayoutAnalytics.ts`, `countryPayoutAnalytics.ts`, `unprofitableCountryAnalytics.ts`, `tradeAnalytics.ts`, `riskCoreMetrics.ts`, `trendsAnalytics.ts`, `traderBehavior.ts`, `traderJourney.ts`, `risk.ts`, `djangoRisk.ts`, `aiRiskRule.ts`, `aiRiskAnalysis.ts`, `aiRiskFeedback.ts`, `aiLearning.ts`, `enrollmentReview.ts`, `enrollmentEvents.ts`, `eventLog.ts`, `ipAnalysis.ts`, `stopLossHistory.ts`, `copyTrading.ts`, `hedging.ts`, `economicCalendar.ts`, `tradingReports.ts`, `userManagement.ts`, `orderAnalytics.ts`, `consistencyCheck.ts`, `internalNotes.ts`

---

## 13. Widgets

### Chat Widget (`public/chat-widget.js`)
- Embedded floating chat bubble for client sites
- Injected via `<script src="...chat-widget.js"></script>`
- Communicates with `/support` endpoint (guest conversations)

---

## 14. Real-time Features

### Polling-Based
- **Conversations**: 5s polling via `supportService.subscribeToConversations()`
- **Messages**: 3s polling via `supportService.subscribeToMessages()`
- **Deduplication**: Timestamp-based
- **Cleanup**: Manual unsubscribe on component unmount

### Audio Notifications
- `utils/audioNotifications.ts` - Sounds on new messages
- Used in support dashboard

### Supabase (Available but minimal use)
- Client configured in `integrations/supabase/client.ts`
- Real-time capability available but not actively used

---

## 15. Internationalization

- **Framework**: i18next + react-i18next
- **Default**: English
- **Hook**: `useLanguage()` → `{ t, i18n }`
- **Storage**: User profile preference

---

## 16. Important Notes

1. **API Base URL**: Points to `https://api.we-fund.com`. Change in `.env` and rebuild.
2. **Polling vs WebSocket**: Currently polling for support dashboard. Supabase real-time available for migration.
3. **Timezone**: Support dashboard forces UTC+2 (fixed offset, no DST).
4. **Token Refresh**: Auto-refresh on 401. If refresh fails → redirect to `/auth`.
5. **No Redux/Zustand**: React Query + Context API only.
6. **Tailwind Only**: No CSS modules or styled-components.
7. **Build on Server**: Bastion has limited RAM. Build happens on target server, not bastion.
8. **88 Services**: Each wraps Django API endpoints. Plain REST, no GraphQL.
9. **Mobile Responsive**: `useIsMobile()` hook, sidebar converts to drawer.
10. **Error Handling**: Services throw errors; pages should use error boundaries.
