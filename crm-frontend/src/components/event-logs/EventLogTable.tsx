import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { EventLog } from '@/lib/types/eventLog';
import { format } from 'date-fns';
import { getEventTypeLabel, getCategoryLabel } from '@/lib/utils/eventLogUtils';

interface EventLogTableProps {
  logs: EventLog[];
  onViewDetails: (log: EventLog) => void;
}

export const EventLogTable: React.FC<EventLogTableProps> = ({ logs, onViewDetails }) => {
  const getCategoryBadgeVariant = (category: string | null) => {
    if (!category) return 'default';
    
    switch (category.toLowerCase()) {
      case 'auth':
        return 'secondary';
      case 'challenge':
        return 'default';
      case 'payout':
        return 'outline';
      case 'trade':
        return 'default';
      case 'user':
        return 'secondary';
      case 'system':
        return 'outline';
      case 'affiliate':
        return 'default';
      case 'wecoins':
        return 'secondary';
      case 'profile':
        return 'outline';
      case 'security':
        return 'secondary';
      case 'account':
        return 'default';
      case 'engine':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No event logs found
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>User/Engine</TableHead>
            <TableHead>Challenge</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">
                {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
              </TableCell>
              <TableCell>
                <Badge variant={getCategoryBadgeVariant(log.category)}>
                  {getCategoryLabel(log.category)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">{getEventTypeLabel(log.event_type)}</TableCell>
              <TableCell>
                {log.engine ? (
                  <div>
                    <div className="font-medium capitalize">{log.engine.replace('_', ' ')} Engine</div>
                    <div className="text-xs text-muted-foreground">System</div>
                  </div>
                ) : log.user ? (
                  <div>
                    <div className="font-medium">{log.user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{log.user.email}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                {log.challenge ? (
                  <div className="font-mono text-xs">
                    {log.challenge.mt5_account_id}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="max-w-md truncate">{log.description}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(log)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
