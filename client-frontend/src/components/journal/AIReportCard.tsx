import React, { useState } from 'react';
import { BarChart, Calendar, TrendingUp, TrendingDown, Brain, Lightbulb, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIReport } from '@/hooks/useJournal';

interface AIReportCardProps {
  enrollmentId: string;
}

interface ReportSection {
  key: string;
  label: string;
  icon: React.ReactNode;
  field: string;
  color: string;
}

const SECTIONS: ReportSection[] = [
  {
    key: 'executive_summary',
    label: 'Executive Summary',
    icon: <BarChart className="w-3.5 h-3.5" />,
    field: 'executive_summary',
    color: '#3AB3FF',
  },
  {
    key: 'best_day',
    label: 'Best Day',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    field: 'best_day',
    color: '#1BBF99',
  },
  {
    key: 'worst_day',
    label: 'Worst Day',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    field: 'worst_day',
    color: '#ED5363',
  },
  {
    key: 'top_pattern',
    label: 'Top Pattern',
    icon: <Brain className="w-3.5 h-3.5" />,
    field: 'top_pattern',
    color: '#7570FF',
  },
  {
    key: 'psychology_insight',
    label: 'Psychology Insight',
    icon: <Lightbulb className="w-3.5 h-3.5" />,
    field: 'psychology_insight',
    color: '#F59E0B',
  },
  {
    key: 'compliance_grade',
    label: 'Compliance Grade',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    field: 'compliance_grade',
    color: '#3AB3FF',
  },
  {
    key: 'goals',
    label: 'Goals & Recommendations',
    icon: <Calendar className="w-3.5 h-3.5" />,
    field: 'goals',
    color: '#1BBF99',
  },
];

const AIReportCard: React.FC<AIReportCardProps> = ({ enrollmentId }) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const { data: report, isLoading, isError } = useAIReport(period, enrollmentId);

  return (
    <div className="rounded-xl border border-[#1A2A3A] bg-[#0A1114] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1A2A3A] bg-[#0D1519]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7570FF]/10 border border-[#7570FF]/20">
            <BarChart className="w-4 h-4 text-[#7570FF]" />
          </div>
          <h3 className="text-sm font-semibold text-[#E4EEF5]">AI Report</h3>
        </div>
        <div className="flex items-center rounded-lg bg-[#111A20] border border-[#1A2A3A] p-0.5">
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              period === 'weekly'
                ? 'bg-[#3AB3FF]/15 text-[#3AB3FF] border border-[#3AB3FF]/25'
                : 'text-[#85A8C3] hover:text-[#E4EEF5] border border-transparent'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              period === 'monthly'
                ? 'bg-[#3AB3FF]/15 text-[#3AB3FF] border border-[#3AB3FF]/25'
                : 'text-[#85A8C3] hover:text-[#E4EEF5] border border-transparent'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32 bg-[#1A2A3A]" />
                <Skeleton className="h-12 w-full bg-[#1A2A3A]" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-[#ED5363] mb-2" />
            <p className="text-sm text-[#85A8C3]">
              Unable to load the {period} report. Please try again later.
            </p>
          </div>
        )}

        {!isLoading && !isError && report && (
          <>
            {SECTIONS.map((section) => {
              const value = (report as Record<string, unknown>)[section.field];
              if (!value) return null;

              return (
                <div
                  key={section.key}
                  className="rounded-lg bg-[#111A20] border border-[#1A2A3A] p-3.5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-md"
                      style={{
                        backgroundColor: `${section.color}15`,
                        border: `1px solid ${section.color}30`,
                      }}
                    >
                      <span style={{ color: section.color }}>{section.icon}</span>
                    </div>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: section.color }}
                    >
                      {section.label}
                    </span>
                  </div>
                  <p className="text-sm text-[#C8D9E6] leading-relaxed">
                    {String(value)}
                  </p>
                </div>
              );
            })}
          </>
        )}

        {!isLoading && !isError && !report && (
          <div className="flex flex-col items-center py-8 text-center">
            <BarChart className="w-8 h-8 text-[#4A6578] mb-2" />
            <p className="text-sm text-[#85A8C3]">
              No {period} report available yet. Keep trading to generate insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIReportCard;
