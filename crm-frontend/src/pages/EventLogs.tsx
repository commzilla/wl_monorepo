import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { EventLogFilters } from '@/components/event-logs/EventLogFilters';
import { EventLogTable } from '@/components/event-logs/EventLogTable';
import { EventLogDetailDialog } from '@/components/event-logs/EventLogDetailDialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { eventLogService } from '@/services/eventLogService';
import { EventLog, EventLogFilters as Filters } from '@/lib/types/eventLog';
import { useToast } from '@/hooks/use-toast';

const EventLogs = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({ page: 1, page_size: 50, ordering: '-timestamp' });
  const [selectedLog, setSelectedLog] = useState<EventLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['event-logs', filters],
    queryFn: () => eventLogService.getEventLogs(filters),
  });

  const pagination = data ? {
    page: filters.page || 1,
    page_size: filters.page_size || 50,
    total_count: data.count,
    total_pages: Math.ceil(data.count / (filters.page_size || 50)),
    has_next: !!data.next,
    has_previous: !!data.previous,
    next_page: data.next ? (filters.page || 1) + 1 : null,
    previous_page: data.previous ? (filters.page || 1) - 1 : null,
  } : null;

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load event logs',
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleViewDetails = (log: EventLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Event Logs"
        subtitle="Track and monitor all system events and user activities"
      />

      <EventLogFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <EventLogTable logs={data?.results || []} onViewDetails={handleViewDetails} />

          {pagination && pagination.total_pages > 1 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
                {Math.min(pagination.page * pagination.page_size, pagination.total_count)} of{' '}
                {pagination.total_count} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.has_previous}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {pagination.page} of {pagination.total_pages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.has_next}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <EventLogDetailDialog
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
};

export default EventLogs;
