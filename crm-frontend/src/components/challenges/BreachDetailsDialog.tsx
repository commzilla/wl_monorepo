import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock } from 'lucide-react';
import { LatestBreach } from '@/services/challengeService';

interface BreachDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  breach: LatestBreach | null;
}

const BreachDetailsDialog: React.FC<BreachDetailsDialogProps> = ({
  open,
  onOpenChange,
  breach,
}) => {
  if (!breach) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRuleDisplayName = (rule: string): string => {
    const ruleMap: Record<string, string> = {
      max_daily_loss: 'Max Daily Loss',
      max_total_loss: 'Max Total Loss',
      inactivity: 'Inactivity',
      min_trading_days: 'Minimum Trading Days',
      max_lot_size: 'Max Lot Size',
      trading_hours: 'Trading Hours Violation',
      consistency: 'Consistency Rule',
    };
    return ruleMap[rule] || rule.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatPreviousState = (state: any) => {
    if (!state) return null;
    
    const stateMap: Record<string, string> = {
      notes: 'Notes',
      status: 'Status',
      is_active: 'Is Active',
    };

    const formatValue = (key: string, value: any): string => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (key === 'status') {
        return value.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      return String(value);
    };

    return Object.entries(state).map(([key, value]) => ({
      label: stateMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: formatValue(key, value),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Breach Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Breach Rule
            </label>
            <div className="mt-1">
              <Badge variant="destructive" className="text-base px-3 py-1">
                {getRuleDisplayName(breach.rule)}
              </Badge>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Reason
            </label>
            <p className="mt-1 text-sm text-foreground">{breach.reason}</p>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Breached At
            </label>
            <p className="mt-1 text-sm text-foreground">
              {formatDate(breach.breached_at)}
            </p>
          </div>

          {breach.previous_state && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Previous State
                </label>
                <div className="mt-2 space-y-2">
                  {formatPreviousState(breach.previous_state)?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 px-3 rounded-md bg-muted">
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                      <span className="text-sm text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BreachDetailsDialog;
