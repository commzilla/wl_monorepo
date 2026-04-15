import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { TopEarningTradersFilters } from '@/components/risk/TopEarningTradersFilters';
import { TopEarningTradersTable } from '@/components/risk/TopEarningTradersTable';
import { TopEarningTradersSummaryCards } from '@/components/risk/TopEarningTradersSummary';
import { topEarningTradersService, TopEarningTradersFilters as Filters } from '@/services/topEarningTradersService';
import { useToast } from '@/hooks/use-toast';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TopEarningTraders = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['top-earning-traders', filters],
    queryFn: () => topEarningTradersService.getTopEarningTraders(filters),
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load top earning traders',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleExportCSV = () => {
    if (!data?.traders) return;

    // CSV escape function to handle commas, quotes, and newlines
    const escapeCSV = (value: string | number | boolean): string => {
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = [
      'Rank',
      'User ID',
      'Email',
      'Name',
      'Total Revenue',
      'Total Payouts',
      'Affiliate Commission',
      'Net Profit',
      'Profit Margin %',
      'Total Accounts',
      'Funded Accounts',
      'Active Accounts',
      'Breached Accounts',
    ];

    const rows = data.traders.map((trader, index) => {
      return [
        index + 1,
        escapeCSV(trader.user_id),
        escapeCSV(trader.email),
        escapeCSV(trader.name),
        trader.total_revenue.toFixed(2),
        trader.total_payouts.toFixed(2),
        trader.total_affiliate_commission.toFixed(2),
        trader.net_profit.toFixed(2),
        trader.profit_margin.toFixed(2),
        trader.total_accounts,
        trader.funded_accounts,
        trader.active_accounts,
        trader.breached_accounts,
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `top-earning-traders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Successful',
      description: 'Data has been exported to CSV',
    });
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-xl border-0 shadow-lg bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="relative">
          <PageHeader
            title="Top Earning Traders"
            subtitle="Highest revenue-generating traders ranked by total spending on challenges"
            actions={
              <Button
                onClick={handleExportCSV}
                disabled={!data?.traders || data.traders.length === 0}
                className="shadow-md w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            }
          />
        </div>
      </div>

      <TopEarningTradersFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="space-y-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading top earning traders...</p>
          </div>
        </div>
      ) : data ? (
        <>
          <TopEarningTradersSummaryCards summary={data.summary} />
          <TopEarningTradersTable traders={data.traders} />
        </>
      ) : null}
    </div>
  );
};

export default TopEarningTraders;
