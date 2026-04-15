import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface PayoutFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  traderEmail: string;
  onTraderEmailChange: (value: string) => void;
  traderUsername: string;
  onTraderUsernameChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  ordering: string;
  onOrderingChange: (value: string) => void;
  onClearFilters: () => void;
}

export const PayoutFilters: React.FC<PayoutFiltersProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  traderEmail,
  onTraderEmailChange,
  traderUsername,
  onTraderUsernameChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  ordering,
  onOrderingChange,
  onClearFilters,
}) => {
  const [dateFromState, setDateFromState] = React.useState<Date | undefined>(
    dateFrom ? new Date(dateFrom) : undefined
  );
  const [dateToState, setDateToState] = React.useState<Date | undefined>(
    dateTo ? new Date(dateTo) : undefined
  );

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFromState(date);
    onDateFromChange(date ? format(date, 'yyyy-MM-dd') : '');
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateToState(date);
    onDateToChange(date ? format(date, 'yyyy-MM-dd') : '');
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Filter & Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Status Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, email, or enrollment ID..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="extended_review">Extended Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ordering} onValueChange={onOrderingChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="-requested_at">Newest First</SelectItem>
              <SelectItem value="requested_at">Oldest First</SelectItem>
              <SelectItem value="-amount">Highest Amount</SelectItem>
              <SelectItem value="amount">Lowest Amount</SelectItem>
              <SelectItem value="-net_profit">Highest Profit</SelectItem>
              <SelectItem value="net_profit">Lowest Profit</SelectItem>
              <SelectItem value="status">Status A-Z</SelectItem>
              <SelectItem value="-status">Status Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Trader Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Filter by trader email..."
            value={traderEmail}
            onChange={(e) => onTraderEmailChange(e.target.value)}
          />
          
          <Input
            placeholder="Filter by trader username..."
            value={traderUsername}
            onChange={(e) => onTraderUsernameChange(e.target.value)}
          />
        </div>

        {/* Date Range Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-3 w-3" />
              From Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFromState && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFromState ? format(dateFromState, 'PP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFromState}
                  onSelect={handleDateFromChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-3 w-3" />
              To Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateToState && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateToState ? format(dateToState, 'PP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateToState}
                  onSelect={handleDateToChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={onClearFilters}
              variant="outline"
              className="gap-2 w-full"
            >
              <RotateCcw size={16} />
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};