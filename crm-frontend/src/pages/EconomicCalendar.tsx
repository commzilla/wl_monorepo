import React from 'react';
import { Calendar } from 'lucide-react';
import { EconomicCalendarTab } from '@/components/configuration/EconomicCalendarTab';

const EconomicCalendar = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Economic Calendar</h1>
          <p className="text-muted-foreground">Manage high-impact economic news events for trading restrictions</p>
        </div>
      </div>

      <EconomicCalendarTab />
    </div>
  );
};

export default EconomicCalendar;
