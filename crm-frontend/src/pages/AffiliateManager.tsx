import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, LayoutDashboard, Users, DollarSign, Wallet } from 'lucide-react';
import { AffiliateManagerOverview } from '@/components/affiliates/manager/AffiliateManagerOverview';
import { AffiliateManagerReferrals } from '@/components/affiliates/manager/AffiliateManagerReferrals';
import { AffiliateManagerPayouts } from '@/components/affiliates/manager/AffiliateManagerPayouts';
import { AffiliateManagerWallet } from '@/components/affiliates/manager/AffiliateManagerWallet';
import { affiliateManagerService } from '@/services/affiliateManagerService';
import { Skeleton } from '@/components/ui/skeleton';

const AffiliateManager: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: overview, isLoading } = useQuery({
    queryKey: ['affiliate-manager-overview', userId],
    queryFn: () => affiliateManagerService.getOverview(userId!),
    enabled: !!userId,
  });

  if (!userId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Invalid user ID</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userName = overview?.user 
    ? `${overview.user.name || overview.user.email}`
    : 'Loading...';

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/affiliates')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Affiliate Manager</h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? <Skeleton className="h-4 w-48" /> : userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid lg:w-[600px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
            <TabsTrigger value="payouts" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Payouts</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AffiliateManagerOverview userId={userId} />
          </TabsContent>

          <TabsContent value="referrals">
            <AffiliateManagerReferrals userId={userId} />
          </TabsContent>

          <TabsContent value="payouts">
            <AffiliateManagerPayouts userId={userId} />
          </TabsContent>

          <TabsContent value="wallet">
            <AffiliateManagerWallet userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AffiliateManager;
