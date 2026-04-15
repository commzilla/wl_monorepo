import { useState, useEffect } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimePicker } from '@/components/ui/time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Search, Filter, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { stopLossHistoryService } from '@/services/stopLossHistoryService';
import { StopLossChange, StopLossHistoryFilters } from '@/lib/types/stopLossHistory';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StopLossHistory() {
  const [changes, setChanges] = useState<StopLossChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<StopLossHistoryFilters>({});
  const [showFilters, setShowFilters] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [timeFrom, setTimeFrom] = useState('00:00');
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [timeTo, setTimeTo] = useState('23:59');

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await stopLossHistoryService.getStopLossHistory(filters, page);
      setChanges(response.results);
      setTotalCount(response.count);
      setTotalPages(Math.ceil(response.count / 100)); // Assuming 100 per page
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching stop loss history:', error);
      toast.error('Failed to load stop loss history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleApplyFilters = () => {
    fetchData(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setTimeout(() => fetchData(1), 0);
  };

  const formatPrice = (price: number | string | null, digits: number) => {
    if (price === null) return 'N/A';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toFixed(digits);
  };

  const getSLChangeDirection = (oldSl: number | string | null, newSl: number | string | null) => {
    if (oldSl === null || newSl === null) return null;
    const numOldSl = typeof oldSl === 'string' ? parseFloat(oldSl) : oldSl;
    const numNewSl = typeof newSl === 'string' ? parseFloat(newSl) : newSl;
    return numNewSl > numOldSl ? 'up' : 'down';
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    if (date) {
      const dateTimeStr = `${format(date, 'yyyy-MM-dd')}T${timeFrom}`;
      setFilters({ ...filters, date_from: dateTimeStr });
    } else {
      setFilters({ ...filters, date_from: undefined });
    }
  };

  const handleTimeFromChange = (time: string) => {
    setTimeFrom(time);
    if (dateFrom) {
      const dateTimeStr = `${format(dateFrom, 'yyyy-MM-dd')}T${time}`;
      setFilters({ ...filters, date_from: dateTimeStr });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    if (date) {
      const dateTimeStr = `${format(date, 'yyyy-MM-dd')}T${timeTo}`;
      setFilters({ ...filters, date_to: dateTimeStr });
    } else {
      setFilters({ ...filters, date_to: undefined });
    }
  };

  const handleTimeToChange = (time: string) => {
    setTimeTo(time);
    if (dateTo) {
      const dateTimeStr = `${format(dateTo, 'yyyy-MM-dd')}T${time}`;
      setFilters({ ...filters, date_to: dateTimeStr });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background p-3 sm:p-6 border border-primary/20">
          <PageHeader
            title="Stop Loss History"
            subtitle="Track all stop loss modifications in real-time"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Changes</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalCount.toLocaleString()}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Current Page</p>
                  <p className="text-xl sm:text-2xl font-bold">{currentPage} / {totalPages}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Filtered Results</p>
                  <p className="text-xl sm:text-2xl font-bold">{changes.length}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Filter className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold">Filters</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Login</label>
                  <Input
                    placeholder="Login"
                    value={filters.login || ''}
                    onChange={(e) => setFilters({ ...filters, login: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search (Symbol/Comment)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={filters.search || ''}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Position ID</label>
                  <Input
                    placeholder="Position ID"
                    value={filters.position_id || ''}
                    onChange={(e) => setFilters({ ...filters, position_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Input
                    placeholder="Symbol"
                    value={filters.symbol || ''}
                    onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Side</label>
                  <Select
                    value={filters.side || 'all'}
                    onValueChange={(value) => setFilters({ ...filters, side: value === 'all' ? undefined : value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Sides" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sides</SelectItem>
                      <SelectItem value="BUY">BUY</SelectItem>
                      <SelectItem value="SELL">SELL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Date From
                  </label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'PP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateFrom}
                          onSelect={handleDateFromChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <TimePicker
                      value={timeFrom}
                      onChange={handleTimeFromChange}
                      className="w-full sm:w-[140px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Date To
                  </label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'PP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateTo}
                          onSelect={handleDateToChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <TimePicker
                      value={timeTo}
                      onChange={handleTimeToChange}
                      className="w-full sm:w-[140px]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-2 sm:col-span-2">
                  <Button onClick={handleApplyFilters} className="w-full sm:flex-1">
                    Apply Filters
                  </Button>
                  <Button onClick={handleResetFilters} variant="outline" className="w-full sm:flex-1">
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : changes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p>No stop loss changes found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Changed At</TableHead>
                      <TableHead>Position ID</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Old SL</TableHead>
                      <TableHead>New SL</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((change) => {
                      const direction = getSLChangeDirection(change.old_sl, change.new_sl);
                      return (
                        <TableRow key={change.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {format(new Date(change.changed_at), 'MMM dd, yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell>{change.position_id}</TableCell>
                          <TableCell>{change.login}</TableCell>
                          <TableCell className="font-medium">{change.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={change.side === 'BUY' ? 'default' : 'destructive'}>
                              {change.side}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatPrice(change.old_sl, change.digits)}</TableCell>
                          <TableCell>{formatPrice(change.new_sl, change.digits)}</TableCell>
                          <TableCell>
                            {direction && (
                              <div className="flex items-center gap-1">
                                {direction === 'up' ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatPrice(change.price_current, change.digits)}</TableCell>
                          <TableCell>
                            <span className={parseFloat(change.profit as any) >= 0 ? 'text-green-500' : 'text-red-500'}>
                              ${parseFloat(change.profit as any).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {change.comment || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
