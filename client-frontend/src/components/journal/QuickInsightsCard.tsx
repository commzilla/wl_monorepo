import React from 'react';
import {
  Sparkles,
  ThumbsUp,
  ArrowUpCircle,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';

interface QuickInsightsCardProps {
  insight: {
    summary: string;
    strength: string;
    improvement: string;
    actionable_tip: string;
    risk_alert: string;
  } | null;
}

const QuickInsightsCard: React.FC<QuickInsightsCardProps> = ({ insight }) => {
  return (
    <div className="rounded-xl border border-[#1E2D3D] bg-[#0A1114]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#1E2D3D]/60 px-5 py-4">
        <Sparkles className="h-4 w-4 text-[#7570FF]" />
        <h3 className="text-sm font-semibold text-[#E4EEF5]">AI Quick Insight</h3>
      </div>

      {/* Content */}
      <div className="p-5">
        {!insight ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-xs text-[#85A8C3]/50">
              No insights available yet. Keep trading and journaling to unlock AI insights.
            </p>
          </div>
        ) : (
          <div className="max-h-64 space-y-3 overflow-y-auto">
            {/* Summary */}
            {insight.summary && (
              <p className="text-sm leading-relaxed text-[#C8D9E6]">
                {insight.summary}
              </p>
            )}

            {/* Strength */}
            {insight.strength && (
              <div className="rounded-lg border border-[#1BBF99]/20 bg-[#1BBF99]/5 px-3.5 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <ThumbsUp className="h-3 w-3 text-[#1BBF99]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1BBF99]">
                    Strength
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#C8D9E6]">
                  {insight.strength}
                </p>
              </div>
            )}

            {/* Improvement */}
            {insight.improvement && (
              <div className="rounded-lg border border-[#F5A623]/20 bg-[#F5A623]/5 px-3.5 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <ArrowUpCircle className="h-3 w-3 text-[#F5A623]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#F5A623]">
                    Improvement
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#C8D9E6]">
                  {insight.improvement}
                </p>
              </div>
            )}

            {/* Actionable Tip */}
            {insight.actionable_tip && (
              <div className="rounded-lg border border-[#3AB3FF]/20 bg-[#3AB3FF]/5 px-3.5 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3 text-[#3AB3FF]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#3AB3FF]">
                    Tip
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#C8D9E6]">
                  {insight.actionable_tip}
                </p>
              </div>
            )}

            {/* Risk Alert */}
            {insight.risk_alert && (
              <div className="rounded-lg border border-[#ED5363]/20 bg-[#ED5363]/5 px-3.5 py-2.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-[#ED5363]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#ED5363]">
                    Risk Alert
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#ED5363]/90">
                  {insight.risk_alert}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickInsightsCard;
