
export type EventLevel = 'info' | 'warning' | 'error' | 'success';

export interface Event {
  id: string;
  timestamp: Date;
  level: EventLevel;
  message: string;
  userId?: string;
  traderId?: string;
  moduleSource: string;
  details?: Record<string, any>;
}

// Temporary mock service for events until we connect to backend
export class EventService {
  private static events: Event[] = [];
  
  static logEvent(event: Omit<Event, 'id' | 'timestamp'>): Event {
    const newEvent: Event = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    
    this.events.unshift(newEvent);
    console.log('Event logged:', newEvent);
    
    return newEvent;
  }
  
  static getEvents(limit: number = 10): Event[] {
    return [...this.events].slice(0, limit);
  }
  
  static getEventsByUser(userId: string, limit: number = 10): Event[] {
    return [...this.events].filter(e => e.userId === userId).slice(0, limit);
  }
  
  static getEventsByTrader(traderId: string, limit: number = 10): Event[] {
    return [...this.events].filter(e => e.traderId === traderId).slice(0, limit);
  }
}
