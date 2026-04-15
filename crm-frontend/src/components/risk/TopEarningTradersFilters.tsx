import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TopEarningTradersFilters as Filters } from '@/services/topEarningTradersService';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import React from 'react';

interface TopEarningTradersFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export const TopEarningTradersFilters: React.FC<TopEarningTradersFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    filters.from_date ? new Date(filters.from_date) : undefined
  );
  const [dateTo, setDateTo] = React.useState<Date | undefined>(
    filters.to_date ? new Date(filters.to_date) : undefined
  );

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({
      ...filters,
      from_date: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({
      ...filters,
      to_date: date ? format(date, 'yyyy-MM-dd') : undefined,
    });
  };

  return (
    <Card className="glass-card border-0 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 w-8 bg-gradient-to-r from-primary to-primary/60 rounded-full"></div>
          <h3 className="text-lg font-semibold">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              From Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
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

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              To Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-background",
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

          <div className="space-y-2">
            <Label htmlFor="min_revenue" className="text-sm font-medium">Minimum Revenue ($)</Label>
            <Input
              id="min_revenue"
              type="number"
              placeholder="e.g., 5000"
              value={filters.min_revenue || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  min_revenue: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="bg-background"
            />
          </div>

          <div className="flex items-center space-x-3 pt-6">
            <Switch
              id="has_payouts"
              checked={filters.has_payouts || false}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, has_payouts: checked })}
            />
            <Label htmlFor="has_payouts" className="cursor-pointer text-sm font-medium">
              Has Received Payouts
            </Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
