
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Event, EventLevel } from '@/lib/models/event';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface EventLogProps {
  events: Event[];
  maxHeight?: string;
}

const EventLog: React.FC<EventLogProps> = ({ events, maxHeight = '400px' }) => {
  const getEventIcon = (level: EventLevel) => {
    switch (level) {
      case 'info':
        return <Info size={16} className="text-blue-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };

  const getEventClasses = (level: EventLevel) => {
    switch (level) {
      case 'info':
        return 'border-l-blue-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'error':
        return 'border-l-red-500';
      case 'success':
        return 'border-l-green-500';
    }
  };

  return (
    <ScrollArea className="w-full h-full" style={{ maxHeight }}>
      <div className="space-y-2 pr-4">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              key={event.id}
              className={`p-3 border-l-4 bg-card rounded-md ${getEventClasses(event.level)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getEventIcon(event.level)}
                  <div>
                    <p className="text-sm font-medium">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.moduleSource}
                      {event.userId && ` • User ${event.userId}`}
                      {event.traderId && ` • Trader ${event.traderId}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No events to display
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default EventLog;
