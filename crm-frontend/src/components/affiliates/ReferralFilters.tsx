import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Filter, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ReferralFiltersProps {
  onFiltersChange: (filters: {
    commission_status?: string;
    affiliate_user_email?: string;
    referred_username?: string;
    referred_from?: string;
    referred_to?: string;
    search?: string;
  }) => void;
}

const ReferralFilters: React.FC<ReferralFiltersProps> = ({ onFiltersChange }) => {
  const [filters, setFilters] = React.useState({
    commission_status: '',
    affiliate_user_email: '',
    referred_username: '',
    referred_from: '',
    referred_to: '',
    search: ''
  });
  
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Remove empty values before sending
    const cleanFilters = Object.entries(newFilters).reduce((acc, [k, v]) => {
      if (v && v !== 'all') acc[k as keyof typeof filters] = v;
      return acc;
    }, {} as any);
    
    onFiltersChange(cleanFilters);
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    handleFilterChange('referred_from', date ? format(date, 'yyyy-MM-dd') : '');
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    handleFilterChange('referred_to', date ? format(date, 'yyyy-MM-dd') : '');
  };

  const clearFilters = () => {
    const emptyFilters = {
      commission_status: '',
      affiliate_user_email: '',
      referred_username: '',
      referred_from: '',
      referred_to: '',
      search: ''
    };
    setFilters(emptyFilters);
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value && value !== 'all');

  return (
    <Card className="glass-card border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Referral Filters</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Commission Status */}
          <Select
            value={filters.commission_status}
            onValueChange={(value) => handleFilterChange('commission_status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Affiliate Email */}
          <Input
            placeholder="Affiliate Email"
            value={filters.affiliate_user_email}
            onChange={(e) => handleFilterChange('affiliate_user_email', e.target.value)}
          />

          {/* Referred Username */}
          <Input
            placeholder="Referred User"
            value={filters.referred_username}
            onChange={(e) => handleFilterChange('referred_username', e.target.value)}
          />

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PP') : 'From Date'}
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

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PP') : 'To Date'}
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
      </CardContent>
    </Card>
  );
};

export default ReferralFilters;