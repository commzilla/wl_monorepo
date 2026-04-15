import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { activityLogService, ActivityLog } from '@/services/activityLogService';
import { format } from 'date-fns';

interface ActivityLogDetailDialogProps {
  log: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ActivityLogDetailDialog: React.FC<ActivityLogDetailDialogProps> = ({
  log,
  open,
  onOpenChange,
}) => {
  const { data: logDetail, isLoading } = useQuery({
    queryKey: ['activity-log-detail', log?.id],
    queryFn: () => activityLogService.getActivityLogDetail(log!.id),
    enabled: open && !!log,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity Log Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : logDetail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                <p className="text-sm mt-1">
                  {format(new Date(logDetail.created_at), 'MMM dd, yyyy HH:mm:ss')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action Type</label>
                <div className="mt-1">
                  <Badge>{logDetail.action_type}</Badge>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">User</label>
              <div className="mt-1">
                <p className="text-sm font-medium">
                  {logDetail.actor ? `${logDetail.actor.first_name} ${logDetail.actor.last_name}` : logDetail.actor_name}
                </p>
                {logDetail.actor && (
                  <p className="text-sm text-muted-foreground">{logDetail.actor.email}</p>
                )}
                {logDetail.actor_role && (
                  <p className="text-xs text-muted-foreground capitalize">Role: {logDetail.actor_role}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Content Type</label>
              <p className="text-sm mt-1 capitalize">
                {logDetail.content_object_type?.replace('_', ' ') || 'N/A'}
              </p>
              {logDetail.content_object_name && (
                <p className="text-xs text-muted-foreground mt-1">{logDetail.content_object_name}</p>
              )}
            </div>

            {logDetail.ip_address && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                <p className="text-sm mt-1">{logDetail.ip_address}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Details</label>
              <div className="mt-2 rounded-md bg-muted p-4">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {typeof logDetail.details === 'object' 
                    ? JSON.stringify(logDetail.details, null, 2)
                    : logDetail.details}
                </pre>
              </div>
            </div>

            {logDetail.content_object_details && Object.keys(logDetail.content_object_details).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Object Details</label>
                <div className="mt-2 rounded-md bg-muted p-4">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(logDetail.content_object_details, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {logDetail.changes && Object.keys(logDetail.changes).length > 0 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Changes</label>
                <div className="mt-2 rounded-md bg-muted p-4">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(logDetail.changes, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {logDetail.content_object && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Related Object</label>
                <div className="mt-2 rounded-md bg-muted p-4">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(logDetail.content_object, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
