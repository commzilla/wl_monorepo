
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Event, EventService } from '@/lib/models/event';
import EventLog from '@/components/events/EventLog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { dashboardService, type DashboardData } from '@/services/dashboardService';
import { useToast } from '@/hooks/use-toast';
import ChallengesTab from '@/components/dashboard/ChallengesTab';
import PayoutsTab from '@/components/dashboard/PayoutsTab';
import OrdersTab from '@/components/dashboard/OrdersTab';
import TradesTab from '@/components/dashboard/TradesTab';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Tag, 
  Award, 
  FileSearch, 
  BadgePercent, 
  MessageCircle, 
  Ticket, 
  Bell,
  Shield,
  Network,
  Cog,
  Settings
} from 'lucide-react';

const Dashboard = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isSupport, isRisk, isDiscordManager, isContentCreator, profile, user, hasPermission } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get user display name with fallbacks
  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const data = await dashboardService.getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  useEffect(() => {
    // Simulate some initial events
    const initialEvents: Omit<Event, 'id' | 'timestamp'>[] = [
      {
        level: 'success',
        message: t('event.traderPassedChallenge'),
        traderId: '1',
        moduleSource: t('module.challenges'),
        details: { challengeId: 'c1' }
      },
      {
        level: 'info',
        message: t('event.newChallengeStarted'),
        traderId: '1',
        moduleSource: t('module.challenges'),
        details: { challengeId: 'c2' }
      },
      {
        level: 'warning',
        message: t('event.approachingLossLimit'),
        traderId: '2',
        moduleSource: t('module.riskManagement'),
        details: { accountId: 'a3', currentLoss: 1800, maxLoss: 2500 }
      },
      {
        level: 'info',
        message: t('event.newTraderRegistered'),
        moduleSource: t('module.registration'),
        details: { email: 'new.trader@example.com' }
      },
      {
        level: 'success',
        message: t('event.kycApproved'),
        traderId: '1',
        moduleSource: t('module.kyc'),
        details: { verificationId: 'k1' }
      },
      {
        level: 'info',
        message: t('event.payoutRequested'),
        traderId: '1',
        moduleSource: t('module.payouts'),
        details: { amount: 1500, accountId: 'a2' }
      }
    ];
    
    const loggedEvents = initialEvents.map(event => EventService.logEvent(event));
    setEvents(loggedEvents);
  }, [t]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'phase-1-in-progress':
        return t('challenge.phase1InProgress');
      case 'phase-2-in-progress':
        return t('challenge.phase2InProgress');
      case 'passed-phase-1':
        return t('challenge.passedPhase1');
      case 'passed-phase-2':
        return t('challenge.passedPhase2');
      case 'failed':
        return t('challenge.failed');
      default:
        return status.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  };

  const getKycStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return t('dashboard.approved');
      case 'rejected':
        return t('dashboard.rejected');
      case 'pending':
        return t('dashboard.pending');
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  // Navigation items with role-based filtering
  const allNavigationCards = [
    { to: '/traders', label: t('traders'), icon: Users, color: 'from-blue-500/20 to-blue-600/10', description: 'Manage and view all trader profiles', roles: ['admin', 'support', 'risk'] },
    { to: '/challenges', label: t('challenges'), icon: Activity, color: 'from-purple-500/20 to-purple-600/10', description: 'Monitor trading challenges and progress', roles: ['admin', 'support', 'risk'] },
    { to: '/trade-management', label: 'Trades', icon: TrendingUp, color: 'from-green-500/20 to-green-600/10', description: 'View and analyze trading activity', roles: ['admin', 'support', 'risk'] },
    { to: '/payout-request', label: 'Payouts', icon: DollarSign, color: 'from-yellow-500/20 to-yellow-600/10', description: 'Process and manage payout requests', roles: ['admin', 'support', 'risk', 'discord_manager'] },
    { to: '/order-history', label: 'Orders', icon: ShoppingBag, color: 'from-orange-500/20 to-orange-600/10', description: 'Review order history and transactions', roles: ['admin', 'support', 'risk'] },
    { to: '/offers', label: 'Offers', icon: Tag, color: 'from-pink-500/20 to-pink-600/10', description: 'Create and manage promotional offers', roles: ['admin', 'support', 'risk'] },
    { to: '/certificates', label: 'Certificates', icon: Award, color: 'from-indigo-500/20 to-indigo-600/10', description: 'Generate and manage certificates', roles: ['admin', 'support', 'risk', 'discord_manager', 'content_creator'] },
    { to: '/kyc', label: t('kyc'), icon: FileSearch, color: 'from-cyan-500/20 to-cyan-600/10', description: 'Review KYC verification requests', roles: ['admin', 'support', 'risk'] },
    { to: '/affiliates', label: t('affiliates'), icon: BadgePercent, color: 'from-teal-500/20 to-teal-600/10', description: 'Manage affiliate programs and partners', roles: ['admin', 'support', 'risk', 'discord_manager'] },
    { to: '/chat-widget', label: 'Live Chat', icon: MessageCircle, color: 'from-emerald-500/20 to-emerald-600/10', description: 'Handle live customer support chats', roles: ['admin', 'support', 'risk'] },
    { to: '/tickets', label: 'Support Tickets', icon: Ticket, color: 'from-violet-500/20 to-violet-600/10', description: 'Manage customer support tickets', roles: ['admin', 'support', 'risk'] },
    { to: '/notifications', label: 'Notifications', icon: Bell, color: 'from-rose-500/20 to-rose-600/10', description: 'View system notifications and alerts', roles: ['admin', 'support', 'risk'] },
    { to: '/risk-management', label: 'Risk Management', icon: Shield, color: 'from-red-500/20 to-red-600/10', description: 'Monitor and manage trading risks', roles: ['admin', 'support', 'risk'] },
    { to: '/ip-analysis', label: 'IP Analysis', icon: Network, color: 'from-amber-500/20 to-amber-600/10', description: 'Analyze IP addresses and patterns', roles: ['admin', 'support', 'risk'] },
    { to: '/wecoins/tasks', label: 'WeCoins', icon: Cog, color: 'from-purple-500/20 to-purple-600/10', description: 'Manage WeCoins system', roles: ['admin', 'support', 'risk', 'discord_manager'] },
    { to: '/settings', label: t('settings'), icon: Settings, color: 'from-slate-500/20 to-slate-600/10', description: 'Configure system and user settings', roles: ['admin', 'support', 'risk', 'discord_manager', 'content_creator'] },
  ];

  // Filter cards based on user role
  const navigationCards = allNavigationCards.filter(card => {
    const roleChecks = {
      'admin': isAdmin,
      'support': isSupport,
      'risk': isRisk,
      'discord_manager': isDiscordManager,
      'content_creator': isContentCreator,
    };
    
    return card.roles.some(role => roleChecks[role as keyof typeof roleChecks]);
  });

  // Show simplified dashboard for users without full dashboard stats
  if (!hasPermission('dashboard.view_stats')) {
    return (
      <div className="space-y-4 sm:space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-4 sm:p-8 md:p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
              Hey {getUserDisplayName()}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-1">
              Welcome to WeFund CRM
            </p>
            <p className="text-sm md:text-base text-muted-foreground/70">
              Your centralized platform for managing traders, challenges, and operations
            </p>
          </div>
        </div>

        {/* Navigation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {navigationCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.to}
                className="group cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 border-primary/10"
                onClick={() => navigate(item.to)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1 sm:mb-2">
                    {item.label}
                  </h3>
                  <p className="text-xs text-muted-foreground/70 line-clamp-2">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Admin dashboard (original full analytics)
  return (
    <div>
      <PageHeader 
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
      />

      {/* Main Analytics Tabs */}
      <div className="mb-4 sm:mb-8">
        <Tabs defaultValue="challenges" className="w-full">
          <div className="overflow-x-auto">
          <TabsList className={`grid ${hasPermission('orders.view') ? 'grid-cols-4' : 'grid-cols-3'} max-w-2xl`}>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            {hasPermission('orders.view') && <TabsTrigger value="orders">Orders</TabsTrigger>}
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>
          </div>
          <TabsContent value="challenges" className="mt-4 sm:mt-6">
            <ChallengesTab />
          </TabsContent>
          <TabsContent value="payouts" className="mt-4 sm:mt-6">
            <PayoutsTab />
          </TabsContent>
          {hasPermission('orders.view') && (
            <TabsContent value="orders" className="mt-4 sm:mt-6">
              <OrdersTab />
            </TabsContent>
          )}
          <TabsContent value="trades" className="mt-4 sm:mt-6">
            <TradesTab />
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">{t('dashboard.recentChallenges')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {t('dashboard.loading')}...
                  </div>
                ) : dashboardData?.recent_challenges.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    {t('dashboard.noRecentChallenges')}
                  </div>
                ) : (
                  dashboardData?.recent_challenges.map((challenge, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center bg-secondary/50 p-3 rounded-md"
                    >
                      <div>
                        <p className="font-medium">{challenge.trader_name}</p>
                        <p className="text-sm text-muted-foreground">{challenge.challenge_name}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          challenge.phase_status.includes('In Progress') ? 'text-blue-500' : 
                          challenge.phase_status.includes('Passed') ? 'text-green-500' : 
                          challenge.phase_status.includes('Failed') ? 'text-red-500' : 
                          'text-yellow-500'
                        }`}>
                          {challenge.phase_status}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {challenge.days_left !== null
                            ? `${challenge.days_left} ${t('dashboard.daysLeft')}` 
                            : new Date(challenge.start_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="events">{t('dashboard.events')}</TabsTrigger>
              <TabsTrigger value="payouts">{t('payouts')}</TabsTrigger>
              <TabsTrigger value="kyc">{t('kyc')}</TabsTrigger>
            </TabsList>
            <TabsContent value="events">
              <Card className="h-[400px] flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">{t('dashboard.recentEvents')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <EventLog events={events} maxHeight="300px" />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="payouts">
              <Card className="h-[400px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">{t('dashboard.recentPayouts')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-6 text-muted-foreground">
                        {t('dashboard.loading')}...
                      </div>
                    ) : dashboardData?.recent_payouts.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        {t('dashboard.noRecentPayouts')}
                      </div>
                    ) : (
                      dashboardData?.recent_payouts.map((payout, index) => (
                        <div key={index} className="bg-secondary/50 p-3 rounded-md">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{payout.trader_name}</p>
                              <p className="text-sm text-muted-foreground">${payout.amount.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                payout.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                                payout.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payout.status}
                              </span>
                              <p className="text-xs text-muted-foreground mt-1">{payout.time_ago}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="kyc">
              <Card className="h-[400px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">{t('dashboard.recentKyc')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-6 text-muted-foreground">
                        {t('dashboard.loading')}...
                      </div>
                    ) : dashboardData?.recent_kyc.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        {t('dashboard.noRecentKyc')}
                      </div>
                    ) : (
                      dashboardData?.recent_kyc.map((kyc, index) => (
                        <div key={index} className="bg-secondary/50 p-3 rounded-md">
                          <p className="font-medium">{kyc.trader_name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-muted-foreground">{kyc.time_ago}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              kyc.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                              kyc.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {kyc.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
