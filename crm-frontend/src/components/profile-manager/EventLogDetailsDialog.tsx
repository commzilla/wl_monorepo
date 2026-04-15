import type { ComponentType } from 'react';
import { format } from 'date-fns';
import { Activity, CalendarClock, Globe, Info, Server, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { EventLog } from '@/lib/types/eventLog';
import { getCategoryLabel, getEventTypeLabel } from '@/lib/utils/eventLogUtils';

interface EventLogDetailsDialogProps {
  log: EventLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getCategoryBadgeVariant = (category: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!category) return 'outline';

  switch (category.toLowerCase()) {
    case 'security':
    case 'risk':
      return 'destructive';
    case 'system':
    case 'admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function EventLogDetailsDialog({ log, open, onOpenChange }: EventLogDetailsDialogProps) {
  if (!log) return null;

  const hasMetadata = !!log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base font-semibold">Event Log Details</DialogTitle>
            <Badge variant={getCategoryBadgeVariant(log.category)}>{getCategoryLabel(log.category)}</Badge>
            <Badge variant="outline">{getEventTypeLabel(log.event_type)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Full audit context for this event including actor, source, and payload details.
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoCard icon={CalendarClock} label="Timestamp" value={format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')} mono />
            <InfoCard icon={Activity} label="Event ID" value={log.id} mono />
            <InfoCard icon={Globe} label="IP Address" value={log.ip_address || 'N/A'} mono />
          </section>

          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
            <p className="text-sm leading-relaxed text-foreground">{log.description || 'No description provided.'}</p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actor</p>
              </div>
              {log.engine ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium capitalize">{log.engine.replace(/_/g, ' ')} engine</p>
                  <p className="text-xs text-muted-foreground">System initiated event</p>
                </div>
              ) : log.user ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{log.user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{log.user.email}</p>
                  <p className="text-xs text-muted-foreground">@{log.user.username}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unknown actor</p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Challenge Context</p>
              </div>
              {log.challenge ? (
                <div className="space-y-1.5">
                  <p className="text-sm">
                    MT5 Account: <span className="font-mono">{log.challenge.mt5_account_id}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Enrollment ID: {log.challenge.id}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No challenge linked</p>
              )}
            </div>
          </section>

          {hasMetadata && (
            <>
              <Separator />
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata Payload</p>
                <pre className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
