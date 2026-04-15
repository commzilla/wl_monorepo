

# Sidebar Restructuring Plan

## Overview
Restructure the sidebar navigation in `AppSidebar.tsx` to organize menu items into logical sections with labeled groups, while only including pages that currently exist in the codebase.

## New Structure

Based on your requirements and existing routes, here's the final sidebar structure:

### Core Operations (no label - top section)
- Dashboard `/`
- Traders `/traders`
- Challenges `/challenges`
- Trades `/trade-management`

### Finance
- Payouts `/payout-request`
- Orders `/order-history`
- Offers `/offers`
- Affiliates `/affiliates`

### Compliance
- KYC `/kyc`
- Risk (dropdown)
  - Stop Loss History `/stoploss-history`
  - IP Analysis `/ip-analysis`
  - Top Earning Traders `/top-earning-traders`
  - EA Approval `/admin/expert-advisors`
  - AI Risk `/payout-ai-analysis`

*Note: Economic Calendar and FAQ pages don't exist yet - will be hidden*

### Engagement
- WeCoins (dropdown)
  - Tasks `/wecoins/tasks`
  - Submissions `/wecoins/submissions`
  - Redemption `/wecoins/redemption`
  - Redeem Items `/wecoins/redeem-items`
  - Ledger Book `/wecoins/ledger-book`
- Competitions (dropdown)
  - Campaign `/competitions/campaign`
  - Registrations `/competitions/registrations`
  - Leaderboard `/competitions/leaderboard`

*Note: Meeting page doesn't exist yet - will be hidden*

### Support
- Live Chat `/chat-widget`
- Notifications `/notifications`

### Admin
- Analytics (dropdown, admin only)
  - Challenge Wise Payouts
  - Account Size Wise Payouts
  - Country Wise Payouts
  - Unprofitable Countries
  - Risk Core Metrics
  - Trends Analytics
  - Trader Behavior
  - Trader Journey
- Event Logs `/event-logs`
- Configuration `/configuration` (admin only)
- Settings `/settings`

*Note: Tech section items (AI Agents, Services Health, Webhook, Beta, System, Chat Widget, Admin AI, Migration Tool, FAQ Management) don't exist yet - will be hidden*

## Technical Implementation

### 1. Update AppSidebar.tsx

**Add Section Label Component**
Create a new `SidebarSectionLabel` component to render section headers like "Finance", "Compliance", etc.

**Restructure Navigation Items**
Replace the current flat `baseLinks` array with a structured sections-based approach:

```typescript
interface NavSection {
  label?: string; // Optional for core operations
  items: NavItem[];
  roles: string[];
}
```

**Update Dropdown Items**
- Modify `riskDropdownItems` to include the new items (Stop Loss History, IP Analysis, Top Earning Traders, EA Approval, AI Risk)
- Remove Risk Scan and Risk Management from dropdown (they were the old structure)
- Keep WeCoins, Competitions, and Analytics dropdowns

**Role-Based Visibility**
Each section will have role-based visibility:
- Core Operations: all roles
- Finance: admin, support, risk, discord_manager (for affiliates)
- Compliance: admin, support, risk
- Engagement: admin, support, risk, discord_manager
- Support: admin, support, risk
- Admin: varies per item

### 2. Visual Changes

- Add subtle section dividers between groups
- Section labels will be muted text, smaller font
- Collapsed state will hide section labels but maintain grouping

### 3. Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Complete restructure with sections, new section label component, updated dropdown items |

### 4. Items Excluded (Don't Exist Yet)

These items from your spec will NOT be added as they don't have corresponding pages:
- Economic Calendar
- FAQ (in Risk dropdown)
- Meeting
- AI Agents
- Services Health
- Webhook
- Beta
- System
- Admin AI
- Migration Tool
- FAQ Management
- Chat Widget (in Tech section - the existing one is in Support)

The existing pages that ARE included cover the core functionality of your requested structure.
