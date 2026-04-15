
import React, { Suspense, useContext } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, AuthContext } from "@/contexts/AuthContext";
import { ImpersonationBar } from "./components/shared/ImpersonationBar";
import { OfflineDetector } from "./components/shared/OfflineDetector";
import AppLayout from "./components/layouts/AppLayout";
import { Loader2 } from 'lucide-react';
import PromoPopup from "@/components/PromoPopup";

// Auth pages - keep eager since they're entry points
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ImpersonatePage from "./pages/ImpersonatePage";
import NotFound from "./pages/NotFound";

// Lazy-loaded protected pages
const DashboardPage = React.lazy(() => import("./pages/DashboardPage"));
const ChallengesPage = React.lazy(() => import("./pages/ChallengesPage"));
const WithdrawlPage = React.lazy(() => import("./pages/WithdrawlPage"));
const CertificatesPage = React.lazy(() => import("./pages/CertificatesPage").then(m => ({ default: m.CertificatesPage })));
const MyOffersPage = React.lazy(() => import("./pages/MyOffersPage").then(m => ({ default: m.MyOffersPage })));
const LeaderboardsPage = React.lazy(() => import("./pages/LeaderboardsPage").then(m => ({ default: m.LeaderboardsPage })));
const LotsizeCalculatorPage = React.lazy(() => import("./pages/LotsizeCalculatorPage"));
const ForexHeatmapPage = React.lazy(() => import("./pages/ForexHeatmapPage").then(m => ({ default: m.ForexHeatmapPage })));
const EconomicCalenderPage = React.lazy(() => import("./pages/EconomicCalenderPage").then(m => ({ default: m.EconomicCalenderPage })));
const TradingViewPage = React.lazy(() => import("./pages/TradingViewPage").then(m => ({ default: m.TradingViewPage })));
const ChallengeComparisonPage = React.lazy(() => import("./pages/ChallengeComparisonPage"));
const AffiliatePage = React.lazy(() => import("./pages/AffiliatePage").then(m => ({ default: m.AffiliatePage })));
const AffiliateLoginPage = React.lazy(() => import("./pages/AffiliateLoginPage").then(m => ({ default: m.AffiliateLoginPage })));
const AffiliateWalletTransactionsPage = React.lazy(() => import("./pages/AffiliateWalletTransactionsPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const MyStatsPage = React.lazy(() => import("./pages/MyStatsPage").then(m => ({ default: m.MyStatsPage })));
const NotificationsPage = React.lazy(() => import("./pages/NotificationsPage"));
const SubmitEAPage = React.lazy(() => import("./pages/SubmitEAPage"));
const WeCoinsPage = React.lazy(() => import("./pages/WeCoinsPage"));
const WeCoinsFullPage = React.lazy(() => import("./pages/WeCoinsFullPage"));
const CompetitionsPage = React.lazy(() => import("./pages/CompetitionsPage"));
const CompetitionsFullPage = React.lazy(() => import("./pages/CompetitionsFullPage"));
const JournalPage = React.lazy(() => import("./pages/JournalPage"));
const SharedJournalPage = React.lazy(() => import("./pages/SharedJournalPage"));
const VerifyCertificatePage = React.lazy(() => import("./pages/VerifyCertificatePage"));

// Content-area loading spinner (shown inside AppLayout while chunks load)
const ContentLoader = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[400px]">
    <Loader2 className="w-8 h-8 animate-spin text-[#3AB3FF]" />
  </div>
);

// Protected layout: handles auth check, renders AppLayout with header/sidebar,
// and wraps page content in Suspense so the layout stays visible during loading
const ProtectedLayout = () => {
  const context = useContext(AuthContext);

  if (!context) {
    return (
      <AppLayout>
        <ContentLoader />
      </AppLayout>
    );
  }

  const { user, isLoading } = context;

  if (isLoading) {
    return (
      <AppLayout>
        <ContentLoader />
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<ContentLoader />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  );
};

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineDetector>
          <BrowserRouter>
            <AuthProvider>
              <ImpersonationBar />
              <PromoPopup />
              <Routes>
              <Route path="/login" element={<LoginPage/>} />
              <Route path="/register" element={<RegisterPage/>} />
              <Route path="/forgot-password" element={<ForgotPasswordPage/>} />
              <Route path="/reset-password" element={<ResetPasswordPage/>} />
              <Route path="/impersonate" element={<ImpersonatePage/>} />
              <Route path="/affiliate/login" element={
                <Suspense fallback={<ContentLoader />}>
                  <AffiliateLoginPage/>
                </Suspense>
              } />

              {/* Public certificate verification */}
              <Route path="/verify/:certificateId" element={
                <Suspense fallback={<ContentLoader />}>
                  <VerifyCertificatePage />
                </Suspense>
              } />

              {/* Public shared journal routes */}
              <Route path="/j/:token" element={
                <Suspense fallback={<ContentLoader />}>
                  <SharedJournalPage />
                </Suspense>
              } />
              <Route path="/:token" element={
                <Suspense fallback={<ContentLoader />}>
                  <SharedJournalPage />
                </Suspense>
              } />

              {/* Protected routes - AppLayout is always rendered */}
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<DashboardPage/>} />
                <Route path="/challenges" element={<ChallengesPage/>} />
                <Route path="/withdrawl" element={<WithdrawlPage/>} />
                <Route path="/certificates" element={<CertificatesPage/>} />
                <Route path="/offers" element={<MyOffersPage/>} />
                <Route path="/lotsize" element={<LotsizeCalculatorPage/>} />
                <Route path="/forexHeatmap" element={<ForexHeatmapPage/>} />
                <Route path="/challengeComparison" element={<ChallengeComparisonPage/>} />
                <Route path="/economicCalendar" element={<EconomicCalenderPage/>} />
                <Route path="/tradingView" element={<TradingViewPage/>} />
                <Route path="/affiliate" element={<AffiliatePage/>} />
                <Route path="/affiliate/wallet-transactions" element={<AffiliateWalletTransactionsPage/>} />
                <Route path="/settings" element={<SettingsPage/>} />
                <Route path="/myStats" element={<MyStatsPage/>} />
                <Route path="/journal" element={<JournalPage/>} />
                <Route path="/leaderboards" element={<LeaderboardsPage/>} />
                <Route path="/notifications" element={<NotificationsPage/>} />
                <Route path="/submit-ea" element={<SubmitEAPage/>} />
                <Route path="/wecoins" element={<WeCoinsPage/>} />
                <Route path="/wecoins-full" element={<WeCoinsFullPage/>} />
                <Route path="/competitions" element={<CompetitionsPage/>} />
                <Route path="/competitions-full" element={<CompetitionsFullPage/>} />
                <Route path="/" element={<DashboardPage/>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </AuthProvider>
          </BrowserRouter>
        </OfflineDetector>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
