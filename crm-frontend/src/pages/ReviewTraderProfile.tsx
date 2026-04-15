import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { traderService } from '@/services/traderService';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import {
  User,
  ShoppingCart,
  Trophy,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Award,
  Bell,
  Users,
  Activity,
  Coins,
} from 'lucide-react';

// Tab components
import ProfileHeader from '@/components/profile-manager/ProfileHeader';
import ProfileTab from '@/components/profile-manager/ProfileTab';
import OrdersTab from '@/components/profile-manager/OrdersTab';
import ChallengesTab from '@/components/profile-manager/ChallengesTab';
import TradesTab from '@/components/profile-manager/TradesTab';
import PayoutsTab from '@/components/profile-manager/PayoutsTab';
import RiskTab from '@/components/profile-manager/RiskTab';
import CertificatesTab from '@/components/profile-manager/CertificatesTab';
import NotificationsTab from '@/components/profile-manager/NotificationsTab';
import AffiliateTab from '@/components/profile-manager/AffiliateTab';
import EventLogsTab from '@/components/profile-manager/EventLogsTab';
import WeCoinsTab from '@/components/profile-manager/WeCoinsTab';

const TAB_ITEMS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'challenges', label: 'Challenges', icon: Trophy },
  { id: 'trades', label: 'Trades', icon: TrendingUp },
  { id: 'payouts', label: 'Payouts', icon: CreditCard },
  { id: 'risk', label: 'Risk', icon: AlertTriangle },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'affiliate', label: 'Affiliate', icon: Users },
  { id: 'wecoins', label: 'WeCoins', icon: Coins },
  { id: 'event-logs', label: 'Event Logs', icon: Activity },
] as const;

type TabId = typeof TAB_ITEMS[number]['id'];

export default function ReviewTraderProfile() {
  const { traderId } = useParams<{ traderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // Impersonate
  const impersonateMutation = useMutation({
    mutationFn: (userId: string) => traderService.impersonateTrader(userId),
    onSuccess: (data) => {
      window.open(`https://dashboard.we-fund.com/impersonate?ticket=${data.ticket}`, '_blank');
      toast({ title: 'Impersonation Started', description: `Successfully impersonating trader` });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message || 'Could not impersonate', variant: 'destructive' });
    },
  });

  // Rise invite
  const riseInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiService.post('/admin/rise/manual-invite/', { trader_id: userId });
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    onSuccess: (data: any) => {
      toast({ title: 'Rise Invite Sent', description: data?.message || 'Invite sent successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message || 'Could not send invite', variant: 'destructive' });
    },
  });

  // Fetch profile
  const { data: traderProfile, isLoading, error, refetch } = useQuery({
    queryKey: ['trader-full-profile', traderId],
    queryFn: () => traderService.getTraderFullProfile(traderId!),
    enabled: !!traderId,
  });

  useEffect(() => {
    if (error) {
      toast({ title: 'Error', description: 'Failed to load trader profile', variant: 'destructive' });
    }
  }, [error, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !traderProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">Failed to load trader profile</p>
          <button onClick={() => navigate('/traders')} className="text-sm text-primary hover:underline">
            Back to Traders
          </button>
        </div>
      </div>
    );
  }

  // Extract data
  const userInfo = traderProfile.profile_info?.user;
  const clientProfile = traderProfile.profile_info?.client_profile;
  const orders = traderProfile.orders_info || [];
  const challenges = traderProfile.challenge_info || [];
  const tradesInfo = traderProfile.trades_info || null;
  const payoutMethods = traderProfile.payout_info?.methods || [];
  const payouts = traderProfile.payout_info?.payouts || [];
  const payoutConfig = traderProfile.payout_info?.config || null;
  const riskBreaches = traderProfile.risk_info || [];
  const riskByChallenge = traderProfile.risk_by_challenge || null;
  const certificates = traderProfile.certificate_info || [];
  const certificatesByChallenge = traderProfile.certificates_by_challenge || null;
  const notifications = traderProfile.notifications || [];
  const affiliateInfo = traderProfile.affiliate_info;

  // Process trades count for badge
  const totalTradesCount = (() => {
    if (Array.isArray(tradesInfo)) return tradesInfo.length;
    if (typeof tradesInfo === 'object' && tradesInfo !== null) {
      return Object.values(tradesInfo as Record<string, any>).reduce((t: number, a: any) => t + (Array.isArray(a) ? a.length : 0), 0);
    }
    return 0;
  })();

  // Count helper for tab badges
  const getCount = (tabId: TabId): number | null => {
    switch (tabId) {
      case 'orders': return orders.length;
      case 'challenges': return challenges.length;
      case 'trades': return totalTradesCount;
      case 'payouts': return payouts.length;
      case 'risk': return riskBreaches.length;
      case 'certificates': return certificates.length;
      case 'notifications': return notifications.length;
      default: return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab userInfo={userInfo} clientProfile={clientProfile} traderId={traderId!} />;
      case 'orders':
        return <OrdersTab orders={orders} />;
      case 'challenges':
        return <ChallengesTab challenges={challenges} onRefresh={() => refetch()} clientEmail={userInfo?.email} />;
      case 'trades':
        return (
          <TradesTab
            challenges={challenges}
          />
        );
      case 'payouts':
        return <PayoutsTab traderId={traderId!} payoutMethods={payoutMethods} payouts={payouts} payoutConfig={payoutConfig} userInfo={userInfo} />;
      case 'risk':
        return <RiskTab riskBreaches={riskBreaches} challenges={challenges} riskByChallenge={riskByChallenge} />;
      case 'certificates':
        return (
          <CertificatesTab
            certificates={certificates}
            certificatesByChallenge={certificatesByChallenge}
            challenges={challenges}
            userEmail={userInfo?.email}
            userName={`${userInfo?.first_name || ''} ${userInfo?.last_name || ''}`.trim()}
          />
        );
      case 'notifications':
        return <NotificationsTab notifications={notifications} traderEmail={userInfo?.email} />;
      case 'affiliate':
        return <AffiliateTab affiliateInfo={affiliateInfo} traderId={traderId} userInfo={userInfo} onRefresh={refetch} />;
      case 'wecoins':
        return <WeCoinsTab traderId={traderId!} />;
      case 'event-logs':
        return <EventLogsTab traderId={traderId!} />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 max-w-7xl space-y-4 sm:space-y-6">
      {/* Header */}
      <ProfileHeader
        traderId={traderId!}
        userInfo={userInfo}
        clientProfile={clientProfile}
        onImpersonate={() => traderId && impersonateMutation.mutate(traderId)}
        onRiseInvite={() => traderId && riseInviteMutation.mutate(traderId)}
        isImpersonating={impersonateMutation.isPending}
        isInviting={riseInviteMutation.isPending}
      />

      <Separator />

      {/* Tab Navigation - horizontal scrollable */}
      <nav className="flex gap-1 overflow-x-auto pb-1 -mb-px scrollbar-none">
        {TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = getCount(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0
                ${isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {count !== null && count > 0 && (
                <Badge
                  variant={isActive ? 'secondary' : 'outline'}
                  className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center"
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
}
