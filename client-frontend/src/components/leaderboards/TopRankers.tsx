
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import PodiumCard from "./PodiumCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { fetchLeaderboard } from '@/utils/api';
import { Loader2 } from 'lucide-react';

const TopRankers = () => {
  const { data: leaderboardData, isLoading, error } = useQuery({
    queryKey: ['leaderboard-top3', 1, 3],
    queryFn: () => fetchLeaderboard(1, 3),
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-[#28BFFF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 text-center">
        <p className="text-[#E4EEF5]">Failed to load top rankers data</p>
      </div>
    );
  }

  const topTraders = leaderboardData?.results || [];

  // Get top 3 traders or use defaults if not enough data
  const getTraderData = (rank: number) => {
    const trader = topTraders.find(t => t.place === rank);
    if (trader) {
      return {
        name: trader.username,
        equity: `$ ${trader.equity.toLocaleString()}`,
        winRate: `${trader.won_trade_percent}%`,
        avatarUrl: trader.profile_picture || "/placeholder.svg"
      };
    }
    
    // Fallback data if not enough traders
    return {
      name: "Name Surname",
      equity: "$ 212 000",
      winRate: "66%",
      avatarUrl: "/placeholder.svg"
    };
  };

  const firstPlace = getTraderData(1);
  const secondPlace = getTraderData(2);
  const thirdPlace = getTraderData(3);

  return (
    <div>
      {/* Podium Display for larger screens */}
      <div className="hidden lg:flex flex-col lg:flex-row items-end justify-center gap-8 lg:gap-4 w-full">
        {/* 2nd Place */}
        <div className="order-2 lg:order-1 flex-shrink-0">
          <PodiumCard
            rank={2}
            name={secondPlace.name}
            equity={secondPlace.equity}
            winRate={secondPlace.winRate}
            avatarUrl={secondPlace.avatarUrl}
            className="transform transition-all duration-300 hover:scale-105 hover:rotate-1"
          />
        </div>

        {/* 1st Place - Elevated */}
        <div className="order-1 lg:order-2 flex-shrink-0 lg:transform lg:scale-110 lg:-translate-y-8">
          <PodiumCard
            rank={1}
            name={firstPlace.name}
            equity={firstPlace.equity}
            winRate={firstPlace.winRate}
            avatarUrl={firstPlace.avatarUrl}
            className="transform transition-all duration-300 hover:scale-105"
          />
        </div>

        {/* 3rd Place */}
        <div className="order-3 lg:order-3 flex-shrink-0">
          <PodiumCard
            rank={3}
            name={thirdPlace.name}
            equity={thirdPlace.equity}
            winRate={thirdPlace.winRate}
            avatarUrl={thirdPlace.avatarUrl}
            className="transform transition-all duration-300 hover:scale-105 hover:-rotate-1"
          />
        </div>
      </div>

      {/* Carousel for smaller screens */}
      <div className="lg:hidden">
        <Carousel
          opts={{
            align: "start",
          }}
          className="w-full"
        >
          <CarouselContent>
            <CarouselItem>
              <div className="p-1">
                <PodiumCard
                  rank={1}
                  name={firstPlace.name}
                  equity={firstPlace.equity}
                  winRate={firstPlace.winRate}
                  avatarUrl={firstPlace.avatarUrl}
                  className="transform transition-all duration-300 hover:scale-105"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <PodiumCard
                  rank={2}
                  name={secondPlace.name}
                  equity={secondPlace.equity}
                  winRate={secondPlace.winRate}
                  avatarUrl={secondPlace.avatarUrl}
                  className="transform transition-all duration-300 hover:scale-105 hover:rotate-1"
                />
              </div>
            </CarouselItem>
            <CarouselItem>
              <div className="p-1">
                <PodiumCard
                  rank={3}
                  name={thirdPlace.name}
                  equity={thirdPlace.equity}
                  winRate={thirdPlace.winRate}
                  avatarUrl={thirdPlace.avatarUrl}
                  className="transform transition-all duration-300 hover:scale-105 hover:-rotate-1"
                />
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  );
};

export default TopRankers;
