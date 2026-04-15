import React from 'react';
import { TrendingUp, TrendingDown, Brain, Lightbulb, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIPatterns } from '@/hooks/useJournal';

interface AIPatternCardProps {
  enrollmentId: string;
}

interface PatternItem {
  name: string;
  description: string;
  frequency?: string | number;
  impact?: string | number;
}

interface PatternData {
  profitable_patterns?: PatternItem[];
  losing_patterns?: PatternItem[];
  behavioral_patterns?: PatternItem[];
  suggestions?: string[];
}

interface PatternSectionConfig {
  key: keyof Pick<PatternData, 'profitable_patterns' | 'losing_patterns' | 'behavioral_patterns'>;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
}

const PATTERN_SECTIONS: PatternSectionConfig[] = [
  {
    key: 'profitable_patterns',
    label: 'Profitable Patterns',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: '#1BBF99',
    bgColor: 'rgba(27, 191, 153, 0.08)',
    borderColor: 'rgba(27, 191, 153, 0.2)',
    badgeColor: 'rgba(27, 191, 153, 0.15)',
  },
  {
    key: 'losing_patterns',
    label: 'Losing Patterns',
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    color: '#ED5363',
    bgColor: 'rgba(237, 83, 99, 0.08)',
    borderColor: 'rgba(237, 83, 99, 0.2)',
    badgeColor: 'rgba(237, 83, 99, 0.15)',
  },
  {
    key: 'behavioral_patterns',
    label: 'Behavioral Patterns',
    icon: <Brain className="w-3.5 h-3.5" />,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    badgeColor: 'rgba(245, 158, 11, 0.15)',
  },
];

const PatternItemRow: React.FC<{
  pattern: PatternItem;
  color: string;
  badgeColor: string;
}> = ({ pattern, color, badgeColor }) => (
  <div className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-[#E4EEF5]">{pattern.name}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {pattern.frequency && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: badgeColor, color }}
          >
            {pattern.frequency}
          </span>
        )}
        {pattern.impact && (
          <span
            className="px-2 py-0.5 rounded text-[10px] font-medium"
            style={{ backgroundColor: badgeColor, color }}
          >
            {pattern.impact}
          </span>
        )}
      </div>
    </div>
    <p className="text-xs text-[#85A8C3] leading-relaxed">{pattern.description}</p>
  </div>
);

const AIPatternCard: React.FC<AIPatternCardProps> = ({ enrollmentId }) => {
  const { data, isLoading, isError } = useAIPatterns(enrollmentId);
  const patterns = data as PatternData | undefined;

  return (
    <div className="rounded-xl border border-[#1A2A3A] bg-[#0A1114] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#1A2A3A] bg-[#0D1519]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
          <Brain className="w-4 h-4 text-[#F59E0B]" />
        </div>
        <h3 className="text-sm font-semibold text-[#E4EEF5]">Detected Patterns</h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-36 bg-[#1A2A3A]" />
                <Skeleton className="h-16 w-full bg-[#1A2A3A]" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-[#ED5363] mb-2" />
            <p className="text-sm text-[#85A8C3]">
              Unable to load pattern data. Please try again later.
            </p>
          </div>
        )}

        {!isLoading && !isError && patterns && (
          <>
            {PATTERN_SECTIONS.map((section) => {
              const items = patterns[section.key];
              if (!items || items.length === 0) return null;

              return (
                <div
                  key={section.key}
                  className="rounded-lg p-3.5"
                  style={{
                    backgroundColor: section.bgColor,
                    border: `1px solid ${section.borderColor}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span style={{ color: section.color }}>{section.icon}</span>
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: section.color }}
                    >
                      {section.label}
                    </span>
                    <span
                      className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: section.badgeColor, color: section.color }}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-[#1A2A3A]/50">
                    {items.map((pattern, idx) => (
                      <PatternItemRow
                        key={idx}
                        pattern={pattern}
                        color={section.color}
                        badgeColor={section.badgeColor}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Suggestions */}
            {patterns.suggestions && patterns.suggestions.length > 0 && (
              <div className="rounded-lg bg-[#3AB3FF]/5 border border-[#3AB3FF]/15 p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Lightbulb className="w-3.5 h-3.5 text-[#3AB3FF]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#3AB3FF]">
                    Suggestions
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {patterns.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#C8D9E6]">
                      <span className="text-[#3AB3FF] mt-1.5 text-[6px] shrink-0">
                        &#9679;
                      </span>
                      <span className="leading-relaxed">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {!isLoading && !isError && !patterns && (
          <div className="flex flex-col items-center py-8 text-center">
            <Brain className="w-8 h-8 text-[#4A6578] mb-2" />
            <p className="text-sm text-[#85A8C3]">
              No patterns detected yet. More trading data is needed for analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPatternCard;
