import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  BarChart3,
  Key,
  PieChart,
  Clock,
  Info,
  Calendar,
  ArrowUp,
  ArrowDown,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import ChallengeCardsGrid from "./ChallengeCardsGrid";
import DateRangePicker from "../shared/DateRangePicker";
import AccountCredentialsModal from "./AccountCredentialsModal";
import { TradingChart, TradingChartData } from "../challenges/TradingChart";
import { ActiveChallenges, ActiveChallenge, fetchTradingResults, fetchGridChallenges } from "../../utils/api";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter";

interface StatusBadgeProps {
  type: "active" | "phase" | "inactive";
  children: React.ReactNode;
  active?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  children,
  active = false,
}) => {
  const baseClasses =
    "flex items-center gap-1 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-semibold transition-all";

  if (type === "active") {
    return (
      <div
        className={`${baseClasses} bg-[#1BBF99]/20 text-[#1BBF99] border border-[#1BBF99]/30`}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#1BBF99]"></div>
        {children}
      </div>
    );
  }

  if (type === "phase" && active) {
    return (
      <div
        className={`${baseClasses} bg-gradient-to-r from-[#3AB3FF]/10 to-[#3AB3FF]/10
        text-[#E4EEF5] border border-[#3AB3FF]/50 shadow-[0_0_40px_rgba(58,179,255,0.20)]`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]
      text-[#456074] border border-[#3AB3FF]/5 shadow-[0_-8px_32px_rgba(58,179,255,0.06)]`}
    >
      {children}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  progress: number;
  maxValue?: string;
  percentage?: string;
  trend?: { type: "positive" | "negative"; value: string };
  timer?: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  progress,
  maxValue,
  percentage,
  trend,
  timer,
  description,
}) => {
  return (
          <div
        className="relative p-4 md:p-5 rounded-xl border border-[#3AB3FF]/5
        bg-[#3AB3FF]/10
        shadow-[0_0_30px_rgba(58,179,255,0.1)] hover:shadow-[0_0_40px_rgba(58,179,255,0.15)]
        transition-all hover:border-[#3AB3FF]/20"
      >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-[#E4EEF5]">{title}</h3>
            {trend && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-2xl text-xs font-medium
                ${
                  trend.type === "positive"
                    ? "bg-[#1BBF99]/20 text-[#1BBF99]"
                    : "bg-[#ED5363]/20 text-[#ED5363]"
                }`}
              >
                {trend.type === "positive" ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {trend.value}
              </div>
            )}
          </div>
          {description && (
            <p className="text-xs text-[#85A8C3] mb-2">{description}</p>
          )}
        </div>
        <Info className="w-5 h-5 text-[#456074] flex-shrink-0" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-lg md:text-xl font-medium text-[#E4EEF5] tracking-tight">
            {value}
          </span>
          {timer && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#3AB3FF]/5
              bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]"
            >
              <Clock className="w-3 h-3 text-[#85A8C3]" />
              <span className="text-xs text-[#85A8C3] font-mono">{timer}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative h-1.5 rounded-full bg-[#3AB3FF]/20 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#1BBF99] to-[#1BBF99]/80 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            {maxValue && (
              <span className="text-[#85A8C3]">Maximum {maxValue}</span>
            )}
            {percentage && <span className="text-[#85A8C3]">{percentage}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChartLegendProps {
  items: Array<{
    id: string;
    label: string;
    color: string;
    active: boolean;
  }>;
  onToggle: (id: string) => void;
}

const ChartLegend: React.FC<ChartLegendProps> = ({ items, onToggle }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs transition-all
            ${
              item.active
                ? "bg-gradient-to-r from-[#3AB3FF]/10 to-[#3AB3FF]/10 text-[#E4EEF5] border border-[#3AB3FF]/50 shadow-[0_0_40px_rgba(58,179,255,0.20)]"
                : "bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] text-[#85A8C3] border border-[#3AB3FF]/5"
            }`}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </button>
      ))}
    </div>
  );
};

const ChallengeIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
    <defs>
      <linearGradient
        id="challengeGradient1"
        x1="32.0996"
        y1="30.7284"
        x2="14.0198"
        y2="23.9226"
      >
        <stop stopColor="#B8EDFF" />
        <stop offset="1" stopColor="#09B8F1" />
      </linearGradient>
      <linearGradient
        id="challengeGradient2"
        x1="38.2792"
        y1="21.7206"
        x2="24.4842"
        y2="17.3211"
      >
        <stop stopColor="#B8EDFF" />
        <stop offset="1" stopColor="#09B8F1" />
      </linearGradient>
    </defs>
    <rect
      width="44"
      height="44"
      rx="8"
      fill="rgba(40, 191, 255, 0.05)"
      stroke="url(#paint0_linear)"
      className="shadow-[0_0_16px_rgba(25,213,251,0.12)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset]"
    />
    <path
      d="M31.0758 29.5528L29.7494 24.8692H21.8594C21.5155 24.8692 21.2229 24.6497 21.1293 24.3255L19.6603 19.131H10.8434C10.2965 19.131 9.88393 19.6683 10.0295 20.1856L11.3559 24.8692L12.8249 30.0637C12.9151 30.3879 13.2077 30.6073 13.5519 30.6073H30.2622C30.8092 30.6073 31.2217 30.07 31.0762 29.5528H31.0758Z"
      fill="url(#challengeGradient1)"
    />
    <path
      d="M18.0076 24.8692H29.7487L28.2797 19.6746C28.1895 19.3504 27.8969 19.131 27.5527 19.131H15.8086L17.2776 24.3255C17.3712 24.6497 17.6638 24.8692 18.0076 24.8692Z"
      fill="#0594CC"
    />
    <path
      d="M29.7493 24.8691H33.1556C33.7025 24.8691 34.1184 24.3318 33.9695 23.8145L31.1741 13.9364C31.0839 13.6122 30.7913 13.3928 30.4471 13.3928H15.2997C14.7528 13.3928 14.3369 13.9301 14.4824 14.4473L15.8088 19.1309H27.5533C27.8971 19.1309 28.1898 19.3504 28.2804 19.6746L29.7493 24.8691Z"
      fill="url(#challengeGradient2)"
    />
  </svg>
);

export interface ChallengeMetricsProps {
  challengeData?: ActiveChallenges;
}

const ChallengeMetrics: React.FC<ChallengeMetricsProps> = ({
  challengeData,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [chartStartDate, setChartStartDate] = useState<Date | null>(null);
  const [chartEndDate, setChartEndDate] = useState<Date | null>(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const credentialsButtonRef = React.useRef<HTMLButtonElement>(null);

  // Get current challenge data with null checks - moved to the top
  const currentChallenge = React.useMemo(() => {
    return challengeData?.list?.[currentChallengeIndex] || null;
  }, [challengeData, currentChallengeIndex]);
  
  const challengeCount = challengeData?.count || 0;

  // Automatically set date range based on challenge start date and today
  React.useEffect(() => {
    if (currentChallenge?.start_date) {
      const startDate = new Date(currentChallenge.start_date);
      const endDate = new Date(); // Today's date
      
      setChartStartDate(startDate);
      setChartEndDate(endDate);
    }
  }, [currentChallenge?.start_date]);

  // Fetch trading results data
  const { data: tradingResultsData, isLoading: isLoadingTradingResults, error: tradingResultsError } = useQuery({
    queryKey: ['trading-results', currentChallenge?.account_id, chartStartDate?.toISOString(), chartEndDate?.toISOString()],
    queryFn: () => {
      if (!currentChallenge?.account_id) {
        return Promise.resolve(null);
      }
      return fetchTradingResults(currentChallenge.account_id, chartStartDate, chartEndDate);
    },
    enabled: !!currentChallenge?.account_id,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Fetch grid challenge data for grid view
  const { data: gridChallengeData, isLoading: isLoadingGridChallenges } = useQuery({
    queryKey: ['grid-challenges'],
    queryFn: fetchGridChallenges,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Add logging to debug grid challenge data
  React.useEffect(() => {
    if (gridChallengeData) {
      console.log('Grid Challenge Data Received:', gridChallengeData);
      gridChallengeData.forEach((enrollment, index) => {
        console.log(`Challenge ${index}:`, {
          id: enrollment.id,
          challenge_type: enrollment.challenge_type,
          credentials: enrollment.credentials,
          metrics: enrollment.metrics,
        });
      });
    }
  }, [gridChallengeData]);

  // Find PAP enrollments awaiting payment (shown regardless of view mode)
  const papEnrollments = React.useMemo(() => {
    if (!gridChallengeData || !Array.isArray(gridChallengeData)) return [];
    return gridChallengeData.filter(e => e.status === 'awaiting_payment');
  }, [gridChallengeData]);

  // Transform trading results data for chart
  const chartData: TradingChartData[] = React.useMemo(() => {
    if (!tradingResultsData?.data?.length) {
      return [];
    }

    // Compute profit target line from challenge metrics (starting_balance + target amount)
    // The backend profit_target_line can be incorrect, so prefer computing from metrics
    const profitTargetMaximum = currentChallenge?.metrics?.profit_target?.maximum;
    const profitTarget = profitTargetMaximum
      ? tradingResultsData.starting_balance + profitTargetMaximum
      : tradingResultsData.profit_target_line;
    const dailyLossFloor = tradingResultsData.daily_loss_floor;
    const maxTrailingDrawdownFloor = tradingResultsData.max_trailing_drawdown_floor;

    // Filter data by selected date range (client-side, in case the API doesn't filter)
    let filteredData = tradingResultsData.data;
    if (chartStartDate || chartEndDate) {
      filteredData = tradingResultsData.data.filter((dataPoint) => {
        const pointDate = new Date(dataPoint.date);
        // Compare dates only (ignore time)
        pointDate.setHours(0, 0, 0, 0);
        if (chartStartDate) {
          const start = new Date(chartStartDate);
          start.setHours(0, 0, 0, 0);
          if (pointDate < start) return false;
        }
        if (chartEndDate) {
          const end = new Date(chartEndDate);
          end.setHours(0, 0, 0, 0);
          if (pointDate > end) return false;
        }
        return true;
      });
    }

    // Transform the API response format to chart data
    const dataPoints = filteredData.map((dataPoint, index) => {
      // Calculate equity as balance (assuming no open positions for historical data)
      const equity = dataPoint.balance;
      // For the last data point, use the current equity from API
      const finalEquity = index === filteredData.length - 1 ? tradingResultsData.equity_today : equity;

      return {
        date: new Date(dataPoint.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        balance: dataPoint.balance,
        equity: finalEquity,
        profitTarget: profitTarget,
        dailyLoss: dailyLossFloor,
        maxDrawdown: maxTrailingDrawdownFloor,
      };
    });

    return dataPoints.slice(-30); // Show last 30 data points
  }, [tradingResultsData, currentChallenge, chartStartDate, chartEndDate]);

  // Sample credentials data from current challenge with fallbacks
  const sampleCredentials = currentChallenge ? {
    accountId: currentChallenge.account_id || "",
    login: currentChallenge.credentials?.login || "",
    password: currentChallenge.credentials?.password || "",
    server: currentChallenge.credentials?.server || "",
    platform: currentChallenge.platform || "MT5",
  } : {
    accountId: "",
    login: "",
    password: "",
    server: "",
    platform: "MT5",
  };

  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    setChartStartDate(start);
    setChartEndDate(end);
  };

  const handlePreviousChallenge = () => {
    if (currentChallengeIndex > 0) {
      setCurrentChallengeIndex(currentChallengeIndex - 1);
    }
  };

  const handleNextChallenge = () => {
    if (challengeData?.list && currentChallengeIndex < challengeData.list.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
    }
  };

  // Calculate progress percentages
  const calculateProgress = (left: number, maximum: number) => {
    if (maximum === 0) return 0;
    return Math.max(0, Math.min(100, ((maximum - left) / maximum) * 100));
  };

  // Format time left today
  const formatTimeLeft = (timeLeft: string | null) => {
    if (!timeLeft) return null;
    // If it's already in HH:MM:SS format, return as is
    if (timeLeft.includes(':')) return timeLeft;
    // Otherwise, assume it's seconds and convert
    const totalSeconds = parseInt(timeLeft);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get trading stats for current account
  const getCurrentAccountStats = () => {
    if (!tradingResultsData) {
      return { tradeCount: 0, totalPnL: 0 };
    }

    return {
      tradeCount: tradingResultsData.data?.length || 0,
      totalPnL: tradingResultsData.equity_today - tradingResultsData.starting_balance,
    };
  };

  const currentStats = getCurrentAccountStats();

  return (
    <>
      <div className="rounded-2xl border border-[rgba(58,179,255,0.05)] bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)] p-4 md:p-6 w-full">
        <div className="space-y-6 md:space-y-8 w-full">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-10">
              <div className="flex items-center gap-3">
                <ChallengeIcon />
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-medium text-[#E4EEF5] tracking-tight">
                    Active challenges
                  </h1>
                  <span
                    className="text-lg md:text-xl font-medium bg-gradient-to-r from-[#3AB3FF] to-[#3AB3FF]
                  bg-clip-text text-transparent"
                  >
                    ({challengeCount})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={handlePreviousChallenge}
                  disabled={currentChallengeIndex === 0}
                  className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl border border-[#28BFFF]/50
                bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)]
                shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-[#85A8C3]" />
                </button>
                <button
                  onClick={handleNextChallenge}
                  disabled={!challengeData?.list || currentChallengeIndex >= challengeData.list.length - 1}
                  className="w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl border border-[#28BFFF]/50
                bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)]
                shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10 transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#85A8C3]" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`h-9 md:h-11 px-3 md:px-5 flex items-center justify-center rounded-lg border transition-all ${
                  viewMode === "grid"
                    ? "border-[#28BFFF]/70 bg-gradient-to-b from-[rgba(8,8,8,0.01)] to-[rgba(8,8,8,0.01)] shadow-[0_0_40px_rgba(79,214,255,0.40)_inset]"
                    : "border-[#28BFFF]/50 bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10"
                }`}
              >
                <Grid3X3
                  className={`w-5 h-5 md:w-6 md:h-6 ${viewMode === "grid" ? "text-[#E4EEF5]" : "text-[#456074]"}`}
                />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`h-9 md:h-11 px-3 md:px-5 flex items-center justify-center rounded-lg border transition-all ${
                  viewMode === "list"
                    ? "border-[#28BFFF]/70 bg-gradient-to-b from-[rgba(8,8,8,0.01)] to-[rgba(8,8,8,0.01)] shadow-[0_0_40px_rgba(79,214,255,0.40)_inset]"
                    : "border-[#28BFFF]/50 bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10"
                }`}
              >
                <BarChart3
                  className={`w-5 h-5 md:w-6 md:h-6 ${viewMode === "list" ? "text-[#E4EEF5]" : "text-[#456074]"}`}
                />
              </button>
            </div>
          </div>

          {/* PAP Payment Required Banner — always visible regardless of view mode */}
          {papEnrollments.map((enrollment) => (
            <div
              key={`pap-${enrollment.enrollment_id}`}
              className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-4 sm:p-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/20 shrink-0 mt-0.5">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#E4EEF5]">
                      Congratulations! You passed your {enrollment.challenge_type} challenge!
                    </h3>
                    <p className="text-sm text-[#85A8C3] mt-1">
                      Complete your payment to unlock your live funded account.
                    </p>
                  </div>
                </div>
                {enrollment.pap_checkout_url ? (
                  <a
                    href={enrollment.pap_checkout_url}
                    className="shrink-0 flex items-center gap-2 px-6 py-2.5 font-semibold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-black rounded-lg shadow-lg shadow-amber-500/25 transition-all duration-300"
                  >
                    Pay Now
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="shrink-0 text-sm text-[#85A8C3]">
                    Contact support to complete payment
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Challenge Content - Conditional Rendering */}
          {viewMode === "grid" ? (
            isLoadingGridChallenges ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-[#3AB3FF]/20 border-t-[#3AB3FF] rounded-full animate-spin"></div>
                  <p className="text-sm text-[#85A8C3]">Loading challenges...</p>
                </div>
              </div>
            ) : (
              <ChallengeCardsGrid gridChallengeData={gridChallengeData} />
            )
          ) : (
            /* Challenge Overview Section */
            currentChallenge && (
              <div
                className="p-4 md:p-6 rounded-xl border border-[#1081C7]/5
                bg-[#0B1C1F] bg-gradient-to-bl from-[#23353E1F] to-transparent
                shadow-[0_0_30px_rgba(16,129,199,0.1)] relative overflow-hidden"
              >
                {/* Background blur effect */}
                <div
                  className="absolute -left-36 -top-54 w-[501px] h-[501px] rounded-full
                  bg-[#50D5FF]/6 blur-[140px] pointer-events-none"
                />

                <div className="relative space-y-6 md:space-y-8">
                  {/* Challenge Header */}
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="space-y-4 md:space-y-6">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <h2 className="text-lg md:text-xl font-medium text-[#85A8C3] tracking-tight">
                          {currentChallenge.name} ({currentChallenge.step_type})
                        </h2>
                        <StatusBadge type="active">Active</StatusBadge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {currentChallenge.steps && Array.isArray(currentChallenge.steps) && currentChallenge.steps.map((step, index) => (
                          <React.Fragment key={step.name}>
                            <StatusBadge 
                              type="phase" 
                              active={currentChallenge.current_phase?.name === step.name}
                            >
                              {step.name}
                            </StatusBadge>
                            {index < currentChallenge.steps.length - 1 && (
                              <ChevronRight className="w-5 h-5 text-[#456074]" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        ref={credentialsButtonRef}
                        className="flex items-center gap-2 h-9 md:h-11 px-3 md:px-4 rounded-lg border border-[#28BFFF]/50
                      bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)]
                      shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10 transition-all"
                        onClick={() => setIsCredentialsModalOpen(true)}
                      >
                        <Key className="w-4 h-4 md:w-5 md:h-5 text-[#85A8C3]" />
                        <span className="text-xs md:text-sm font-semibold text-[#85A8C3]">
                          Credentials
                        </span>
                      </button>
                      <button
                        className="flex items-center gap-2 h-9 md:h-11 px-3 md:px-4 rounded-lg border border-[#28BFFF]/70
                      bg-gradient-to-b from-[rgba(8,8,8,0.01)] to-[rgba(8,8,8,0.01)]
                      shadow-[0_0_40px_rgba(79,214,255,0.40)_inset] transition-all"
                      >
                        <PieChart className="w-4 h-4 md:w-5 md:h-5 text-[#E4EEF5]" />
                        <span className="text-xs md:text-sm font-semibold text-[#E4EEF5]">
                          Metrics
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:p-6 rounded-xl border border-[#28BFFF]/50
                    bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-[#1BBF99] flex-shrink-0" />
                      <span className="text-base md:text-lg font-medium text-[#E4EEF5] tracking-tight truncate">
                        Account #{currentChallenge.account_id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:gap-6 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#456074]">Platform</span>
                        <div
                          className="px-3 py-1.5 rounded-full border border-[#28BFFF]/50
                        bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)]
                        shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset]"
                        >
                          <span className="text-sm text-[#85A8C3]">{currentChallenge.platform}</span>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2 min-w-0">
                        <span className="text-xs text-[#456074]">Start date</span>
                        <div
                          className="px-3 py-1.5 rounded-full border border-[#28BFFF]/50
                        bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)]
                        shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] w-full md:w-auto max-w-[200px] md:max-w-none overflow-hidden"
                        >
                          <span className="text-sm text-[#85A8C3] truncate block">
                            {new Date(currentChallenge.start_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  {currentChallenge.metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {currentChallenge.metrics.profit_target && (
                        <MetricCard
                          title="Profit Target"
                          value={`${formatCurrency(currentChallenge.metrics.profit_target.left || 0, currentChallenge.currency)} left`}
                          progress={calculateProgress(
                            currentChallenge.metrics.profit_target.left || 0,
                            currentChallenge.metrics.profit_target.maximum || 0
                          )}
                          maxValue={formatCurrency(currentChallenge.metrics.profit_target.maximum || 0, currentChallenge.currency)}
                          percentage={`${currentChallenge.metrics.profit_target.percentage || 0}%`}
                        />
                      )}

                      {currentChallenge.metrics.max_daily_loss && (
                        <MetricCard
                          title="Max Daily Loss"
                          value={`${formatCurrency(currentChallenge.metrics.max_daily_loss.left || 0, currentChallenge.currency)} left`}
                          progress={calculateProgress(
                            currentChallenge.metrics.max_daily_loss.left || 0,
                            currentChallenge.metrics.max_daily_loss.maximum || 0
                          )}
                          maxValue={formatCurrency(currentChallenge.metrics.max_daily_loss.maximum || 0, currentChallenge.currency)}
                          percentage={`${currentChallenge.metrics.max_daily_loss.percentage || 0}%`}
                          trend={{ 
                            type: (currentChallenge.metrics.max_daily_loss.used_percentage || 0) > 0 ? "negative" : "positive", 
                            value: `${(currentChallenge.metrics.max_daily_loss.used_percentage || 0).toFixed(1)}%` 
                          }}
                          timer={formatTimeLeft(currentChallenge.metrics.max_daily_loss.time_left_today) || undefined}
                        />
                      )}

                      {currentChallenge.metrics.max_permitted_loss && (
                        <MetricCard
                          title="Max Permitted Loss"
                          value={`${formatCurrency(currentChallenge.metrics.max_permitted_loss.left || 0, currentChallenge.currency)} left`}
                          progress={calculateProgress(
                            currentChallenge.metrics.max_permitted_loss.left || 0,
                            currentChallenge.metrics.max_permitted_loss.maximum || 0
                          )}
                          maxValue={formatCurrency(currentChallenge.metrics.max_permitted_loss.maximum || 0, currentChallenge.currency)}
                          percentage={`${currentChallenge.metrics.max_permitted_loss.percentage || 0}%`}
                          trend={{ 
                            type: (currentChallenge.metrics.max_permitted_loss.used_percentage || 0) > 0 ? "negative" : "positive", 
                            value: `${(currentChallenge.metrics.max_permitted_loss.used_percentage || 0).toFixed(1)}%` 
                          }}
                        />
                      )}

                      {currentChallenge.metrics.trading_days && (
                        <MetricCard
                          title="Trading Days"
                          value={`${currentChallenge.metrics.trading_days.completed || 0} days`}
                          progress={(currentChallenge.metrics.trading_days.required === "0" || !currentChallenge.metrics.trading_days.required) ? 100 : 
                            ((currentChallenge.metrics.trading_days.completed || 0) / parseInt(currentChallenge.metrics.trading_days.required)) * 100}
                          description={
                            (currentChallenge.metrics.trading_days.required === "0" || !currentChallenge.metrics.trading_days.required)
                              ? "No limitation in this challenge."
                              : `${currentChallenge.metrics.trading_days.required} days required`
                          }
                        />
                      )}
                    </div>
                  )}

                  {/* Trading Results Chart */}
                  <TradingChart
                    data={chartData}
                    isLoading={isLoadingTradingResults}
                    onDateRangeChange={handleDateRangeSelect}
                    startDate={chartStartDate}
                    endDate={chartEndDate}
                    currency={currentChallenge?.currency}
                    className="border-[#28BFFF]/5 bg-gradient-to-135deg from-[rgba(80,213,255,0.10)] via-[rgba(80,213,255,0.02)] to-transparent"
                  />
                </div>
              </div>
            )
          )}

          {/* Pagination Dots */}
          {challengeData?.list && challengeData.list.length > 1 && (
            <div className="flex justify-center items-center gap-4 md:gap-6">
              {challengeData.list.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentChallengeIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentChallengeIndex ? 'bg-[#85A8C3]' : 'bg-[#456074]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Account Credentials Modal */}
      <AccountCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        credentials={sampleCredentials}
      />
    </>
  );
};

export default ChallengeMetrics;
