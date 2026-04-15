import React from "react";
import { X } from "lucide-react";
import { formatCurrency } from "../../utils/currencyFormatter";

interface ChallengeMetrics {
  trading_period?: string;
  min_trading_days?: string;
  profit_target?: {
    percent: number;
    amount: number;
  };
  max_daily_loss?: {
    percent: number;
    amount: number;
  };
  max_loss?: {
    percent: number;
    amount: number;
  };
  current_performance?: {
    balance: number;
    equity: number;
    profit: number;
    profit_progress: number | null;
    max_loss_progress: number | null;
    max_daily_loss_progress: number | null;
  };
  trading_days?: {
    required: string | number;
    completed: number;
  };
}

interface ChallengeMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: ChallengeMetrics;
  currency?: string;
}

const PerformanceMetric: React.FC<{ 
  label: string; 
  progress: number | null; 
  current?: number; 
  target?: number;
  isProfit?: boolean;
  currency?: string;
}> = ({ label, progress, current, target, isProfit = false, currency }) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-[#85A8C3]">{label}</span>
    {progress !== null && progress !== undefined ? (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-[#E4EEF5]">
            {current !== undefined && target !== undefined ? 
              `${formatCurrency(current, currency)} / ${formatCurrency(target, currency)}` : 
              `${progress.toFixed(1)}%`
            }
          </span>
          <span className={`text-sm font-medium ${
            isProfit ? 
              (progress >= 100 ? "text-[#1BBF99]" : "text-[#85A8C3]") :
              (progress >= 80 ? "text-[#ED5363]" : progress >= 50 ? "text-[#FFA500]" : "text-[#1BBF99]")
          }`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-[#1A2B3A] rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isProfit ? 
                "bg-gradient-to-r from-[#1BBF99] to-[#22D896]" :
                progress >= 80 ? "bg-gradient-to-r from-[#ED5363] to-[#FF6B7D]" :
                progress >= 50 ? "bg-gradient-to-r from-[#FFA500] to-[#FFB84D]" :
                "bg-gradient-to-r from-[#3AB3FF] to-[#7EC8FF]"
            }`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      </div>
    ) : (
      <span className="text-lg font-semibold text-[#85A8C3]">No data</span>
    )}
  </div>
);

const MetricItem: React.FC<{ label: string; value: string; current?: number; maximum?: number; currency?: string }> = ({ 
  label, 
  value,
  current,
  maximum,
  currency 
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm font-medium text-[#85A8C3]">{label}</span>
    {current !== undefined && maximum !== undefined ? (
      <div className="space-y-1">
        <span className="text-lg font-semibold text-[#E4EEF5]">
          {formatCurrency(current, currency)} / {formatCurrency(maximum, currency)}
        </span>
        <div className="w-full bg-[#1A2B3A] rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-[#3AB3FF] to-[#7EC8FF] h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((current / maximum) * 100, 100)}%` }}
          />
        </div>
      </div>
    ) : (
      <span className="text-lg font-semibold text-[#E4EEF5]">{value}</span>
    )}
  </div>
);

const ChallengeMetricsModal: React.FC<ChallengeMetricsModalProps> = ({
  isOpen,
  onClose,
  metrics,
  currency,
}) => {
  // Debug logging for metrics
  React.useEffect(() => {
    if (isOpen) {
      console.log('MetricsModal opened with data:', metrics);
    }
  }, [isOpen, metrics]);

  if (!isOpen) return null;

  // Show debug info if metrics is empty or undefined
  const showDebugInfo = !metrics || Object.keys(metrics).length === 0;
  const hasValidMetrics = metrics && (
    metrics.trading_period || 
    metrics.min_trading_days || 
    metrics.max_daily_loss || 
    metrics.max_loss || 
    metrics.profit_target
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 p-6 bg-gradient-to-b from-[#0A1A2A] to-[#0F1E2E] rounded-2xl border border-[#3AB3FF]/20 shadow-[0_0_40px_rgba(58,179,255,0.15)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#E4EEF5]">Challenge Metrics</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF]/30 bg-[#3AB3FF]/5 hover:bg-[#3AB3FF]/10 transition-colors"
          >
            <X className="w-4 h-4 text-[#85A8C3]" />
          </button>
        </div>

        {/* Debug Info */}
        {showDebugInfo && (
          <div className="mb-4 p-3 rounded-lg bg-[#ED5363]/10 border border-[#ED5363]/20">
            <p className="text-sm text-[#ED5363] font-medium mb-2">Debug Info:</p>
            <p className="text-xs text-[#85A8C3] font-mono">
              Metrics data: {JSON.stringify(metrics, null, 2)}
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="space-y-4">
          <MetricItem 
            label="Trading Period" 
            value={metrics.trading_period || "Not Set"} 
          />
          <MetricItem 
            label="Minimum Trading Days" 
            value={metrics.min_trading_days || "Not Set"} 
          />
          <MetricItem 
            label="Maximum Daily Loss" 
            value={!metrics.max_daily_loss ? "Not Set" : `${metrics.max_daily_loss.percent}% (${formatCurrency(metrics.max_daily_loss.amount, currency)})`}
          />
          <MetricItem 
            label="Maximum Loss" 
            value={!metrics.max_loss ? "Not Set" : `${metrics.max_loss.percent}% (${formatCurrency(metrics.max_loss.amount, currency)})`}
          />
          <MetricItem 
            label="Profit Target" 
            value={!metrics.profit_target ? "Not Set" : `${metrics.profit_target.percent}% (${formatCurrency(metrics.profit_target.amount, currency)})`}
          />
        </div>

        {/* Current Performance Section */}
        {metrics.current_performance && (
          <>
            <div className="mt-6 pt-4 border-t border-[#3AB3FF]/10">
              <h3 className="text-lg font-semibold text-[#E4EEF5] mb-4">Current Performance</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[#85A8C3]">Balance</span>
                    <span className="text-lg font-semibold text-[#E4EEF5]">
                      {formatCurrency(metrics.current_performance.balance, currency)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-[#85A8C3]">Equity</span>
                    <span className="text-lg font-semibold text-[#E4EEF5]">
                      {formatCurrency(metrics.current_performance.equity, currency)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[#85A8C3]">Current P&L</span>
                  <span className={`text-lg font-semibold ${
                    metrics.current_performance.profit >= 0 ? "text-[#1BBF99]" : "text-[#ED5363]"
                  }`}>
                    {metrics.current_performance.profit >= 0 ? "+" : ""}{formatCurrency(metrics.current_performance.profit, currency)}
                  </span>
                </div>

                <PerformanceMetric
                  label="Profit Target Progress"
                  progress={metrics.current_performance.profit_progress}
                  isProfit={true}
                  currency={currency}
                />
                
                <PerformanceMetric
                  label="Max Loss Used"
                  progress={metrics.current_performance.max_loss_progress}
                  isProfit={false}
                  currency={currency}
                />

                {metrics.current_performance.max_daily_loss_progress !== null && (
                  <PerformanceMetric
                    label="Daily Loss Used"
                    progress={metrics.current_performance.max_daily_loss_progress}
                    isProfit={false}
                    currency={currency}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#3AB3FF]/10">
          <button
            onClick={onClose}
            className="w-full h-11 px-4 rounded-xl border border-[#3AB3FF]/50 bg-gradient-to-b from-[rgba(58,179,255,0.05)] to-[rgba(58,179,255,0.05)] shadow-[0_-8px_32px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-all"
          >
            <span className="text-sm font-semibold text-[#85A8C3]">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeMetricsModal;