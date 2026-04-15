import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { ActivityLogFilters } from '@/components/activity-logs/ActivityLogFilters';
import { ActivityLogTable } from '@/components/activity-logs/ActivityLogTable';
import { ActivityLogDetailDialog } from '@/components/activity-logs/ActivityLogDetailDialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { activityLogService, ActivityLog, ActivityLogFilters as Filters } from '@/services/activityLogService';
import { useToast } from '@/hooks/use-toast';

const ActivityLogs = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({ page: 1, page_size: 20 });
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: () => activityLogService.getActivityLogs(filters),
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load activity logs',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Activity Logs"
        subtitle="Track and monitor all system activities and user actions"
      />

      <ActivityLogFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <ActivityLogTable logs={data?.results || []} onViewDetails={handleViewDetails} />

          {data?.pagination && data.pagination.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Showing {((data.pagination.page - 1) * data.pagination.page_size) + 1} to{' '}
                {Math.min(data.pagination.page * data.pagination.page_size, data.pagination.total_count)} of{' '}
                {data.pagination.total_count} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.pagination.page - 1)}
                  disabled={!data.pagination.has_previous}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {data.pagination.page} of {data.pagination.total_pages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(data.pagination.page + 1)}
                  disabled={!data.pagination.has_next}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ActivityLogDetailDialog
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
};

export default ActivityLogs;
