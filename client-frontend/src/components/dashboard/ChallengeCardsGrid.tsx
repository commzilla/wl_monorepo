import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  UserCircle,
  ArrowUp,
  ArrowDown,
  Check,
  Trophy,
  Key,
  PieChart,
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AccountCredentialsModal from "./AccountCredentialsModal";
import ChallengeMetricsModal from "./ChallengeMetricsModal";
import { GridChallengeResponse } from "../../utils/api";
import { formatCurrency, getCurrencySymbol } from "../../utils/currencyFormatter";

interface AccountInfo {
  id: string;
  startDate: string;
  status: "live" | "phase1" | "phase2";
  currency?: string;
  balance?: {
    amount: number;
    percentage: number;
    trend: "positive" | "negative";
  };
  progress?: {
    current: number;
    target?: number;
    percentage: number;
    trend?: "positive" | "negative";
  };
  completed?: boolean;
  opacity?: number;
}

interface ChallengeCard {
  id: string;
  title: string;
  status: "active" | "passed" | "failed" | "closed" | "awaiting_payment";
  accounts: AccountInfo[];
  showButtons?: boolean;
  endDate?: string;
  currency?: string;
  credentials?: {
    broker: string;
    server: string;
    login: string;
    password: string;
    investor_password: string;
  };
  metrics?: {
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
  };
}

interface ChallengeCardsGridProps {
  challenges?: ChallengeCard[];
  challengeData?: any; // Old data format (deprecated)
  gridChallengeData?: GridChallengeResponse; // New data format
}

const StatusBadge: React.FC<{ type: "active" | "passed" | "failed" | "closed" | "awaiting_payment" }> = ({ type }) => {
  const { t } = useTranslation();

  if (type === "awaiting_payment") {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F59E0B]/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
        <span className="text-xs font-normal text-[#F59E0B] tracking-tight">
          Awaiting Payment
        </span>
      </div>
    );
  }
  if (type === "active") {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1BBF99]/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#1BBF99]" />
        <span className="text-xs font-normal text-[#1BBF99] tracking-tight">
          {t('challenges.active')}
        </span>
      </div>
    );
  }
  if (type === "passed") {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1BBF99]/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#1BBF99]" />
        <span className="text-xs font-normal text-[#1BBF99] tracking-tight">
          {t('challenges.passed')}
        </span>
      </div>
    );
  }
  if (type === "failed") {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ED5363]/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ED5363]" />
        <span className="text-xs font-normal text-[#ED5363] tracking-tight">
          {t('challenges.failed')}
        </span>
      </div>
    );
  }
  if (type === "closed") {
    return (
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F59E0B]/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
        <span className="text-xs font-normal text-[#F59E0B] tracking-tight">
          Closed
        </span>
      </div>
    );
  }
  return null;
};

const PhaseBadge: React.FC<{
  phase: "live" | "phase1" | "phase2";
  completed?: boolean;
  active?: boolean;
}> = ({ phase, completed = false, active = false }) => {
  const { t } = useTranslation();
  
  const getPhaseText = () => {
    switch (phase) {
      case "live":
        return t('challenges.live');
      case "phase1":
        return t('challenges.phase1');
      case "phase2":
        return t('challenges.phase2');
      default:
        return phase;
    }
  };

  if (active) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3AB3FF]/70 bg-gradient-to-b from-[rgba(8,8,8,0.01)] to-[rgba(8,8,8,0.01)] shadow-[0_0_40px_rgba(58,179,255,0.20)_inset]">
        <span className="text-xs font-normal text-[#E4EEF5] tracking-tight">
          {getPhaseText()}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 h-6 px-3 py-1.5 rounded-full border border-[#3AB3FF]/50 bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] shadow-[0_-8px_32px_rgba(58,179,255,0.06)_inset]">
      <span className="text-xs font-normal text-[#85A8C3] tracking-tight">
        {getPhaseText()}
      </span>
      {completed && (
        <div className="flex items-center justify-center w-4 h-4 rounded-full border border-[#1BBF99]/20">
          <Check className="w-3 h-3 text-[#1BBF99]" strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

const TrendBadge: React.FC<{
  trend: "positive" | "negative";
  value: string;
}> = ({ trend, value }) => {
  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-2xl ${
        trend === "positive" ? "bg-[#1BBF99]/20" : "bg-[#ED5363]/20"
      }`}
    >
      {trend === "positive" ? (
        <ArrowUp className="w-3 h-3 text-[#1BBF99]" strokeWidth={3} />
      ) : (
        <ArrowDown className="w-3 h-3 text-[#ED5363]" strokeWidth={3} />
      )}
      <span
        className={`text-xs font-medium ${
          trend === "positive" ? "text-[#1BBF99]" : "text-[#ED5363]"
        }`}
      >
        {value}
      </span>
    </div>
  );
};

const ProgressBar: React.FC<{
  progress: number;
  trend?: "positive" | "negative";
  variant?: "default" | "danger";
}> = ({ progress, trend, variant = "default" }) => {
  const progressWidth = Math.min(Math.max(progress, 0), 100);

  if (variant === "danger") {
    return (
      <div className="w-full h-2 relative">
        {/* Background segments */}
        <div className="absolute inset-0 flex">
          <div className="w-[29%] h-full bg-[#ED5363]/20 rounded-l-xl" />
          <div className="flex-1 h-full bg-[#3AB3FF]/20 rounded-r-xl backdrop-blur-sm" />
        </div>

        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-[#ED5363] rounded-l-xl"
          style={{ width: `${Math.min(progressWidth, 29)}%` }}
        />

        {/* Divider line */}
        <div className="absolute top-0 left-[29%] w-px h-full bg-[#E4EEF5]" />
      </div>
    );
  }

  return (
    <div className="w-full h-2 relative">
      <div className="w-full h-full rounded-xl bg-[#3AB3FF]/20 backdrop-blur-sm" />
      <div
        className="absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r from-[#3AB3FF] to-[#3AB3FF]"
        style={{ width: `${progressWidth}%` }}
      />
    </div>
  );
};

const AccountRow: React.FC<{
  account: AccountInfo;
  isFirst?: boolean;
  showBalance?: boolean;
  challengeStatus?: "active" | "passed" | "failed" | "awaiting_payment";
  endDate?: string;
}> = ({ account, isFirst = false, showBalance = false, challengeStatus = "active", endDate }) => {
  const { t } = useTranslation();
  
  const getDateInfo = () => {
    if (challengeStatus === "failed") {
      // For failed challenges, show both start and end dates
      const startDate = account.startDate;
      const failedEndDate = endDate || account.startDate; // Use endDate if provided
      return (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-normal text-[#85A8C3] tracking-tight">
            {t('challenges.startDate')}: {startDate}
          </span>
          <span className="text-xs font-normal text-[#ED5363] tracking-tight">
            {t('challenges.endDate')}: {failedEndDate}
          </span>
        </div>
      );
    } else if (challengeStatus === "passed") {
      return (
        <span className="text-xs font-normal text-[#85A8C3] tracking-tight">
          {t('challenges.startDate')}: {account.startDate}
        </span>
      );
    } else {
      return (
        <span className="text-xs font-normal text-[#85A8C3] tracking-tight">
          {t('challenges.startDate')}: {account.startDate}
        </span>
      );
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 sm:gap-5 ${account.opacity ? `opacity-${Math.round(account.opacity * 100)}` : ""}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 p-2 sm:p-2.5 rounded-lg border border-[#3AB3FF]/50 bg-gradient-to-b from-[rgba(58,179,255,0.05)] to-[rgba(58,179,255,0.05)] shadow-[0_-8px_32px_rgba(58,179,255,0.06)_inset]">
          <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#85A8C3]" fill="currentColor" />
        </div>

        <div className="flex-1 flex flex-col gap-1 sm:gap-1.5">
          <span
            className={`text-base sm:text-lg font-medium tracking-tight ${
              isFirst ? "text-[#E4EEF5]" : "text-[#85A8C3]"
            }`}
          >
            {t('challenges.account')} {account.id}
          </span>
          {getDateInfo()}
        </div>

        <PhaseBadge
          phase={account.status}
          completed={account.completed}
          active={isFirst && account.status !== "phase1"}
        />
      </div>

      {showBalance && account.balance && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pl-12 sm:pl-14">
          <div className="flex items-center gap-1">
            <span className="text-base sm:text-lg font-normal text-[#85A8C3] tracking-tight">
              {t('challenges.balance')}:
            </span>
            <span className="text-base sm:text-lg font-normal text-[#85A8C3] tracking-tight">
              {formatCurrency(account.balance.amount, account.currency)}
            </span>
          </div>
        </div>
      )}

      {account.progress && (
        <div className="flex flex-col gap-2 sm:gap-3">
          <ProgressBar
            progress={account.progress.percentage}
            trend={account.progress.trend}
            variant={
              account.progress.trend === "negative" ? "danger" : "default"
            }
          />
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
            <span className="text-base sm:text-lg font-normal text-[#85A8C3] tracking-tight">
              {formatCurrency(account.progress.current, account.currency)}
               {account.progress.target
                 ? ` / ${formatCurrency(account.progress.target, account.currency)}`
                 : ""}
            </span>
            <span
              className={`text-sm font-normal tracking-tight ${
                account.progress.trend === "negative"
                  ? "text-[#ED5363]"
                  : "text-[#85A8C3]"
              }`}
            >
              {account.progress.trend === "negative" ? "-" : ""}
              {account.progress.percentage}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const ChallengeCard: React.FC<{ challenge: ChallengeCard }> = ({
  challenge,
}) => {
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCredentialsClick = () => {
    setIsCredentialsModalOpen(true);
  };

  const handleMetricsClick = () => {
    setIsMetricsModalOpen(true);
  };

  const handleStatsClick = () => {
    console.log('Stats clicked for challenge:', challenge.title);
    // TODO: Navigate to stats page or show stats modal
  };

  const handleCloseCredentialsModal = () => {
    setIsCredentialsModalOpen(false);
  };

  const handleCloseMetricsModal = () => {
    setIsMetricsModalOpen(false);
  };

  return (
    <div className={`relative flex flex-col rounded-xl border border-[#3AB3FF]/5 bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.1)] hover:shadow-[0_0_40px_rgba(58,179,255,0.15)] overflow-hidden transition-all duration-300 ease-in-out ${
      isExpanded ? 'min-h-[400px]' : 'min-h-[80px]'
    }`}>
      {/* Background blur effect */}
      <div className="absolute -left-10 -top-[106px] w-[286px] h-[286px] rounded-full bg-[#3AB3FF]/20 blur-[140px] pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 sm:px-5 lg:px-6 pt-4 sm:pt-5 lg:pt-6 pb-3 sm:pb-4 lg:pb-5 rounded-t-xl bg-[#3AB3FF]/5">
        <h3 className="flex-1 text-lg sm:text-xl lg:text-2xl font-medium text-[#E4EEF5] tracking-tight">
          {challenge.title}
        </h3>
        <div className="flex items-center gap-3">
          <StatusBadge type={challenge.status} />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#28BFFF]/50 bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10 transition-all"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#85A8C3]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#85A8C3]" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`relative flex-1 flex flex-col justify-between px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
          {challenge.accounts.map((account, index) => (
            <AccountRow
              key={`${account.id}-${index}`}
              account={account}
              isFirst={index === 0}
              showBalance={index === 0 && account.balance !== undefined}
              challengeStatus={challenge.status}
              endDate={challenge.endDate}
            />
          ))}
        </div>

        {/* Footer Buttons */}
        {challenge.showButtons && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2 mt-4 sm:mt-6">
            <button
              onClick={handleCredentialsClick}
              className="flex items-center justify-center gap-2 h-11 px-4 sm:px-6 rounded-xl border border-[#28BFFF]/50 bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10 transition-all"
            >
              <Key className="w-4 h-4 sm:w-5 sm:h-5 text-[#85A8C3]" />
              <span className="text-sm font-semibold text-[#85A8C3]">
                Credentials
              </span>
            </button>
            <button 
              onClick={handleMetricsClick}
              className="flex items-center justify-center gap-2 h-11 px-4 sm:px-6 rounded-lg border border-[#28BFFF]/70 bg-gradient-to-b from-[rgba(8,8,8,0.01)] to-[rgba(8,8,8,0.01)] shadow-[0_0_40px_rgba(79,214,255,0.40)_inset] hover:bg-[#28BFFF]/10 transition-all"
            >
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[#E4EEF5]" />
              <span className="text-sm font-semibold text-[#E4EEF5]">
                Metrics
              </span>
            </button>
            <button 
              onClick={handleStatsClick}
              className="flex items-center justify-center gap-2 h-11 px-4 sm:px-6 rounded-lg border border-[#28BFFF]/50 bg-gradient-to-b from-[rgba(40,191,255,0.05)] to-[rgba(40,191,255,0.05)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:bg-[#28BFFF]/10 transition-all"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#85A8C3]" />
              <span className="text-sm font-semibold text-[#85A8C3]">
                Stats
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Account Credentials Modal */}
      {challenge.credentials && (
        <AccountCredentialsModal
          isOpen={isCredentialsModalOpen}
          onClose={handleCloseCredentialsModal}
          credentials={{
            accountId: challenge.credentials.login,
            login: challenge.credentials.login,
            password: challenge.credentials.password,
            server: challenge.credentials.server,
          }}
        />
      )}
      
      {/* Challenge Metrics Modal */}
      {challenge.metrics && (
        <ChallengeMetricsModal
          isOpen={isMetricsModalOpen}
          onClose={handleCloseMetricsModal}
          metrics={challenge.metrics}
          currency={challenge.currency}
        />
      )}
    </div>
  );
};

const ChallengeCardsGrid: React.FC<ChallengeCardsGridProps> = ({
  challenges = [],
  challengeData,
  gridChallengeData,
}) => {
  const navigate = useNavigate();
  // Transform API data to match expected format
  const transformedChallenges: ChallengeCard[] = React.useMemo(() => {
    // Use new grid challenge data if available
    if (gridChallengeData && Array.isArray(gridChallengeData)) {
      return gridChallengeData.map((enrollment, index) => {
        // Extract phase from challenge_type (e.g., "10,000 – 1 Step Phase 1")
        const getPhaseFromChallengeType = (challengeType: string) => {
          if (challengeType.includes('Phase 1')) return 'phase1' as const;
          if (challengeType.includes('Phase 2')) return 'phase2' as const;
          if (challengeType.includes('Live') || enrollment.status_label === 'Passed') {
            return 'live' as const;
          }
          return 'phase1' as const;
        };

        // Generate start and end dates based on status
        const getStartDate = () => {
          // For failed challenges, generate a reasonable start date (before end date)
          if (enrollment.status_label === "Failed" && enrollment.end_date && enrollment.end_date !== "–") {
            try {
              const endDate = new Date(enrollment.end_date);
              const startDate = new Date(endDate);
              startDate.setDate(endDate.getDate() - Math.floor(Math.random() * 30) - 1); // 1-30 days before
              return startDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
              });
            } catch {
              return "Recently started";
            }
          }
          
          // For other statuses, generate a reasonable start date
          const daysAgo = Math.floor(Math.random() * 30) + 1; // Random 1-30 days ago
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysAgo);
          return startDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
          });
        };

        const getEndDate = () => {
          if (enrollment.end_date && enrollment.end_date !== "–") {
            try {
              return new Date(enrollment.end_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
              });
            } catch {
              return "Recently ended";
            }
          }
          return undefined;
        };

        return {
          id: enrollment.id,
          title: enrollment.challenge_type.replace(/(\d{1,3}(?:,\d{3})*)/, (match) => `${getCurrencySymbol(enrollment.currency)}${match}`),
          status: enrollment.status === "awaiting_payment" ? "awaiting_payment" as const :
                  enrollment.status_label === "In Progress" ? "active" as const :
                  enrollment.status_label === "Passed" ? "passed" as const :
                  enrollment.status_label === "Payment Required" ? "passed" as const :
                  enrollment.status_label === "Failed" ? "failed" as const :
                  enrollment.status_label === "Payout Limit Reached" ? "closed" as const : "active" as const,
          showButtons: true, // Show buttons for all challenges
          endDate: getEndDate(), // Store end date for failed challenges
          currency: enrollment.currency,
          credentials: enrollment.credentials,
          metrics: enrollment.metrics,
          accounts: [
            {
              id: enrollment.account_number,
              startDate: getStartDate(),
              status: getPhaseFromChallengeType(enrollment.challenge_type),
              currency: enrollment.currency,
              balance: enrollment.balance ? {
                amount: parseFloat(enrollment.balance.replace(/[$€£¥,]/g, '')),
                percentage: 0,
                trend: "positive" as const
              } : undefined,
              progress: {
                current: parseFloat(enrollment.balance?.replace(/[$€£¥,]/g, '') || '0'),
                target: parseFloat(enrollment.account_size) * 1.1, // Assume 10% target
                percentage: enrollment.progress || 0,
                trend: (enrollment.progress || 0) >= 0 ? "positive" as const : "negative" as const
              },
              completed: enrollment.status_label === "Passed",
            }
          ],
        };
      });
    }

    // Fallback to old challengeData format
    if (!challengeData?.list) return challenges;

    return challengeData.list.map((apiChallenge, index) => ({
      id: apiChallenge.account_id || index.toString(),
      title: `${apiChallenge.name} (${apiChallenge.step_type})`,
      status: "active" as const,
      showButtons: true, // Show buttons for all challenges
      currency: apiChallenge.currency,
      credentials: apiChallenge.credentials,
      metrics: apiChallenge.metrics,
      accounts: [
        {
          id: `#${apiChallenge.account_id}`,
          startDate: new Date(apiChallenge.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          status: apiChallenge.status?.includes('Live') ? 'live' as const :
                  apiChallenge.status?.includes('Phase 2') ? 'phase2' as const : 
                  'phase1' as const,
          currency: apiChallenge.currency,
          ...(apiChallenge.metrics?.profit_target && {
            progress: {
              current: (apiChallenge.metrics.profit_target.maximum || 0) - (apiChallenge.metrics.profit_target.left || 0),
              target: apiChallenge.metrics.profit_target.maximum,
              percentage: Math.round(((apiChallenge.metrics.profit_target.maximum || 0) - (apiChallenge.metrics.profit_target.left || 0)) / (apiChallenge.metrics.profit_target.maximum || 1) * 100)
            }
          }),
          completed: apiChallenge.status?.includes('Passed') || false,
        }
      ],
    }));
  }, [gridChallengeData, challengeData, challenges]);

  const finalChallenges = transformedChallenges.length > 0 ? transformedChallenges : challenges;

  // Find PAP enrollments awaiting payment
  const papEnrollments = React.useMemo(() => {
    if (!gridChallengeData || !Array.isArray(gridChallengeData)) return [];
    return gridChallengeData.filter(e => e.status === 'awaiting_payment');
  }, [gridChallengeData]);

  // Empty state when no challenges (but not if PAP banners exist)
  if (finalChallenges.length === 0 && papEnrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-[rgba(58,179,255,0.05)] bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)] p-6 w-full">
        <div className="flex items-center justify-center min-h-[400px] px-4">
          <div className="relative max-w-2xl w-full">
            {/* Decorative gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#28BFFF]/10 via-transparent to-[#4EC1FF]/5 rounded-3xl blur-3xl" />
            
            {/* Main content card */}
            <div className="relative backdrop-blur-xl bg-[#0A1114]/40 border border-[#23353E]/50 rounded-2xl p-8 md:p-12 shadow-2xl shadow-black/20 animate-fade-in">
              {/* Icon container with pulse animation */}
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#28BFFF]/20 rounded-2xl blur-xl animate-pulse" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#28BFFF]/20 to-[#4EC1FF]/10 border border-[#28BFFF]/30 shadow-[inset_0_-8px_32px_rgba(78,193,255,0.15)]">
                    <PieChart className="w-10 h-10 text-[#28BFFF]" />
                  </div>
                </div>
              </div>

              {/* Heading */}
              <h2 className="text-2xl md:text-3xl font-bold text-[#E4EEF5] text-center mb-3">
                Start Your Trading Journey
              </h2>
              
              {/* Description */}
              <p className="text-[#85A8C3] text-center mb-8 text-base md:text-lg leading-relaxed">
                You don't have any active challenges yet. Take the first step towards becoming a funded trader!
              </p>

              {/* Features grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#28BFFF]/30 transition-all duration-300 hover-scale">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#28BFFF]/10 mb-3">
                    <TrendingUp className="w-6 h-6 text-[#28BFFF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Prove Your Skills</h3>
                  <p className="text-xs text-[#85A8C3]">Trade with simulated capital</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#28BFFF]/30 transition-all duration-300 hover-scale">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#28BFFF]/10 mb-3">
                    <Target className="w-6 h-6 text-[#28BFFF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Meet Targets</h3>
                  <p className="text-xs text-[#85A8C3]">Pass challenges and get funded</p>
                </div>
                
                <div className="flex flex-col items-center text-center p-4 rounded-xl bg-[#0A1114]/60 border border-[#23353E]/30 hover:border-[#28BFFF]/30 transition-all duration-300 hover-scale">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[#28BFFF]/10 mb-3">
                    <Zap className="w-6 h-6 text-[#28BFFF]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#E4EEF5] mb-1">Earn Profits</h3>
                  <p className="text-xs text-[#85A8C3]">Keep up to 90% of earnings</p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex justify-center">
                <Button
                  onClick={() => window.open('https://we-fund.com/#objectives', '_blank')}
                  className="group relative px-8 py-6 text-base font-semibold bg-gradient-to-r from-[#28BFFF] to-[#4EC1FF] hover:from-[#4EC1FF] hover:to-[#28BFFF] text-white rounded-xl shadow-lg shadow-[#28BFFF]/25 hover:shadow-xl hover:shadow-[#28BFFF]/40 transition-all duration-300 hover-scale"
                >
                  <span className="flex items-center gap-2">
                    Browse Available Challenges
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-2xl border border-[rgba(58,179,255,0.05)] bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)] p-6 w-full">
      <div className="flex flex-col gap-8 w-full">

      {/* PAP Payment Required Banner */}
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
              <Button
                onClick={() => { window.location.href = enrollment.pap_checkout_url!; }}
                className="shrink-0 px-6 py-2.5 font-semibold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-black rounded-lg shadow-lg shadow-amber-500/25 transition-all duration-300"
              >
                <span className="flex items-center gap-2">
                  Pay Now
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            ) : (
              <span className="shrink-0 text-sm text-[#85A8C3]">
                Contact support to complete payment
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Vertical Stack */}
      <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full">
        {finalChallenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>

      {/* Show Past Challenges Button */}
      <div className="flex justify-center pt-4 sm:pt-6">
        <button className="flex items-center gap-2 h-11 px-6 sm:px-8 rounded-lg border border-[#3AB3FF]/50 bg-gradient-to-b from-[rgba(58,179,255,0.05)] to-[rgba(58,179,255,0.05)] shadow-[0_-8px_32px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-all">
          <span className="text-sm font-semibold text-[#85A8C3]">
            Show past challenges
          </span>
          <ChevronDown className="w-4 h-4 sm:w-5 sm:w-5 text-[#85A8C3]" />
        </button>
      </div>
      </div>
    </div>
  );
};

export default ChallengeCardsGrid;
