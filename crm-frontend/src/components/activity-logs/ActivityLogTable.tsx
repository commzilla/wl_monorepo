import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { ActivityLog } from '@/services/activityLogService';
import { format } from 'date-fns';

interface ActivityLogTableProps {
  logs: ActivityLog[];
  onViewDetails: (log: ActivityLog) => void;
}

const getActionBadgeVariant = (actionType: string) => {
  switch (actionType.toLowerCase()) {
    case 'create':
      return 'default';
    case 'update':
      return 'secondary';
    case 'delete':
      return 'destructive';
    case 'login':
    case 'logout':
      return 'outline';
    default:
      return 'secondary';
  }
};

export const ActivityLogTable: React.FC<ActivityLogTableProps> = ({ logs, onViewDetails }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Trader</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Content Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No activity logs found
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">
                  {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      {log.actor 
                        ? `${log.actor.first_name || ''} ${log.actor.last_name || ''}`.trim() || log.actor.email || log.actor_name
                        : log.actor_name || 'Unknown User'
                      }
                    </span>
                    {log.actor?.email && (
                      <span className="text-xs text-muted-foreground">{log.actor.email}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {log.trader_name || log.trader_email ? (
                    <div className="flex flex-col gap-1">
                      {log.trader_name && (
                        <span className="font-medium">{log.trader_name}</span>
                      )}
                      {log.trader_email && (
                        <span className="text-xs text-muted-foreground">{log.trader_email}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeVariant(log.action_type)}>
                    {log.action_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm capitalize">{log.content_object_type?.replace('_', ' ')}</span>
                </TableCell>
                <TableCell className="max-w-xs">
                  <div className="truncate">
                    {typeof log.details === 'object' ? (
                      <span className="text-sm text-muted-foreground">
                        {log.details.message || JSON.stringify(log.details)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{log.details}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onViewDetails(log)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
