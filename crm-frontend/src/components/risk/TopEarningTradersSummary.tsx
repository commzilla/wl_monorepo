import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, PiggyBank, Receipt } from 'lucide-react';
import { TopEarningTradersSummary } from '@/services/topEarningTradersService';

interface TopEarningTradersSummaryProps {
  summary: TopEarningTradersSummary;
}

export const TopEarningTradersSummaryCards: React.FC<TopEarningTradersSummaryProps> = ({ summary }) => {
  const profitMargin = summary.total_revenue_sum > 0 
    ? ((summary.total_net_profit_sum / summary.total_revenue_sum) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Traders</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{summary.total_traders}</div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl"></div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            ${summary.total_revenue_sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            Avg: ${summary.avg_revenue_per_trader.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-destructive/10 via-destructive/5 to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-2xl"></div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <PiggyBank className="h-4 w-4 text-destructive" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payouts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">
            ${summary.total_payouts_sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-background overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl"></div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Receipt className="h-4 w-4 text-orange-600" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Affiliate Commissions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            ${summary.total_affiliate_commission_sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </CardContent>
      </Card>

      <Card className={`border-0 shadow-lg overflow-hidden relative ${
        summary.total_net_profit_sum > 0 
          ? 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-background' 
          : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-background'
      }`}>
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${
          summary.total_net_profit_sum > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}></div>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              summary.total_net_profit_sum > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <TrendingUp className={`h-4 w-4 ${
                summary.total_net_profit_sum > 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${
            summary.total_net_profit_sum > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${summary.total_net_profit_sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            Margin: {profitMargin}% • Avg: ${summary.avg_net_profit_per_trader.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
