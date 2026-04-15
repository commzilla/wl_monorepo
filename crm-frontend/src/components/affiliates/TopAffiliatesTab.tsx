import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { affiliateService } from '@/services/affiliateService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, DollarSign, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TopAffiliatesTab = () => {
  const [filters, setFilters] = useState({
    page: 1,
    page_size: 10,
    ordering: '-total_commission',
    start_date: '',
    end_date: '',
    tier: '',
    approved: 'all'
  });
  
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['top-affiliates', filters],
    queryFn: () => {
      // Filter out 'all' values before sending to API
      const apiFilters = { ...filters };
      if (apiFilters.approved === 'all') {
        delete apiFilters.approved;
      }
      return affiliateService.getTopAffiliates(apiFilters);
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setFilters(prev => ({ ...prev, start_date: date ? format(date, 'yyyy-MM-dd') : '', page: 1 }));
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setFilters(prev => ({ ...prev, end_date: date ? format(date, 'yyyy-MM-dd') : '', page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleOrderingChange = (field: string) => {
    const currentOrdering = filters.ordering;
    const newOrdering = currentOrdering === field ? `-${field}` : field;
    setFilters(prev => ({ ...prev, ordering: newOrdering }));
  };

  const totalPages = data ? Math.ceil(data.count / filters.page_size) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Affiliates</p>
                <p className="text-2xl font-bold">{data?.count || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold">
                  ${data?.results.reduce((sum, a) => sum + parseFloat(a.total_commission || '0'), 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">
                  ${data?.results.reduce((sum, a) => sum + parseFloat(a.total_paid || '0'), 0).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-2xl font-bold">
                  ${data?.results.reduce((sum, a) => sum + parseFloat(a.pending_payout || '0'), 0).toFixed(2)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={handleDateFromChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={handleDateToChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Approved</label>
              <Select value={filters.approved} onValueChange={(value) => handleFilterChange('approved', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Approved</SelectItem>
                  <SelectItem value="false">Not Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={filters.ordering.replace('-', '')} onValueChange={(value) => setFilters(prev => ({ ...prev, ordering: `-${value}` }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_commission">Total Commission</SelectItem>
                  <SelectItem value="referral_count">Referral Count</SelectItem>
                  <SelectItem value="total_paid">Total Paid</SelectItem>
                  <SelectItem value="pending_payout">Pending Payout</SelectItem>
                  <SelectItem value="created_at">Join Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setFilters({
                  page: 1,
                  page_size: 10,
                  ordering: '-total_commission',
                  start_date: '',
                  end_date: '',
                  tier: '',
                  approved: 'all'
                })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-0 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrderingChange('referral_count')}>
                  <div className="flex items-center gap-1">
                    Referrals <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrderingChange('total_commission')}>
                  <div className="flex items-center gap-1">
                    Total Commission <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrderingChange('total_paid')}>
                  <div className="flex items-center gap-1">
                    Total Paid <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleOrderingChange('pending_payout')}>
                  <div className="flex items-center gap-1">
                    Pending <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No top affiliates found
                  </TableCell>
                </TableRow>
              ) : (
                data?.results.map((affiliate, index) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-center">
                        {index + 1 + (filters.page - 1) * filters.page_size <= 3 ? (
                          <Trophy className={`h-5 w-5 ${
                            index + 1 + (filters.page - 1) * filters.page_size === 1 ? 'text-yellow-500' :
                            index + 1 + (filters.page - 1) * filters.page_size === 2 ? 'text-gray-400' :
                            'text-orange-600'
                          }`} />
                        ) : (
                          index + 1 + (filters.page - 1) * filters.page_size
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.username}</div>
                        <div className="text-sm text-muted-foreground">{affiliate.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{affiliate.referral_code}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{affiliate.referral_count}</TableCell>
                    <TableCell className="font-medium text-green-600">
                      ${parseFloat(affiliate.total_commission || '0').toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      ${parseFloat(affiliate.total_paid || '0').toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-orange-600">
                      ${parseFloat(affiliate.pending_payout || '0').toFixed(2)}
                    </TableCell>
                    <TableCell>{parseFloat(affiliate.commission_rate || '0').toFixed(2)}%</TableCell>
                    <TableCell>
                      {affiliate.current_tier ? (
                        <Badge variant="outline">{affiliate.current_tier}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={affiliate.approved ? 'default' : 'secondary'}>
                        {affiliate.approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.count > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((filters.page - 1) * filters.page_size) + 1} to {Math.min(filters.page * filters.page_size, data.count)} of {data.count} affiliates
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={!data.previous}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Page {filters.page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={!data.next}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopAffiliatesTab;
