
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, Percent, TrendingUp } from 'lucide-react';
import { Affiliate, AffiliateSale, DiscountCampaign } from '@/types/affiliate';

interface AffiliateStatsProps {
  affiliates: Affiliate[] | undefined;
  sales: AffiliateSale[] | undefined;
  discounts: DiscountCampaign[] | undefined;
}

const AffiliateStats: React.FC<AffiliateStatsProps> = ({ affiliates, sales, discounts }) => {
  const pendingAffiliates = affiliates?.filter(a => a.application_status === 'pending') || [];
  const totalCommissions = sales?.reduce((sum, sale) => sum + sale.commission_amount, 0) || 0;
  
  const isDiscountActive = (discount: DiscountCampaign) => {
    const now = new Date();
    const validFrom = new Date(discount.valid_from);
    const validTo = new Date(discount.valid_to);
    return discount.is_active && now >= validFrom && now <= validTo;
  };
  
  const activeDiscounts = discounts?.filter(d => isDiscountActive(d)) || [];

  const stats = [
    {
      title: "Total Affiliates",
      value: affiliates?.length || 0,
      icon: Users,
      color: "bg-blue-500/10 text-blue-600",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Pending Requests",
      value: pendingAffiliates.length,
      icon: Clock,
      color: "bg-orange-500/10 text-orange-600",
      iconBg: "bg-orange-500/10",
    },
    {
      title: "Active Discounts",
      value: activeDiscounts.length,
      icon: Percent,
      color: "bg-purple-500/10 text-purple-600",
      iconBg: "bg-purple-500/10",
    },
    {
      title: "Total Commissions",
      value: `$${totalCommissions.toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-green-500/10 text-green-600",
      iconBg: "bg-green-500/10",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={stat.title} className="glass-card border-0 shadow-lg hover:shadow-xl transition-all duration-200 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.iconBg} group-hover:scale-110 transition-transform duration-200`}>
              <stat.icon className={`h-4 w-4 ${stat.color.split(' ')[1]}`} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-foreground">
                {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AffiliateStats;
