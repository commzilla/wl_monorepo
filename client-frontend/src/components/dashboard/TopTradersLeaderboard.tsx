import React from "react";
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchLeaderboard } from '@/utils/api';

// Interfaces
export interface Trader {
  id: string;
  name: string;
  avatar: string;
  startingBalance: number;
  totalPaidOut: number;
  equityGrowth: number;
  rank: number;
}

export interface TopTradersLeaderboardProps {
  traders?: Trader[];
  currentUserId?: string;
  onViewAll?: () => void;
}

// Trophy/Laurel Icon Component
const LeaderboardIcon = () => (
  <div className="w-11 h-11 flex items-center justify-center rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/10 shadow-[0_0_16px_rgba(58,179,255,0.12),0_-8px_32px_rgba(58,179,255,0.06)_inset]">
    <img
      src="/leaderboard-icon.svg"
      alt="Top Traders"
      className="w-9 h-auto"
    />
  </div>
);



// Trader Row Component with new layout structure
interface TraderRowProps {
  trader: Trader;
  isCurrentUser?: boolean;
  hasGradientBg?: boolean;
}

const TraderRow: React.FC<TraderRowProps> = ({
  trader,
  isCurrentUser = false,
  hasGradientBg = false,
}) => {
  const getRowBackground = () => {
    if (hasGradientBg) {
      switch (trader.rank) {
        case 1:
          return "linear-gradient(269deg, rgba(249, 216, 120, 0.00) 0.54%, rgba(249, 216, 120, 0.50) 80.39%)";
        case 2:
          return "linear-gradient(269deg, rgba(201, 205, 221, 0.00) 0.54%, rgba(201, 205, 221, 0.50) 80.39%)";
        case 3:
          return "linear-gradient(269deg, rgba(212, 158, 127, 0.00) 0.54%, rgba(212, 158, 127, 0.50) 80.39%)";
        case 5:
          return isCurrentUser
            ? "linear-gradient(269deg, rgba(25, 172, 255, 0.00) 0.54%, rgba(25, 172, 255, 0.50) 80.39%)"
            : "";
        default:
          return "";
      }
    }
    return "";
  };

  return (
    <div className="w-full rounded-lg border border-[#1081C7] bg-[#0B1C1F] bg-gradient-to-bl from-[#23353E1F] to-transparent shadow-[0_0_30px_rgba(16,129,199,0.1)] relative">
      {/* Desktop/tablet row */}
      <div className="hidden md:flex items-center gap-4 py-3 px-4 w-full">
        {hasGradientBg && (
          <div
            className="absolute left-0 top-0 w-full h-full opacity-30 rounded-lg"
            style={{ background: getRowBackground() }}
          />
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0 relative z-10">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(40,191,255,0.1)] border border-[#28BFFF] flex-shrink-0">
            <span className="text-sm font-semibold text-[#E4EEF5]">
              {trader.rank}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={trader.avatar}
                alt={trader.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-sm font-medium text-[#E4EEF5] truncate">
              {trader.name}
            </div>
          </div>
        </div>
        <div className="text-right flex-1 min-w-0 relative z-10">
          <div className="text-sm font-semibold text-[#456074]">
            ${trader.startingBalance.toLocaleString()}
          </div>
        </div>
        <div className="text-right flex-1 min-w-0 relative z-10">
          <div className="text-sm font-semibold text-[#85A8C3]">
            ${trader.totalPaidOut.toLocaleString()}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 flex-1 min-w-0 relative z-10">
          {trader.equityGrowth >= 0 ? (
            <ArrowUp className="w-4 h-4 text-[#85A8C3] flex-shrink-0" />
          ) : (
            <ArrowDown className="w-4 h-4 text-[#85A8C3] flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-[#85A8C3]">
            {trader.equityGrowth}%
          </span>
        </div>
      </div>

      {/* Mobile stacked row */}
      <div className="flex md:hidden flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(40,191,255,0.1)] border border-[#28BFFF] flex-shrink-0">
            <span className="text-sm font-semibold text-[#E4EEF5]">{trader.rank}</span>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover" />
          </div>
          <div className="text-sm font-medium text-[#E4EEF5] truncate">{trader.name}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#456074]">Starting Balance</div>
            <div className="text-sm font-semibold text-[#456074]">${trader.startingBalance.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#456074]">Total Paid Out</div>
            <div className="text-sm font-semibold text-[#85A8C3]">${trader.totalPaidOut.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[11px] text-[#456074]">Equity Growth</div>
            <div className="flex items-center gap-1 text-sm font-semibold text-[#85A8C3]">
              {trader.equityGrowth >= 0 ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              {trader.equityGrowth}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Header Row Component
const HeaderRow = () => (
  <div className="hidden md:flex items-center gap-4 py-2 px-4 w-full">
    {/* Place & Trader Column Header */}
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-[#85A8C3]">
        Place & Trader
      </div>
    </div>

    {/* Starting Balance Column Header */}
    <div className="text-right flex-1 min-w-0">
      <div className="text-sm font-semibold text-[#85A8C3]">
        Starting Balance
      </div>
    </div>

    {/* Total Paid Out Column Header */}
    <div className="text-right flex-1 min-w-0">
      <div className="text-sm font-semibold text-[#85A8C3]">
        Total Paid Out
      </div>
    </div>

    {/* Equity Growth Column Header */}
    <div className="text-right flex-1 min-w-0">
      <div className="text-sm font-semibold text-[#85A8C3]">
        Equity Growth
      </div>
    </div>
  </div>
);

// Main Component
const TopTradersLeaderboard: React.FC<TopTradersLeaderboardProps> = ({
  traders = [],
  currentUserId,
  onViewAll,
}) => {
  // Fetch leaderboard data from API
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['leaderboard', 1, 10], // First page, 10 items
    queryFn: () => fetchLeaderboard(1, 10),
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Transform API data to match the component's expected format
  const transformedTraders = leaderboardData?.results.map(entry => ({
    id: entry.place.toString(),
    name: entry.username,
    avatar: entry.profile_picture || "https://we-fund.b-cdn.net/img/default-avatar.svg",
    startingBalance: entry.equity, // Using equity as starting balance
    totalPaidOut: entry.profit, // Using profit as total paid out
    equityGrowth: entry.growth_percentage,
    rank: entry.place,
  })) || [];

  // Use API data if available, otherwise fall back to passed traders or empty array
  const traderData = transformedTraders.length > 0 ? transformedTraders : traders;
  const leftColumnTraders = traderData.slice(0, 5);
  const rightColumnTraders = traderData.slice(5, 10);

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(58,179,255,0.05)] bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)] p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[#28BFFF]" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-2xl border border-[rgba(58,179,255,0.05)] bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)] p-6">
        <div className="flex items-center justify-center h-48 text-center">
          <p className="text-[#E4EEF5]">Failed to load leaderboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(58,179,255,0.05)] bg-[#3AB3FF]/10 shadow-[0_0_30px_rgba(58,179,255,0.08)] p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center w-full mb-6 md:mb-8">
        <div className="flex items-center gap-3">
          <LeaderboardIcon />
          <h2 className="text-lg md:text-xl font-medium leading-normal tracking-[-0.72px] text-[#E4EEF5]">
            Top Traders
          </h2>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <Link
            to="/leaderboards"
            className="flex items-center justify-center gap-2 h-9 md:h-11 px-3 py-2 md:py-3 rounded-lg border border-[#28BFFF] bg-[rgba(40,191,255,0.05)] shadow-[0_-8px_32px_rgba(78,193,255,0.06)_inset] hover:shadow-[0_0_20px_rgba(40,191,255,0.2)] transition-all"
          >
            <span className="text-xs md:text-sm font-semibold text-[#85A8C3] text-shadow-[0_0_5px_rgba(0,0,0,0.20)]">
              View all
            </span>
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#85A8C3]" />
          </Link>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="flex flex-col gap-6 w-full p-4 md:p-6 rounded-xl border border-[rgba(16,129,199,0.05)] bg-[#0B1C1F] bg-gradient-to-bl from-[#23353E1F] to-transparent shadow-[0_0_30px_rgba(16,129,199,0.1)]">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Left Column (Ranks 1-5) */}
          <div className="flex flex-col gap-4">
            <HeaderRow />
            <div className="flex flex-col gap-3">
              {leftColumnTraders.map((trader) => (
                <TraderRow
                  key={trader.id}
                  trader={trader}
                  isCurrentUser={currentUserId === trader.id}
                  hasGradientBg={
                    trader.rank <= 3 ||
                    (trader.rank === 5 && currentUserId === trader.id)
                  }
                />
              ))}
            </div>
          </div>

          {/* Right Column (Ranks 6-10) */}
          <div className="flex flex-col gap-4">
            <HeaderRow />
            <div className="flex flex-col gap-3">
              {rightColumnTraders.map((trader) => (
                <TraderRow
                  key={trader.id}
                  trader={trader}
                  isCurrentUser={currentUserId === trader.id}
                  hasGradientBg={false}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopTradersLeaderboard;

