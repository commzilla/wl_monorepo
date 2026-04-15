# WeFund Client Frontend - Complete Handover Documentation

> **Repository**: `commzilla/wefund-frontend`
> **Framework**: React 18.3.1 + TypeScript 5.5.3
> **Build Tool**: Vite 5.4.1
> **UI**: Tailwind CSS 3.4.11 + shadcn/ui (Radix UI)
> **Deploys to**: `frontend-client.we-fund.com` (49.13.89.241)

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack](#2-tech-stack)
3. [All Pages & Routes (32)](#3-all-pages--routes-32)
4. [Components (26 categories)](#4-components-26-categories)
5. [API Layer](#5-api-layer)
6. [Authentication System](#6-authentication-system)
7. [State Management](#7-state-management)
8. [Internationalization (16 languages)](#8-internationalization-16-languages)
9. [Key Features](#9-key-features)
10. [Environment Variables](#10-environment-variables)
11. [Build & Deployment](#11-build--deployment)
12. [Important Notes](#12-important-notes)

---

## 1. Project Structure

```
/root/wefund-frontend/
├── src/
│   ├── App.tsx                    # Main router & providers
│   ├── main.tsx                   # Entry point with error handling
│   ├── index.css                  # Global styles
│   ├── components/                # 26 feature directories
│   │   ├── ui/                    # 48 shadcn/ui components
│   │   ├── shared/                # Header, Sidebar, SupportWidget, LanguageSelector
│   │   ├── layouts/               # AppLayout, ProtectedRoute
│   │   ├── auth/                  # LoginForm, RegisterForm, FirstLoginModal
│   │   ├── dashboard/             # Achievements, ChallengeCards, Leaderboard
│   │   ├── challenges/            # ProgressCard, TradingChart, TradeHistory
│   │   ├── myStats/               # TradingStats, DailySummary, OpenHoldings
│   │   ├── journal/               # 20+ components: Calendar, AI Insights, Replay, Monte Carlo
│   │   ├── withdrawl/             # MetricsCard, PayoutHistory, PayoutRequest
│   │   ├── wecoins/               # TaskCard, ProgressSection, Redeem, Submissions
│   │   ├── certificates/          # CertificateCard, MyCertificates
│   │   ├── affiliate/             # ReferralTable, PayoutForm
│   │   ├── competitions/          # CompetitionCard, Leaderboard, JoinModal
│   │   ├── notifications/         # NotificationDropdown, NotificationItem
│   │   ├── settings/              # ProfileTab, PrivacyTab, NotificationsTab, PaymentTab
│   │   ├── lotsize/               # LotSizeCalculator
│   │   ├── bookScaling/           # BookScalingCalculator
│   │   ├── forexHeatmap/          # HeatmapChart
│   │   ├── economicCalender/      # EconomicCalendar
│   │   ├── tradingView/           # TradingView embed
│   │   └── challengeComparison/   # ComparisonTable
│   ├── pages/                     # 32 page components (lazy-loaded)
│   ├── contexts/                  # AuthContext, LanguageContext
│   ├── hooks/                     # useJournal, useMyStatsState, useMobile, useToast
│   ├── utils/
│   │   ├── api.ts                 # All API functions (2291 lines)
│   │   ├── storage.ts             # Multi-tier storage fallback
│   │   ├── currencyFormatter.ts
│   │   ├── countryUtils.ts
│   │   ├── passwordValidation.ts
│   │   └── browserCompat.ts
│   ├── i18n/
│   │   └── locales/               # 16 language JSON files
│   └── lib/
│       └── utils.ts               # cn() Tailwind helper
├── public/                        # Static assets
├── index.html
├── package.json
├── vite.config.ts                 # Code splitting config
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
| UI | Radix UI (shadcn/ui, 48 components) | ~1.x |
| Styling | Tailwind CSS | 3.4.11 |
| Routing | React Router DOM | 6.26.2 |
| Server State | TanStack React Query | 5.56.2 |
| Forms | React Hook Form + Zod | 7.53.0 / 3.23.8 |
| Charts | Recharts | 2.15.3 |
| Icons | Lucide React + React Icons | 0.462.0 / 5.5.0 |
| i18n | i18next + react-i18next | 25.6.2 / 16.3.0 |
| Dates | date-fns | 3.6.0 |
| Toasts | Sonner | 1.5.0 |
| Backend | Supabase (real-time support) | 2.81.0 |

---

## 3. All Pages & Routes (32)

### Auth Pages (Public)
| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | LoginPage | Client/Affiliate login |
| `/register` | RegisterPage | Client registration |
| `/forgot-password` | ForgotPasswordPage | Password reset request |
| `/reset-password` | ResetPasswordPage | Confirm reset with token |
| `/affiliate/login` | AffiliateLoginPage | Affiliate login |
| `/impersonate` | ImpersonatePage | Admin impersonation |

### Public Routes (No Auth)
| Route | Component | Description |
|-------|-----------|-------------|
| `/verify/:certificateId` | VerifyCertificatePage | Public certificate verification |
| `/j/:token` | SharedJournalPage | Public shared trading journal |
| `/:token` | SharedJournalPage | Alternate journal URL |

### Protected Routes (Requires Auth)
| Route | Component | Description |
|-------|-----------|-------------|
| `/` & `/dashboard` | DashboardPage | Main dashboard with achievements, challenges, leaderboard |
| `/challenges` | ChallengesPage | Active trading challenges |
| `/withdrawl` | WithdrawlPage | Payout management (note: route typo is intentional) |
| `/certificates` | CertificatesPage | Trading certificates gallery |
| `/offers` | MyOffersPage | Promotional offers |
| `/leaderboards` | LeaderboardsPage | Top traders ranking |
| `/journal` | JournalPage | Trade journal with AI insights |
| `/wecoins` | WeCoinsPage | Mini WeCoins widget |
| `/wecoins-full` | WeCoinsFullPage | Full WeCoins page |
| `/competitions` | CompetitionsPage | Competitions beta gate |
| `/competitions-full` | CompetitionsFullPage | Full competitions |
| `/affiliate` | AffiliatePage | Affiliate dashboard |
| `/affiliate/wallet-transactions` | AffiliateWalletTransactionsPage | Wallet history |
| `/myStats` | MyStatsPage | Personal trading statistics |
| `/lotsize` | LotsizeCalculatorPage | Position size calculator |
| `/bookScaling` | BookScalingPage | A-book scaling tool |
| `/forexHeatmap` | ForexHeatmapPage | Currency heatmap |
| `/economicCalendar` | EconomicCalendarPage | Economic events |
| `/tradingView` | TradingViewPage | TradingView charts |
| `/challengeComparison` | ChallengeComparisonPage | Compare challenges |
| `/settings` | SettingsPage | Profile, privacy, notifications, payment methods |
| `/submit-ea` | SubmitEAPage | Expert Advisor approval |
| `/notifications` | NotificationsPage | Notification history |
| `*` | NotFound | 404 page |

---

## 4. Components (26 categories)

### UI Components (48 shadcn/ui)
Button, Dialog, Input, Select, Tabs, Card, Badge, Avatar, Accordion, Alert, Calendar, Carousel, Chart, Checkbox, Collapsible, Command, ContextMenu, DropdownMenu, Form, HoverCard, Label, Menubar, Pagination, Popover, Progress, RadioGroup, ScrollArea, Separator, Sheet, Sidebar, Skeleton, Slider, Switch, Table, Textarea, Toast, Toggle, ToggleGroup, Tooltip, etc.

### Key Feature Components

**Dashboard**: Achievements, ChallengeMetrics, ChallengeCardsGrid, TopTradersLeaderboard

**Challenges**: ChallengeDropdown, ProgressCard, TradingChart, Calendar, TradeHistoryTable, MetricsGrid

**Trade Journal (20+ components)**: JournalDashboard, AnalyticsDashboard, JournalCalendar, TradeReplayPlayer, AIInsightsPanel, AIPatternCard, AIWhatIfSimulator, MFEMAEScatterPlot, SymbolBreakdownChart, ComplianceMeters, MonteCarloChart, WinLossDistribution, EquityCurveChart, TimeAnalysisHeatmap, AIChat, JournalShareButton

**My Stats**: TradingStatsOverview, DailyTradingSummary, TradeHistoryTable, AccountSelector, OpenHoldingsTable

**WeCoins**: TaskCard (with countdown), ProgressSection (animated SVG ring), TransactionsModal, RedeemItemsModal, SubmitTaskModal

**Settings**: ProfileTab, PrivacyTab (2FA, KYC), NotificationsTab, PaymentMethodTab

**Shared**: Header, Sidebar, SupportWidget, LanguageSelector, ImpersonationBar, OfflineDetector

---

## 5. API Layer

**File**: `src/utils/api.ts` (2,291 lines)

### Authentication
| Function | Endpoint | Method |
|----------|----------|--------|
| `loginClient()` | `/auth/client/login/` | POST |
| `refreshToken()` | `/auth/client/refresh/` | POST |
| `authenticatedFetch()` | (wrapper) | Auto token refresh |

### Dashboard & Stats
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchDashboardData()` | `/client/dashboard/` | GET |
| `fetchClientInit()` | `/client/dashboard/init/` | GET |
| `fetchMyStats()` | `/client/my-stats/` | GET |
| `fetchTradingResults()` | `/client/trading-results/` | GET |
| `fetchMonthlyDailySummary()` | `/client/monthly-daily-summary/` | GET |
| `fetchDailyPnlDetail()` | `/client/daily-pnl-detail/` | GET |

### Challenges
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchGridChallenges()` | `/client/grid-challenges/` | GET |
| `fetchActiveChallenges()` | `/client/active-challenges/` | GET |
| `fetchLeaderboard()` | `/client/leaderboards/` | GET |

### Payouts
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchEligibleAccounts()` | `/client/eligible-accounts/` | GET |
| `requestPayout()` | `/client/request-payout/` | POST |
| `fetchWithdrawalData()` | `/client/withdrawal-data/` | GET |
| `fetchPaymentMethods()` | `/client/payment-methods/` | GET |

### Profile & Settings
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchUserProfileSettings()` | `/client/profile-settings/` | GET |
| `updateUserProfileSettings()` | `/client/profile-settings/` | PUT |
| `changePassword()` | `/auth/client/change-password/` | POST |

### WeCoins
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchRewardTasks()` | `/client/reward-tasks/` | GET |
| `submitRewardTask()` | `/client/reward-submissions/` | POST |
| `fetchWeCoinWallet()` | `/client/wecoins/wallet/` | GET |
| `fetchRedeemItems()` | `/client/wecoins/redeem-items/` | GET |
| `redeemItem()` | `/client/wecoins/redeem/` | POST |

### Certificates
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchCertificates()` | `/client/certificates/` | GET |

### Affiliate
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchAffiliateProfile()` | `/client/affiliate/profile/` | GET |
| `fetchAffiliateReferrals()` | `/client/affiliate/referrals/` | GET |
| `requestAffiliatePayout()` | `/client/affiliate/payout-request/` | POST |
| `fetchAffiliateWalletTransactions()` | `/client/affiliate/wallet-transactions/` | GET |

### Competitions
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchCompetitions()` | `/client/competitions/` | GET |
| `joinCompetition()` | `/client/competitions/{id}/join/` | POST |
| `fetchCompetitionLeaderboard()` | `/client/competitions/{id}/leaderboard/` | GET |

### Notifications
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchNotifications()` | `/client/notifications/` | GET |
| `markNotificationAsRead()` | `/client/notifications/{id}/read/` | PUT |

### Reset Tokens
| Function | Endpoint | Method |
|----------|----------|--------|
| `fetchEligibleResets()` | `/client/eligible-resets/` | GET |
| `purchaseResetToken()` | `/client/purchase-reset-token/` | POST |

---

## 6. Authentication System

### Auth Flow
1. User enters credentials on `/login`
2. POST `/auth/client/login/` → returns `{access, refresh, user_id, username, role, full_name, profile_picture}`
3. Tokens stored in `enhancedStorage` (localStorage → sessionStorage → memory → cookies fallback)
4. All requests include `Authorization: Bearer {access}`
5. On 401: auto token refresh, retry request
6. Cross-tab synchronization via `storage` events

### Token Management
- **Access Token**: Short-lived JWT, auto-refreshed
- **Refresh Token**: 30-day lifetime, rotation on each refresh
- **Storage Fallback**: localStorage → sessionStorage → in-memory (with cookie backup)
- **Cross-Tab Sync**: `storage` events for token updates, automatic logout sync

### First Login
- Dashboard checks `fetchClientInit()` for `is_first_login`
- Shows `FirstLoginModal` to confirm name

### Admin Impersonation
- `/impersonate` page for admin access
- `loginWithTokens()` method for token injection
- `ImpersonationBar` component shown when active

---

## 7. State Management

### React Query (@tanstack/react-query)
- Server state management with caching
- Dashboard: `refetchInterval: 30000` (30s)
- Auto-retry: 1 attempt

### React Context
1. **AuthContext** - User state, login/logout, impersonation
2. **LanguageContext** - i18n language preference

### React Hook Form + Zod
- Form state management with schema validation
- Used in login, settings, affiliate forms

### Local Storage
- Sidebar collapsed state
- Language preference
- Token storage (multi-tier fallback)

---

## 8. Internationalization (16 Languages)

**Languages**: en, es, de, fr, cs, it, vi, pt, ar, tr, hi, ru, pl, ja, ko, zh

**Implementation**:
- i18next with browser language detection
- Locale files in `src/i18n/locales/{lang}.json`
- Language context for switching
- Persistent selection in localStorage

**Usage**:
```tsx
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```

---

## 9. Key Features

### Dashboard
- Achievements: total payouts, highest payout, best trade, longest funded days
- Active challenges with progress bars (profit target, daily loss, max loss)
- Top 5 traders leaderboard

### Trading Challenges
- Multi-step challenges (Phase 1, Phase 2, Live)
- MT5 credentials display (login, password, server)
- Equity curve charts
- Trade history tables
- Reset challenge functionality
- Challenge comparison tool

### Trade Journal (Most Complex Feature)
- Equity curve chart
- Daily summary heatmap
- Win/loss distribution
- Symbol breakdown analysis
- **Trade Replay Player** - replay historical trades
- **AI Pattern Recognition** - Claude-powered pattern detection
- **AI What-If Simulator** - hypothetical trade analysis
- **Monte Carlo Simulation** - probability analysis
- MFE/MAE scatter plots
- Compliance meters
- Discipline tracking
- **Share functionality** - public link generation at `/j/{token}`

### My Stats
- Net P&L, Win Rate, Average RRR, Profit Factor
- Best/worst trades and days
- Win/loss streaks
- Daily P&L chart
- Account selector for multi-account users
- Open holdings view
- Reset token purchase

### WeCoins & Rewards
- Task cards with countdown timers
- Animated SVG progress ring
- WeCoin wallet with balance
- Transaction history
- Redeem marketplace items
- Task submission with proof

### Payout/Withdrawal
- View eligible accounts with metrics
- Request payouts with payment method selection
- Payout history per account
- Profit share percentage display
- Payment cycle information

### Settings
- **Profile**: Name, email, phone, DOB, profile picture upload
- **Privacy**: Two-factor authentication, KYC status
- **Notifications**: Email/system notification preferences
- **Payment Methods**: Crypto (USDT TRC20/ERC20, BTC, ETH) and Fiat (Rise)

### Affiliate Dashboard
- Referral tracking with search/filter/sort
- Commission earnings display
- Payout requests
- Wallet transaction history

### Competitions (Beta)
- Beta access gate with approval
- View & join competitions
- Competition-specific leaderboards
- Prize information

### Tools
- **Lot Size Calculator** - Position size calculation
- **Book Scaling Calculator** - A-book scaling
- **Forex Heatmap** - Currency strength visualization
- **Economic Calendar** - Upcoming events
- **TradingView** - Embedded charts
- **Challenge Comparison** - Side-by-side comparison

---

## 10. Environment Variables

```env
VITE_API_BASE_URL="https://api.we-fund.com"
VITE_SUPABASE_PROJECT_ID="fdbwwgnioqhxxmifvjam"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_URL="https://fdbwwgnioqhxxmifvjam.supabase.co"
VITE_JOURNAL_SHARE_BASE_URL="https://journal.we-fund.com"
```

---

## 11. Build & Deployment

### Build Commands
```bash
npm run build    # Production build → dist/
npm run dev      # Dev server on port 8080
npm run preview  # Preview production
```

### Code Splitting
Vite `rollupOptions` with manual chunks:
- `vendor-react` (React, ReactDOM)
- `vendor-router` (React Router)
- `vendor-ui` (Radix UI)

### Performance
- Lazy-loaded pages via `React.lazy()` + `Suspense`
- Code splitting via Vite rollup chunks
- React Query caching
- `useMemo` for expensive computations
- CDN-served images (cdn.builder.io)
- Multi-tier storage fallback
- Safari-specific optimizations

### Deployment
- **Server**: `frontend-client.we-fund.com` (49.13.89.241)
- **Build output**: `dist/`
- **Deploy**: `git pull` → `npm install` → `npm run build` → copy to web root

---

## 12. Important Notes

1. **Route typo**: `/withdrawl` (missing 'a') - matches backend, do not change
2. **Token rotation**: New refresh token on each refresh
3. **Safari handling**: Special localStorage fallback for cross-origin restrictions
4. **First login modal**: Non-dismissible, must complete to continue
5. **Journal share**: Public links at `/j/{token}` and `/{token}` (backward compat)
6. **Competitions**: Beta gated - checks access before rendering full page
7. **Affiliate 404**: No profile returns 404, prompts creation
8. **Impersonation**: Admin debug feature via `/impersonate`
9. **Support widget**: Loads external `support-widget.js` from backend
10. **Offline detection**: `OfflineDetector` component shows banner when offline
