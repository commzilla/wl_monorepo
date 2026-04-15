import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EventLog } from '@/lib/types/eventLog';
import { format } from 'date-fns';

interface EventLogDetailDialogProps {
  log: EventLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventLogDetailDialog: React.FC<EventLogDetailDialogProps> = ({
  log,
  open,
  onOpenChange,
}) => {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Log Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">ID</h3>
              <p className="mt-1 font-mono text-sm">{log.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Timestamp</h3>
              <p className="mt-1 text-sm">
                {format(new Date(log.timestamp), 'PPpp')}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
              <Badge className="mt-1">{log.category || "Unknown"}</Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Event Type</h3>
              <p className="mt-1 text-sm font-medium">{log.event_type}</p>
            </div>
          </div>

          <Separator />

          {log.user && (
            <>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">User</h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm"><strong>Full Name:</strong> {log.user.full_name}</p>
                  <p className="text-sm"><strong>Username:</strong> {log.user.username}</p>
                  <p className="text-sm"><strong>Email:</strong> {log.user.email}</p>
                  <p className="text-sm"><strong>ID:</strong> {log.user.id}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
            <p className="mt-1 text-sm">{log.description}</p>
          </div>

          <Separator />
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">IP Address</h3>
            <p className="mt-1 font-mono text-sm">
              {log.metadata?.engine || log.metadata?.triggered_by_engine 
                ? "Not applicable" 
                : (log.ip_address || "N/A")}
            </p>
          </div>

          {log.challenge && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Challenge</h3>
                <div className="mt-1 space-y-1">
                  <p className="text-sm"><strong>MT5 Account:</strong> <span className="font-mono">{log.challenge.mt5_account_id}</span></p>
                  <p className="text-sm"><strong>ID:</strong> {log.challenge.id}</p>
                </div>
              </div>
            </>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Metadata</h3>
                <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
