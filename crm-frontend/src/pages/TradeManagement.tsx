import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Download, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { format } from 'date-fns';
import PageHeader from '@/components/layout/PageHeader';

interface MT5Trade {
  id: number;
  account_id: number;
  order: number;
  timestamp: string;
  symbol: string;
  digits: number;
  cmd: number;
  volume: number;
  open_time: string;
  open_price: string;
  close_time: string;
  close_price: string;
  sl: string;
  tp: string;
  commission: string;
  commission_agent: string;
  storage: string;
  profit: string;
  taxes: string;
  comment: string;
  spread: string;
  margin_rate: string;
  created_at: string;
}

interface AccountGroup {
  account_id: number;
  trades: MT5Trade[];
}

interface PaginatedAccountResponse {
  results: AccountGroup[];
  count: number;
  next?: string;
  previous?: string;
}

const TradeManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  // Fetch accounts first
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['mt5-accounts'],
    queryFn: async () => {
      console.log('Fetching MT5 accounts...');
      const response = await apiService.get<number[]>('/mt5-trades/accounts/');
      console.log('Accounts response:', response);
      return response.data || [];
    },
  });

  // Fetch account groups with trades and pagination
  const { data: accountGroupsData, isLoading: tradesLoading, error: tradesError } = useQuery({
    queryKey: ['mt5-trades', selectedAccount, selectedSymbol, searchTerm, currentPage],
    queryFn: async () => {
      console.log('Fetching MT5 trades...');
      
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      if (selectedAccount !== 'all') params.append('account_id', selectedAccount);
      if (selectedSymbol !== 'all') params.append('symbol', selectedSymbol);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      
      const endpoint = `/mt5-trades/?${params.toString()}`;
      const response = await apiService.get<PaginatedAccountResponse | AccountGroup[]>(endpoint);
      console.log('Account groups response:', response);
      
      // Handle both paginated response and plain array (for order ID search)
      if (Array.isArray(response.data)) {
        // Plain array returned for order ID search - wrap it
        return { results: response.data, count: response.data.length };
      }
      
      return response.data || { results: [], count: 0 };
    },
  });

  // Flatten all trades from account groups for calculations
  const trades = accountGroupsData?.results?.flatMap(group => group.trades) || [];

  const totalTrades = trades.length;
  const totalAccounts = accountGroupsData?.count || 0;

  // Get unique symbols from trades for filter
  const symbols = [...new Set(trades.map(trade => trade.symbol))];

  // Calculate summary stats
  const totalProfit = trades.reduce((sum, trade) => sum + parseFloat(trade.profit), 0);
  const profitableTrades = trades.filter(trade => parseFloat(trade.profit) > 0).length;
  const totalVolume = trades.reduce((sum, trade) => sum + trade.volume, 0);

  const getTradeTypeLabel = (cmd: number) => {
    const types = {
      0: 'Buy',
      1: 'Sell',
      2: 'Buy Limit',
      3: 'Sell Limit',
      4: 'Buy Stop',
      5: 'Sell Stop'
    };
    return types[cmd as keyof typeof types] || `Type ${cmd}`;
  };

  const getProfitColor = (profit: string) => {
    const profitValue = parseFloat(profit);
    if (profitValue > 0) return 'text-green-600';
    if (profitValue < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatTradeDate = (dateString: string) => {
    if (!dateString || dateString === '0000-00-00 00:00:00' || dateString === 'null') {
      return 'N/A';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.warn('Date formatting error:', error, 'for date:', dateString);
      return 'Invalid Date';
    }
  };

  const isLoading = accountsLoading || tradesLoading;
  const error = accountsError || tradesError;

  const toggleAccountExpansion = (accountId: number) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const expandAllAccounts = () => {
    const allAccountIds = accountGroupsData?.results?.map(group => group.account_id) || [];
    setExpandedAccounts(new Set(allAccountIds));
  };

  const collapseAllAccounts = () => {
    setExpandedAccounts(new Set());
  };

  return (
    <div className="container mx-auto p-3 sm:p-6">
      <PageHeader title="Trade Management" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">
              {totalTrades} trades total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit/Loss</CardTitle>
            {totalProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProfitColor(totalProfit.toString())}`}>
              ${totalProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitable Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitableTrades}</div>
            <p className="text-xs text-muted-foreground">
              {trades.length > 0 ? ((profitableTrades / trades.length) * 100).toFixed(1) : 0}% win rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Lots</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, symbol, or comment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger>
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((accountId) => (
                  <SelectItem key={accountId} value={accountId.toString()}>
                    Account {accountId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger>
                <SelectValue placeholder="All Symbols" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Symbols</SelectItem>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trades Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">MT5 Trades by Account</CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={expandAllAccounts} className="flex-1 sm:flex-none">
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAllAccounts} className="flex-1 sm:flex-none">
              Collapse All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-600">
              Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading account data...</div>
          ) : !accountGroupsData?.results?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No accounts found matching your criteria.
            </div>
          ) : (
            <div className="space-y-6">
              {accountGroupsData?.results?.map((accountGroup) => {
                const accountProfit = accountGroup.trades.reduce((sum, trade) => sum + parseFloat(trade.profit), 0);
                const accountVolume = accountGroup.trades.reduce((sum, trade) => sum + trade.volume, 0);
                
                return (
                  <div key={accountGroup.account_id} className="border rounded-lg overflow-hidden">
                    {/* Account Header */}
                    <div className="bg-muted/50 px-3 sm:px-4 py-2 sm:py-3 border-b">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAccountExpansion(accountGroup.account_id)}
                            className="h-8 w-8 p-0"
                          >
                            {expandedAccounts.has(accountGroup.account_id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <h3 className="font-semibold text-sm sm:text-lg">Account {accountGroup.account_id}</h3>
                          <Badge variant="outline">{accountGroup.trades.length} trades</Badge>
                        </div>
                        <div className="flex items-center gap-4 sm:gap-6 text-sm ml-10 sm:ml-0">
                          <div className="text-center">
                            <div className="text-muted-foreground text-xs">Volume</div>
                            <div className="font-medium">{accountVolume.toFixed(2)} lots</div>
                          </div>
                          <div className="text-center">
                            <div className="text-muted-foreground text-xs">P&L</div>
                            <div className={`font-medium ${getProfitColor(accountProfit.toString())}`}>
                              ${accountProfit.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Trades Table - Only show when expanded */}
                    {expandedAccounts.has(accountGroup.account_id) && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Volume</TableHead>
                              <TableHead>Open Price</TableHead>
                              <TableHead>Close Price</TableHead>
                              <TableHead>SL</TableHead>
                              <TableHead>TP</TableHead>
                              <TableHead>Commission</TableHead>
                              <TableHead>Open Time</TableHead>
                              <TableHead>Close Time</TableHead>
                              <TableHead>Profit/Loss</TableHead>
                              <TableHead>Comment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountGroup.trades.map((trade) => (
                              <TableRow key={trade.id}>
                                <TableCell className="font-medium">#{trade.order}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">{trade.symbol}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={trade.cmd === 0 ? "default" : "secondary"}>
                                    {getTradeTypeLabel(trade.cmd)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{trade.volume}</TableCell>
                                <TableCell>${parseFloat(trade.open_price).toFixed(trade.digits)}</TableCell>
                                <TableCell>${parseFloat(trade.close_price).toFixed(trade.digits)}</TableCell>
                                <TableCell>
                                  {trade.sl && parseFloat(trade.sl) !== 0 ? `$${parseFloat(trade.sl).toFixed(trade.digits)}` : '-'}
                                </TableCell>
                                <TableCell>
                                  {trade.tp && parseFloat(trade.tp) !== 0 ? `$${parseFloat(trade.tp).toFixed(trade.digits)}` : '-'}
                                </TableCell>
                                <TableCell className="text-destructive">
                                  ${parseFloat(trade.commission || '0').toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {formatTradeDate(trade.open_time)}
                                </TableCell>
                                <TableCell>
                                  {formatTradeDate(trade.close_time)}
                                </TableCell>
                                <TableCell className={getProfitColor(trade.profit)}>
                                  ${parseFloat(trade.profit).toFixed(2)}
                                </TableCell>
                                <TableCell className="max-w-32 truncate" title={trade.comment}>
                                  {trade.comment || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Pagination Controls */}
              {accountGroupsData && accountGroupsData.count > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4">
                  <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, accountGroupsData.count)} of {accountGroupsData.count} accounts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={!accountGroupsData.previous}
                    >
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {Math.ceil(accountGroupsData.count / 10)}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!accountGroupsData.next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeManagement;
