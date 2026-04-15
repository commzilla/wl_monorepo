
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TopTradersTable from "./TopTradersTable";
import { fetchLeaderboard } from '@/utils/api';
import { Loader2 } from 'lucide-react';

const TopTraders = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['leaderboard', currentPage, itemsPerPage],
    queryFn: () => fetchLeaderboard(currentPage, itemsPerPage),
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-[#28BFFF]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
        <div className="flex items-center justify-center h-48 text-center">
          <p className="text-[#E4EEF5]">Failed to load leaderboard data</p>
        </div>
      </div>
    );
  }

  // Transform API data to match the component's expected format
  const transformedTraders = leaderboardData?.results.map(entry => ({
    id: entry.place.toString(),
    name: entry.username,
    avatar: entry.profile_picture || "/placeholder.svg",
    equity: entry.equity,
    growthPercentage: entry.growth_percentage,
    profit: entry.profit,
    wonTradePercent: entry.won_trade_percent,
  })) || [];

  const totalPages = Math.ceil((leaderboardData?.count || 0) / itemsPerPage);

  return (
    <div className="rounded-2xl border border-[rgba(40,191,255,0.05)] bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)] p-6">
      <TopTradersTable
        traders={transformedTraders}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={leaderboardData?.count || 0}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
};

export default TopTraders;
