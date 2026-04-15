import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { enrollmentReviewService } from '@/services/enrollmentReviewService';
import { AlertTriangle, CheckCircle, Calendar, DollarSign, ArrowRightLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EventLogTabProps {
  enrollmentId: string;
}

const EventLogTab: React.FC<EventLogTabProps> = ({ enrollmentId }) => {
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError
  } = useQuery({
    queryKey: ['enrollment-events', enrollmentId],
    queryFn: () => enrollmentReviewService.getEnrollmentEvents(enrollmentId),
    enabled: !!enrollmentId
  });

  const {
    data: transitionLogs,
    isLoading: transitionLoading,
    error: transitionError
  } = useQuery({
    queryKey: ['transition-logs', enrollmentId],
    queryFn: () => enrollmentReviewService.getTransitionLogs(enrollmentId),
    enabled: !!enrollmentId
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'breach':
        return <AlertTriangle className="h-4 w-4" />;
      case 'phase_pass':
        return <CheckCircle className="h-4 w-4" />;
      case 'status_changed':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'breach':
        return 'destructive' as const;
      case 'phase_pass':
        return 'default' as const;
      case 'status_changed':
        return 'secondary' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (eventsLoading || transitionLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, cardIndex) => (
          <Card key={cardIndex}>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-[200px]" />
                          <Skeleton className="h-3 w-[150px]" />
                        </div>
                        <Skeleton className="h-6 w-[80px]" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const events = Array.isArray(eventsData) ? eventsData : [];
  const transitions = Array.isArray(transitionLogs) ? transitionLogs : [];

  return (
    <div className="space-y-6">
      {/* Challenge Transition Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Challenge Transition Log ({transitions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transitionError ? (
            <div className="text-center space-y-2 p-6">
              <div className="text-muted-foreground">
                Transition logs are not available yet
              </div>
              <div className="text-sm text-muted-foreground">
                This feature requires backend implementation
              </div>
            </div>
          ) : transitions.length === 0 ? (
            <div className="text-center text-muted-foreground p-6">
              No transition logs recorded for this enrollment
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {transitions.map((transition) => (
                  <Card key={transition.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="p-2 rounded-full bg-primary/10 text-primary">
                            <ArrowRightLeft className="h-4 w-4" />
                          </div>
                          
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">
                                {transition.from_status} → {transition.to_status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(transition.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              {new Date(transition.created_at).toLocaleString()}
                            </div>
                            
                            {transition.reason && (
                              <div className="p-3 bg-muted/50 rounded-md border">
                                <p className="text-sm font-medium">Reason:</p>
                                <p className="text-sm">{transition.reason}</p>
                              </div>
                            )}
                            
                            {transition.meta && Object.keys(transition.meta).length > 0 && (
                              <div className="p-3 bg-muted/50 rounded-md border">
                                <p className="text-sm font-medium">Additional Details:</p>
                                <pre className="text-xs mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(transition.meta, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Original Event Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Event Logs ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsError ? (
            <div className="text-center space-y-2 p-6">
              <div className="text-muted-foreground">
                Event logs are not available yet
              </div>
              <div className="text-sm text-muted-foreground">
                This feature requires backend implementation
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center text-muted-foreground p-6">
              No events recorded for this enrollment
            </div>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id} className="border border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-2 rounded-full ${
                            event.event_type === 'breach' 
                              ? 'bg-destructive/10 text-destructive' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {getEventIcon(event.event_type)}
                          </div>
                          
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant={getEventBadgeVariant(event.event_type)}>
                                {event.event_type_display}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            
                            {(event.balance || event.equity) && (
                              <div className="flex items-center space-x-4 text-sm">
                                {event.balance && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>Balance: ${event.balance.toLocaleString()}</span>
                                  </div>
                                )}
                                {event.equity && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>Equity: ${event.equity.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {event.notes && (
                              <div className="p-3 bg-muted/50 rounded-md border">
                                <p className="text-sm">{event.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventLogTab;