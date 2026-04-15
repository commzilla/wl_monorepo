import React from 'react';
import AIChatInterface from './AIChatInterface';
import AIReportCard from './AIReportCard';
import AIPatternCard from './AIPatternCard';
import AIWhatIfSimulator from './AIWhatIfSimulator';

interface AIInsightsPanelProps {
  enrollmentId: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ enrollmentId }) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top row: Chat (2/3) + Sidebar cards (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — AI Chat (2/3 width) */}
        <div className="lg:col-span-2 min-h-[500px] flex flex-col">
          <AIChatInterface enrollmentId={enrollmentId} />
        </div>

        {/* Right column — Report + Patterns (1/3 width) */}
        <div className="flex flex-col gap-4">
          <AIReportCard enrollmentId={enrollmentId} />
          <AIPatternCard enrollmentId={enrollmentId} />
        </div>
      </div>

      {/* Bottom row: What-If Simulator (full width) */}
      <AIWhatIfSimulator enrollmentId={enrollmentId} />
    </div>
  );
};

export default AIInsightsPanel;
