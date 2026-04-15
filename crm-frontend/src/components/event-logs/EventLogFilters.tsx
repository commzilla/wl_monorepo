import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { EventLogFilters as Filters } from '@/lib/types/eventLog';
import { cn } from '@/lib/utils';

interface EventLogFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const EventLogFilters: React.FC<EventLogFiltersProps> = ({ filters, onFiltersChange }) => {
  const [dateFrom, setDateFrom] = React.useState<Date>();
  const [dateTo, setDateTo] = React.useState<Date>();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value, page: 1 });
  };

  const handleCategoryChange = (value: string) => {
    onFiltersChange({ ...filters, category: value === 'all' ? undefined : value, page: 1 });
  };

  const handleEventTypeChange = (value: string) => {
    onFiltersChange({ ...filters, event_type: value === 'all' ? undefined : value, page: 1 });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({
      ...filters,
      date_from: date ? format(date, 'yyyy-MM-dd') : undefined,
      page: 1,
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({
      ...filters,
      date_to: date ? format(date, 'yyyy-MM-dd') : undefined,
      page: 1,
    });
  };

  const handleClearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({ page: 1, page_size: filters.page_size });
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search by description, metadata, user..."
            value={filters.search || ''}
            onChange={handleSearchChange}
          />
        </div>

        <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="account">Account</SelectItem>
            <SelectItem value="profile">Profile</SelectItem>
            <SelectItem value="kyc">KYC / Verification</SelectItem>
            <SelectItem value="challenge">Challenge</SelectItem>
            <SelectItem value="mt5">MT5 / Trading</SelectItem>
            <SelectItem value="payout">Payout</SelectItem>
            <SelectItem value="certificate">Certificate</SelectItem>
            <SelectItem value="affiliate">Affiliate</SelectItem>
            <SelectItem value="offer">Offer / Coupon</SelectItem>
            <SelectItem value="wallet">Wallet / Transaction</SelectItem>
            <SelectItem value="risk">Risk / Breach</SelectItem>
            <SelectItem value="wecoins">WeCoins</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !dateFrom && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, 'PPP') : 'From date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateFrom} onSelect={handleDateFromChange} initialFocus />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal',
                !dateTo && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, 'PPP') : 'To date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dateTo} onSelect={handleDateToChange} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      {(filters.search || filters.category || filters.date_from || filters.date_to) && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </Card>
  );
};
