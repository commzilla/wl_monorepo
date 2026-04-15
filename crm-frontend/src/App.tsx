import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleBasedRoute from '@/components/auth/RoleBasedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/NotFound';
import Traders from '@/pages/Traders';
import TraderDetail from '@/pages/TraderDetail';
import ReviewTraderProfile from '@/pages/ReviewTraderProfile';
import TradingActivity from '@/pages/TradingActivity';
import PayoutTradingActivity from '@/pages/PayoutTradingActivity';
import EnrollmentReview from '@/pages/EnrollmentReview';
import TradeManagement from '@/pages/TradeManagement';
import Challenges from '@/pages/Challenges';
import BulkChallengeEnrollments from '@/pages/BulkChallengeEnrollments';
import ChallengeProducts from '@/pages/ChallengeProducts';
import ChallengeConfigurations from '@/pages/ChallengeConfigurations';
import Payouts from '@/pages/Payouts';
import PayoutRequest from '@/pages/PayoutRequest';
import RiskManagement from '@/pages/RiskManagement';
import RiskScan from '@/pages/RiskScan';
import KYC from '@/pages/KYC';
import Tickets from '@/pages/Tickets';
import Support from '@/pages/Support';
import SettingsPage from '@/pages/Settings';
import ExpertAdvisors from '@/pages/ExpertAdvisors';
import Affiliates from '@/pages/Affiliates';
import AffiliateManager from '@/pages/AffiliateManager';
import ChatWidget from '@/pages/ChatWidget';
import SupportDashboard from '@/pages/SupportDashboard';
import OrderHistory from '@/pages/OrderHistory';
import Certificates from '@/pages/Certificates';
import { Toaster } from '@/components/ui/toaster';
import Offers from '@/pages/Offers';
import PayoutConfiguration from '@/pages/PayoutConfiguration';
import Configuration from '@/pages/Configuration';
import Notifications from '@/pages/Notifications';
import Email from '@/pages/Email';
import MigrationLogs from '@/pages/MigrationLogs';
import ActivityLogs from '@/pages/ActivityLogs';
import EventLogs from '@/pages/EventLogs';
import IPAnalysis from '@/pages/IPAnalysis';
import TopEarningTraders from '@/pages/TopEarningTraders';
import StopLossHistory from '@/pages/StopLossHistory';
import CopyTrading from '@/pages/CopyTrading';
import Hedging from '@/pages/Hedging';
import WeCoinsTasks from '@/pages/WeCoins/Tasks';
import WeCoinsAutoRules from '@/pages/WeCoins/AutoRules';
import WeCoinsSubmissions from '@/pages/WeCoins/Submissions';
import WeCoinsRedeemItems from '@/pages/WeCoins/RedeemItems';
import WeCoinsLedgerBook from '@/pages/WeCoins/LedgerBook';
import WeCoinsBetaAccess from '@/pages/WeCoins/BetaAccess';
import WeCoinsRedemption from '@/pages/WeCoins/Redemption';
import ChallengeWisePayouts from '@/pages/Analytics/ChallengeWisePayouts';
import AccountSizeWisePayouts from '@/pages/Analytics/AccountSizeWisePayouts';
import CountryWisePayouts from '@/pages/Analytics/CountryWisePayouts';
import UnprofitableCountries from '@/pages/Analytics/UnprofitableCountries';
import RiskCoreMetrics from '@/pages/Analytics/RiskCoreMetrics';
import TrendsAnalytics from '@/pages/Analytics/TrendsAnalytics';
import TraderBehavior from '@/pages/Analytics/TraderBehavior';
import TraderJourney from '@/pages/Analytics/TraderJourney';
import PayoutAIAnalysis from '@/pages/PayoutAIAnalysis';
import Campaign from '@/pages/Competitions/Campaign';
import Registrations from '@/pages/Competitions/Registrations';
import Leaderboard from '@/pages/Competitions/Leaderboard';
import CompetitionsBetaAccess from '@/pages/Competitions/BetaAccess';
import LeaderboardManagement from '@/pages/LeaderboardManagement';
import FAQManagement from '@/pages/FAQManagement';
import AILearningCenter from '@/pages/AILearningCenter';
import AdminAISettings from '@/pages/AdminAISettings';
import EconomicCalendar from '@/pages/EconomicCalendar';
import TradingReports from '@/pages/TradingReports';
import SystemHealth from '@/pages/SystemHealth';
import ZohoExports from '@/pages/ZohoExports';
import Releases from '@/pages/Releases';
import BlogManagement from '@/pages/BlogManagement';
import BlogPostEditorPage from '@/components/blog/BlogPostEditor';
import WebsiteProducts from '@/pages/WebsiteProducts';
import DiscountCodes from '@/pages/DiscountCodes';
import WebsiteOrders from '@/pages/WebsiteOrders';
import Meetings from '@/pages/Meetings';
import WhatsAppDashboard from '@/pages/WhatsAppDashboard';
import { VersionChecker } from '@/components/version/VersionChecker';
import BookingPage from '@/pages/meeting/BookingPage';
import ConfirmationPage from '@/pages/meeting/ConfirmationPage';
import RoomPage from '@/pages/meeting/RoomPage';
import MeetingNotFound from '@/pages/meeting/NotFound';

// Import i18n configuration
import '@/lib/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/support" element={<Support />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager', 'content_creator']} requiredPermissions={['dashboard.view']}>
                  <Index />
                </RoleBasedRoute>
              } />
              <Route path="analytics/challenge-wise-payouts" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <ChallengeWisePayouts />
                </RoleBasedRoute>
              } />
              <Route path="analytics/account-size-wise-payouts" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <AccountSizeWisePayouts />
                </RoleBasedRoute>
              } />
              <Route path="analytics/country-wise-payouts" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <CountryWisePayouts />
                </RoleBasedRoute>
              } />
              <Route path="analytics/unprofitable-countries" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <UnprofitableCountries />
                </RoleBasedRoute>
              } />
              <Route path="analytics/risk-core-metrics" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <RiskCoreMetrics />
                </RoleBasedRoute>
              } />
              <Route path="analytics/trends" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <TrendsAnalytics />
                </RoleBasedRoute>
              } />
              <Route path="analytics/trader-behavior" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <TraderBehavior />
                </RoleBasedRoute>
              } />
              <Route path="analytics/trader-journey" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['analytics.view_challenge_payouts']}>
                  <TraderJourney />
                </RoleBasedRoute>
              } />
              <Route path="traders" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['traders.view']}>
                  <Traders />
                </RoleBasedRoute>
              } />
              <Route path="traders/:traderId/review" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['traders.view_detail']}>
                  <ReviewTraderProfile />
                </RoleBasedRoute>
              } />
              <Route path="trading-activity/:traderId/:challengeId" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['trades.view']}>
                  <TradingActivity />
                </RoleBasedRoute>
              } />
              <Route path="trading-activity/payout/:payoutId" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['payouts.view']}>
                  <PayoutTradingActivity />
                </RoleBasedRoute>
              } />
              <Route path="enrollment-review/:enrollmentId" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['enrollments.review']}>
                  <EnrollmentReview />
                </RoleBasedRoute>
              } />
              <Route path="trade-management" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['trades.view']}>
                  <TradeManagement />
                </RoleBasedRoute>
              } />
              <Route path="challenges" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['challenges.view']}>
                  <Challenges />
                </RoleBasedRoute>
              } />
              <Route path="bulk-challenge-enrollments" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['enrollments.bulk_import']}>
                  <BulkChallengeEnrollments />
                </RoleBasedRoute>
              } />
              <Route path="challenge-products" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['challenges.view']}>
                  <ChallengeProducts />
                </RoleBasedRoute>
              } />
              <Route path="offers" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['orders.view']}>
                  <Offers />
                </RoleBasedRoute>
              } />
              <Route path="payouts" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['payouts.view']}>
                  <Payouts />
                </RoleBasedRoute>
              } />
              <Route path="payout-request" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['payouts.view']}>
                  <PayoutRequest />
                </RoleBasedRoute>
              } />
              <Route path="configuration" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['config.view']}>
                  <Configuration />
                </RoleBasedRoute>
              } />
              <Route path="notifications" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager', 'content_creator']} requiredPermissions={['notifications.view']}>
                  <Notifications />
                </RoleBasedRoute>
              } />
              <Route path="email" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['email.view']}>
                  <Email />
                </RoleBasedRoute>
              } />
              <Route path="certificates" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager', 'content_creator']} requiredPermissions={['certificates.view']}>
                  <Certificates />
                </RoleBasedRoute>
              } />
              <Route path="risk-management" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.view_dashboard']}>
                  <RiskManagement />
                </RoleBasedRoute>
              } />
              <Route path="risk-scan" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.run_scan']}>
                  <RiskScan />
                </RoleBasedRoute>
              } />
              <Route path="stoploss-history" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.view_stoploss']}>
                  <StopLossHistory />
                </RoleBasedRoute>
              } />
              <Route path="ip-analysis" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.view_ip_analysis']}>
                  <IPAnalysis />
                </RoleBasedRoute>
              } />
              <Route path="top-earning-traders" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.view_top_earners']}>
                  <TopEarningTraders />
                </RoleBasedRoute>
              } />
              <Route path="copy-trading" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.view_copy_trading']}>
                  <CopyTrading />
                </RoleBasedRoute>
              } />
              <Route path="hedging" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.view_hedging']}>
                  <Hedging />
                </RoleBasedRoute>
              } />
              <Route path="kyc" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['kyc.view']}>
                  <KYC />
                </RoleBasedRoute>
              } />
              <Route path="tickets" element={
                <RoleBasedRoute allowedRoles={['admin', 'support']} requiredPermissions={['support.view']}>
                  <Tickets />
                </RoleBasedRoute>
              } />
              <Route path="chat-widget" element={
                <RoleBasedRoute allowedRoles={['admin', 'support']} requiredPermissions={['support.manage_config']}>
                  <ChatWidget />
                </RoleBasedRoute>
              } />
              <Route path="support-dashboard" element={
                <RoleBasedRoute allowedRoles={['admin', 'support']} requiredPermissions={['support.view']}>
                  <SupportDashboard />
                </RoleBasedRoute>
              } />
              <Route path="meetings" element={
                <RoleBasedRoute allowedRoles={['admin', 'support']} requiredPermissions={['meetings.view']}>
                  <Meetings />
                </RoleBasedRoute>
              } />
              <Route path="whatsapp" element={
                <RoleBasedRoute allowedRoles={['admin', 'support']} requiredPermissions={['whatsapp.view']}>
                  <WhatsAppDashboard />
                </RoleBasedRoute>
              } />
              <Route path="affiliates" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['affiliates.view']}>
                  <Affiliates />
                </RoleBasedRoute>
              } />
              <Route path="affiliates/manager/:userId" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['affiliates.view']}>
                  <AffiliateManager />
                </RoleBasedRoute>
              } />
              <Route path="order-history" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['orders.view']}>
                  <OrderHistory />
                </RoleBasedRoute>
              } />
              <Route path="settings" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager', 'content_creator']} requiredPermissions={['dashboard.view']}>
                  <SettingsPage />
                </RoleBasedRoute>
              } />
              <Route path="migration-logs" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['system.view_migration_logs']}>
                  <MigrationLogs />
                </RoleBasedRoute>
              } />
              <Route path="activity-logs" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['system.view_activity_logs']}>
                  <ActivityLogs />
                </RoleBasedRoute>
              } />
              <Route path="event-logs" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['system.view_event_logs']}>
                  <EventLogs />
                </RoleBasedRoute>
              } />
              <Route path="admin/expert-advisors" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['risk.manage_ea']}>
                  <ExpertAdvisors />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/tasks" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsTasks />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/auto-rules" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsAutoRules />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/submissions" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsSubmissions />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/redeem-items" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsRedeemItems />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/redemption" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsRedemption />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/ledger-book" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsLedgerBook />
                </RoleBasedRoute>
              } />
              <Route path="wecoins/beta-access" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk', 'discord_manager']} requiredPermissions={['wecoins.view_tasks']}>
                  <WeCoinsBetaAccess />
                </RoleBasedRoute>
              } />
              <Route path="payout-ai-analysis" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['risk.ai_analysis']}>
                  <PayoutAIAnalysis />
                </RoleBasedRoute>
              } />
              <Route path="competitions/campaign" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['competitions.view']}>
                  <Campaign />
                </RoleBasedRoute>
              } />
              <Route path="competitions/registrations" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['competitions.view']}>
                  <Registrations />
                </RoleBasedRoute>
              } />
              <Route path="competitions/leaderboard" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['competitions.view']}>
                  <Leaderboard />
                </RoleBasedRoute>
              } />
              <Route path="competitions/beta-access" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'risk']} requiredPermissions={['competitions.view']}>
                  <CompetitionsBetaAccess />
                </RoleBasedRoute>
              } />
              <Route path="leaderboard-management" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['leaderboard.manage']}>
                  <LeaderboardManagement />
                </RoleBasedRoute>
              } />
              <Route path="faq-management" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['faq.manage']}>
                  <FAQManagement />
                </RoleBasedRoute>
              } />
              <Route path="ai-learning" element={
                <RoleBasedRoute allowedRoles={['admin', 'risk']} requiredPermissions={['risk.ai_learning']}>
                  <AILearningCenter />
                </RoleBasedRoute>
              } />
              <Route path="economic-calendar" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['economic_calendar.view']}>
                  <EconomicCalendar />
                </RoleBasedRoute>
              } />
              <Route path="trading-reports" element={
                <RoleBasedRoute allowedRoles={['admin', 'support', 'discord_manager']} requiredPermissions={['trading_reports.view']}>
                  <TradingReports />
                </RoleBasedRoute>
              } />
              <Route path="admin-ai-settings" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['config.manage_ai_rules']}>
                  <AdminAISettings />
                </RoleBasedRoute>
              } />
              <Route path="system-health" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['system.view_health']}>
                  <SystemHealth />
                </RoleBasedRoute>
              } />
              <Route path="zoho-exports" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['system.zoho_export']}>
                  <ZohoExports />
                </RoleBasedRoute>
              } />
              <Route path="releases" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['system.view_releases']}>
                  <Releases />
                </RoleBasedRoute>
              } />
              <Route path="blog" element={
                <RoleBasedRoute allowedRoles={['admin', 'content_creator']} requiredPermissions={['blog.view']}>
                  <BlogManagement />
                </RoleBasedRoute>
              } />
              <Route path="blog/new" element={
                <RoleBasedRoute allowedRoles={['admin', 'content_creator']} requiredPermissions={['blog.view']}>
                  <BlogPostEditorPage />
                </RoleBasedRoute>
              } />
              <Route path="blog/edit/:postId" element={
                <RoleBasedRoute allowedRoles={['admin', 'content_creator']} requiredPermissions={['blog.view']}>
                  <BlogPostEditorPage />
                </RoleBasedRoute>
              } />
              <Route path="website-products" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['website_products.view']}>
                  <WebsiteProducts />
                </RoleBasedRoute>
              } />
              <Route path="discount-codes" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['discount_codes.view']}>
                  <DiscountCodes />
                </RoleBasedRoute>
              } />
              <Route path="website-orders" element={
                <RoleBasedRoute allowedRoles={['admin']} requiredPermissions={['website_orders.view']}>
                  <WebsiteOrders />
                </RoleBasedRoute>
              } />
            </Route>
            {/* Public meeting booking pages (served on meet.we-fund.com) */}
            <Route path="/:slug" element={<BookingPage />} />
            <Route path="/booking/:bookingId" element={<ConfirmationPage />} />
            <Route path="/room/:bookingId" element={<RoomPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <VersionChecker />
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
