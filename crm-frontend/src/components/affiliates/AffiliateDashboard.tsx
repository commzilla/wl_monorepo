import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users, DollarSign, FileText, CreditCard, TrendingUp, Clock, MousePointer } from 'lucide-react';
import { AffiliateDashboardData } from '@/services/affiliateService';

interface AffiliateDashboardProps {
  data: AffiliateDashboardData | undefined;
  isLoading: boolean;
}

const AffiliateDashboard = React.memo<AffiliateDashboardProps>(({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Affiliate Data</h3>
            <p className="text-muted-foreground">
              There was an issue connecting to the affiliate system. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Affiliates",
      value: data.summary?.total_affiliates || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Commission",
      value: `$${(data.summary?.total_commission || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Payout Requests",
      value: data.summary?.total_payout_requests || 0,
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Total Payouts",
      value: `$${(data.summary?.total_payouts || 0).toLocaleString()}`,
      icon: CreditCard,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="glass-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Affiliates */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Affiliates by Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!data.top_affiliates || data.top_affiliates.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No affiliate data available</p>
                </div>
              ) : (
                data.top_affiliates.map((affiliate, index) => (
                  <div key={affiliate.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {affiliate.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{affiliate.username}</p>
                        <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${(affiliate.total_commission || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!data.recent_referrals || data.recent_referrals.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No recent referrals</p>
                </div>
              ) : (
                data.recent_referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div>
                      <p className="font-medium text-sm">{referral.affiliate_username}</p>
                      <p className="text-xs text-muted-foreground">
                        Referred: {referral.referred_username}
                      </p>
                      <p className="text-xs text-primary">{referral.challenge_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${referral.commission_amount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.date_referred).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
});

AffiliateDashboard.displayName = 'AffiliateDashboard';

export default AffiliateDashboard;