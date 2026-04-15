import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopEarningTrader, topEarningTradersService, TraderBreakdown } from '@/services/topEarningTradersService';
import { TrendingUp, TrendingDown, FileText, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TraderBreakdownDialog } from './TraderBreakdownDialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface TopEarningTradersTableProps {
  traders: TopEarningTrader[];
}

type SortField = 'revenue' | 'payouts' | 'commission' | 'profit' | 'accounts';
type SortDirection = 'asc' | 'desc' | null;

export const TopEarningTradersTable: React.FC<TopEarningTradersTableProps> = ({ traders }) => {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [breakdownDialogOpen, setBreakdownDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const { data: breakdownData, isLoading: isLoadingBreakdown } = useQuery({
    queryKey: ['trader-breakdown', selectedUserId],
    queryFn: () => topEarningTradersService.getTraderBreakdown(selectedUserId!),
    enabled: !!selectedUserId && breakdownDialogOpen,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTraders = useMemo(() => {
    if (!sortField || !sortDirection) return traders;

    return [...traders].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'revenue':
          aValue = a.total_revenue;
          bValue = b.total_revenue;
          break;
        case 'payouts':
          aValue = a.total_payouts;
          bValue = b.total_payouts;
          break;
        case 'commission':
          aValue = a.total_affiliate_commission;
          bValue = b.total_affiliate_commission;
          break;
        case 'profit':
          aValue = a.net_profit;
          bValue = b.net_profit;
          break;
        case 'accounts':
          aValue = a.total_accounts;
          bValue = b.total_accounts;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [traders, sortField, sortDirection]);

  const handleViewBreakdown = (userId: string) => {
    setSelectedUserId(userId);
    setBreakdownDialogOpen(true);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-primary" />
    );
  };

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-1 w-8 bg-gradient-to-r from-primary to-primary/60 rounded-full"></div>
            <CardTitle className="text-lg">Top Earning Traders</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg border-0 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 font-semibold">Rank</TableHead>
                  <TableHead className="font-semibold">Trader</TableHead>
                  <TableHead 
                    className="text-right font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort('revenue')}
                  >
                    <div className="flex items-center justify-end">
                      Revenue
                      <SortIcon field="revenue" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort('payouts')}
                  >
                    <div className="flex items-center justify-end">
                      Payouts
                      <SortIcon field="payouts" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort('commission')}
                  >
                    <div className="flex items-center justify-end">
                      Affiliate Comm.
                      <SortIcon field="commission" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort('profit')}
                  >
                    <div className="flex items-center justify-end">
                      Net Profit
                      <SortIcon field="profit" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => handleSort('accounts')}
                  >
                    <div className="flex items-center justify-center">
                      Accounts
                      <SortIcon field="accounts" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTraders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No traders found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTraders.map((trader, index) => {
                    const isProfitable = trader.net_profit > 0;

                    return (
                      <TableRow key={trader.user_id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-700' :
                              index === 1 ? 'bg-gray-400/20 text-gray-700' :
                              index === 2 ? 'bg-orange-500/20 text-orange-700' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{trader.name}</span>
                            <span className="text-xs text-muted-foreground">{trader.email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          ${trader.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          ${trader.total_payouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-orange-600">
                          ${trader.total_affiliate_commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <div className={`flex items-center gap-1 font-bold text-lg ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfitable ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              ${Math.abs(trader.net_profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <Badge variant={isProfitable ? 'default' : 'destructive'} className="text-xs">
                              {trader.profit_margin.toFixed(2)}% margin
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1.5 text-xs">
                            <Badge variant="outline" className="text-xs font-medium">
                              {trader.total_accounts} Total
                            </Badge>
                            <div className="flex gap-1.5">
                              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-700 border-green-500/20">
                                {trader.funded_accounts} Funded
                              </Badge>
                              <Badge variant="destructive" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">
                                {trader.breached_accounts} Breach
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBreakdown(trader.user_id)}
                            className="hover:bg-primary/10"
                          >
                            <FileText className="h-4 w-4 mr-1.5" />
                            Breakdown
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TraderBreakdownDialog
        open={breakdownDialogOpen}
        onOpenChange={setBreakdownDialogOpen}
        breakdown={breakdownData || null}
        isLoading={isLoadingBreakdown}
      />
    </>
  );
};
