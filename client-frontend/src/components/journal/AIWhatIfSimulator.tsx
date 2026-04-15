import React, { useState } from 'react';
import { Lightbulb, Send, TrendingUp, TrendingDown, AlertTriangle, BarChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAIWhatIf } from '@/hooks/useJournal';

interface AIWhatIfSimulatorProps {
  enrollmentId: string;
}

interface WhatIfResult {
  projected_pnl?: string | number;
  projected_win_rate?: string | number;
  risk_assessment?: string;
  recommendation?: string;
  summary?: string;
}

const PRESET_SCENARIOS = [
  "What if I only traded during London session?",
  "What if I used 2:1 risk-reward on all trades?",
  "What if I avoided trading on Mondays?",
];

const AIWhatIfSimulator: React.FC<AIWhatIfSimulatorProps> = ({ enrollmentId }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [lastQuestion, setLastQuestion] = useState('');

  const whatIfMutation = useAIWhatIf();

  const handleSubmit = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || whatIfMutation.isPending) return;

    setInput('');
    setLastQuestion(trimmed);
    setResult(null);

    whatIfMutation.mutate(
      { question: trimmed, enrollmentId },
      {
        onSuccess: (data) => {
          setResult(data as WhatIfResult);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="rounded-xl border border-[#1A2A3A] bg-[#0A1114] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#1A2A3A] bg-[#0D1519]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7570FF]/10 border border-[#7570FF]/20">
          <Lightbulb className="w-4 h-4 text-[#7570FF]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#E4EEF5]">What-If Simulator</h3>
          <p className="text-xs text-[#85A8C3]">
            Explore how changes to your strategy could affect performance
          </p>
        </div>
      </div>

      <div className="p-4">
        {/* Input area */}
        <div className="flex items-center gap-2.5 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a scenario to simulate..."
            disabled={whatIfMutation.isPending}
            className="flex-1 bg-[#111A20] border border-[#1A2A3A] rounded-lg px-3.5 py-2.5 text-sm text-[#E4EEF5] placeholder:text-[#4A6578] focus:outline-none focus:border-[#7570FF]/40 focus:ring-1 focus:ring-[#7570FF]/20 transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || whatIfMutation.isPending}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#7570FF] hover:bg-[#6560EE] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Preset scenarios */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {PRESET_SCENARIOS.map((scenario) => (
            <button
              key={scenario}
              onClick={() => handleSubmit(scenario)}
              disabled={whatIfMutation.isPending}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-[#7570FF] bg-[#7570FF]/8 border border-[#7570FF]/20 hover:bg-[#7570FF]/15 hover:border-[#7570FF]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scenario}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {whatIfMutation.isPending && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#85A8C3]">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7570FF] animate-[bounce_1.4s_ease-in-out_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7570FF] animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#7570FF] animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
              </div>
              <span>Simulating scenario...</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 bg-[#1A2A3A] rounded-lg" />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {whatIfMutation.isError && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-[#ED5363]/8 border border-[#ED5363]/20">
            <AlertTriangle className="w-5 h-5 text-[#ED5363] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#ED5363]">Simulation failed</p>
              <p className="text-xs text-[#85A8C3] mt-0.5">
                Unable to run the scenario simulation. Please try a different question.
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !whatIfMutation.isPending && (
          <div className="space-y-3">
            {/* Scenario label */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#7570FF]/5 border border-[#7570FF]/15">
              <Lightbulb className="w-4 h-4 text-[#7570FF] shrink-0 mt-0.5" />
              <p className="text-xs text-[#C8D9E6] leading-relaxed">
                <span className="font-medium text-[#7570FF]">Scenario: </span>
                {lastQuestion}
              </p>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Projected P&L */}
              {result.projected_pnl !== undefined && (
                <div className="rounded-lg bg-[#111A20] border border-[#1A2A3A] p-3.5 text-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20 mx-auto mb-2">
                    <BarChart className="w-4 h-4 text-[#3AB3FF]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#85A8C3] mb-1">
                    Projected P&L
                  </p>
                  <p className="text-lg font-bold text-[#E4EEF5]">
                    {typeof result.projected_pnl === 'number'
                      ? `$${result.projected_pnl.toLocaleString()}`
                      : result.projected_pnl}
                  </p>
                </div>
              )}

              {/* Projected Win Rate */}
              {result.projected_win_rate !== undefined && (
                <div className="rounded-lg bg-[#111A20] border border-[#1A2A3A] p-3.5 text-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1BBF99]/10 border border-[#1BBF99]/20 mx-auto mb-2">
                    <TrendingUp className="w-4 h-4 text-[#1BBF99]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#85A8C3] mb-1">
                    Projected Win Rate
                  </p>
                  <p className="text-lg font-bold text-[#E4EEF5]">
                    {typeof result.projected_win_rate === 'number'
                      ? `${result.projected_win_rate.toFixed(1)}%`
                      : result.projected_win_rate}
                  </p>
                </div>
              )}

              {/* Risk Assessment */}
              {result.risk_assessment && (
                <div className="rounded-lg bg-[#111A20] border border-[#1A2A3A] p-3.5 text-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 mx-auto mb-2">
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#85A8C3] mb-1">
                    Risk Assessment
                  </p>
                  <p className="text-sm font-semibold text-[#E4EEF5] leading-tight">
                    {result.risk_assessment}
                  </p>
                </div>
              )}

              {/* Recommendation */}
              {result.recommendation && (
                <div className="rounded-lg bg-[#111A20] border border-[#1A2A3A] p-3.5 text-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#7570FF]/10 border border-[#7570FF]/20 mx-auto mb-2">
                    <Lightbulb className="w-4 h-4 text-[#7570FF]" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#85A8C3] mb-1">
                    Recommendation
                  </p>
                  <p className="text-sm font-semibold text-[#E4EEF5] leading-tight">
                    {result.recommendation}
                  </p>
                </div>
              )}
            </div>

            {/* Summary paragraph */}
            {result.summary && (
              <div className="rounded-lg bg-[#111A20] border border-[#1A2A3A] p-3.5">
                <p className="text-sm text-[#C8D9E6] leading-relaxed">{result.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state (no result, no pending, no error) */}
        {!result && !whatIfMutation.isPending && !whatIfMutation.isError && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#7570FF]/10 border border-[#7570FF]/20 mb-3">
              <TrendingDown className="w-6 h-6 text-[#7570FF]" />
            </div>
            <p className="text-sm text-[#85A8C3] max-w-sm">
              Type a scenario above or choose a preset to see how different strategies could
              impact your trading performance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIWhatIfSimulator;
