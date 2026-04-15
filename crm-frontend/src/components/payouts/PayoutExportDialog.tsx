import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface PayoutExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PayoutExportDialog: React.FC<PayoutExportDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  
  // Filter states
  const [status, setStatus] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build query parameters for export API
      const params = new URLSearchParams();
      
      if (status && status !== 'all') params.append('status', status);
      
      // Use quick date filter if selected, otherwise use date range
      if (quickDate) {
        params.append('quick', quickDate);
      } else {
        if (dateFrom) params.append('from', format(dateFrom, 'yyyy-MM-dd'));
        if (dateTo) params.append('to', format(dateTo, 'yyyy-MM-dd'));
      }
      
      if (clientSearch) params.append('client', clientSearch);
      
      const queryString = params.toString();
      const url = `/admin/export-csv/payout/${queryString ? `?${queryString}` : ''}`;
      
      // Fetch CSV file from API
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `payouts_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Success",
        description: "Payout requests exported successfully",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export payout requests",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    setStatus('all');
    setClientSearch('');
    setQuickDate('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Payout Requests
          </DialogTitle>
          <DialogDescription>
            Configure export filters and download payout data as CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
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
          </div>

          {/* Client Search */}
          <div className="space-y-2">
            <Label htmlFor="client">Client (Name or Email)</Label>
            <Input
              id="client"
              placeholder="Search by client name or email..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>

          {/* Quick Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="quickDate">Quick Date Filter</Label>
            <Select value={quickDate || "none"} onValueChange={(value) => {
              if (value === "none") {
                setQuickDate('');
              } else {
                setQuickDate(value);
                setDateFrom(undefined);
                setDateTo(undefined);
              }
            }}>
              <SelectTrigger id="quickDate">
                <SelectValue placeholder="Select quick date filter" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="none">None (Use date range below)</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!!quickDate}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date);
                      if (date) setQuickDate('');
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!!quickDate}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date);
                      if (date) setQuickDate('');
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Filters Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleClearFilters}
          >
            Clear All Filters
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
