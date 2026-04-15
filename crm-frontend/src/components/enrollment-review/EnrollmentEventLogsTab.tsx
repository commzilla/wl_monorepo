import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Activity, User, Globe, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { EnrollmentEventLog } from '@/lib/types/eventLog';
import EnrollmentEventLogDetailDialog from './EnrollmentEventLogDetailDialog';

interface EnrollmentEventLogsTabProps {
  enrollmentId: string;
}

const EnrollmentEventLogsTab: React.FC<EnrollmentEventLogsTabProps> = ({ enrollmentId }) => {
  const [selectedLog, setSelectedLog] = useState<EnrollmentEventLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: eventLogs, isLoading, error } = useQuery({
    queryKey: ['enrollment-event-logs', enrollmentId],
    queryFn: () => enrollmentReviewService.getEnrollmentEventLogs(enrollmentId),
    enabled: !!enrollmentId,
  });

  const handleViewDetails = (log: EnrollmentEventLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const getCategoryBadgeVariant = (category: string | null): "default" | "secondary" | "destructive" | "outline" => {
    if (!category) return "outline";
    
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('error') || lowerCategory.includes('fail')) return "destructive";
    if (lowerCategory.includes('success') || lowerCategory.includes('complete')) return "default";
    if (lowerCategory.includes('warning') || lowerCategory.includes('pending')) return "secondary";
    
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load event logs</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eventLogs || eventLogs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">No event logs found for this enrollment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Event Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>User/Engine</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {log.category_display && (
                        <Badge variant={getCategoryBadgeVariant(log.category)}>
                          {log.category_display}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {log.event_type_display || log.event_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {log.username && (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="h-3 w-3" />
                            <span>{log.username}</span>
                          </div>
                        )}
                        {log.engine_display && (
                          <Badge variant="outline" className="w-fit">
                            {log.engine_display}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.ip_address && (
                        <div className="flex items-center gap-1 text-sm font-mono">
                          <Globe className="h-3 w-3" />
                          <span>{log.ip_address}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {log.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <EnrollmentEventLogDetailDialog
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
};

export default EnrollmentEventLogsTab;
