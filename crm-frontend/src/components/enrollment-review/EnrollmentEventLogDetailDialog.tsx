import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EnrollmentEventLog } from '@/lib/types/eventLog';
import { format } from 'date-fns';
import { User, Globe, Activity, FileText } from 'lucide-react';

interface EnrollmentEventLogDetailDialogProps {
  log: EnrollmentEventLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EnrollmentEventLogDetailDialog: React.FC<EnrollmentEventLogDetailDialogProps> = ({
  log,
  open,
  onOpenChange,
}) => {
  if (!log) return null;

  const getCategoryBadgeVariant = (category: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!category) return "outline";
    
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('error') || lowerCategory.includes('fail')) return "destructive";
    if (lowerCategory.includes('success') || lowerCategory.includes('complete')) return "default";
    if (lowerCategory.includes('warning') || lowerCategory.includes('pending')) return "secondary";
    
    return "outline";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Event Log Details
          </DialogTitle>
          <DialogDescription>
            Complete details and metadata for this event log entry
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="text-sm font-medium font-mono">
                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Event ID</p>
                  <p className="text-sm font-medium font-mono">{log.id}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Event Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Event Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  {log.category_display ? (
                    <Badge variant={getCategoryBadgeVariant(log.category)}>
                      {log.category_display}
                    </Badge>
                  ) : (
                    <p className="text-sm">N/A</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Event Type</p>
                  <p className="text-sm font-medium">
                    {log.event_type_display || log.event_type}
                  </p>
                </div>
                {log.engine_display && (
                  <div>
                    <p className="text-sm text-muted-foreground">Engine</p>
                    <Badge variant="outline">{log.engine_display}</Badge>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description
              </h3>
              <p className="text-sm text-muted-foreground">{log.description}</p>
            </div>

            <Separator />

            {/* User Information */}
            {log.username && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="text-sm font-medium">{log.username}</p>
                    </div>
                    {log.user_email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{log.user_email}</p>
                      </div>
                    )}
                    {log.user && (
                      <div>
                        <p className="text-sm text-muted-foreground">User ID</p>
                        <p className="text-sm font-medium font-mono">{log.user}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* IP Address */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                IP Address
              </h3>
              <p className="text-sm font-mono">
                {log.metadata?.engine || log.metadata?.triggered_by_engine 
                  ? "Not applicable" 
                  : (log.ip_address || "N/A")}
              </p>
            </div>
            <Separator />

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Metadata</h3>
                <div className="rounded-md bg-muted p-4">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Enrollment ID */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Related Enrollment</h3>
              <p className="text-sm font-mono">{log.challenge_enrollment}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentEventLogDetailDialog;
