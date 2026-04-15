import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Trophy, ChevronLeft, ChevronRight, Loader2, Medal } from 'lucide-react';
import { fetchCompetitionLeaderboard, CompetitionLeaderboardResponse } from '@/utils/api';

interface CompetitionLeaderboardProps {
  competitionId: string;
  competitionStatus?: string;
  startAt?: string;
  endAt?: string;
}

const CompetitionLeaderboard: React.FC<CompetitionLeaderboardProps> = ({ 
  competitionId,
  competitionStatus,
  startAt,
  endAt
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Derive status from dates if not provided
  const derivedStatus = React.useMemo(() => {
    if (competitionStatus) return competitionStatus;
    
    const now = new Date();
    const start = startAt ? new Date(startAt) : null;
    const end = endAt ? new Date(endAt) : null;
    
    if (start && end) {
      if (now < start) return 'upcoming';
      if (now > end) return 'ended';
      return 'ongoing';
    }
    return 'ongoing'; // Default to ongoing if dates not available
  }, [competitionStatus, startAt, endAt]);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['competition-leaderboard', competitionId, debouncedSearch, page],
    queryFn: () => fetchCompetitionLeaderboard(competitionId, debouncedSearch, page),
    enabled: derivedStatus === 'ongoing' || derivedStatus === 'ended',
  });

  // Only show leaderboard for ongoing or ended competitions
  if (derivedStatus !== 'ongoing' && derivedStatus !== 'ended') {
    return null;
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-[#FFD700]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-[#C0C0C0]" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-[#CD7F32]" />;
    return <span className="text-[#85A8C3]">{rank}</span>;
  };

  const getRankBgColor = (rank: number) => {
    if (rank === 1) return 'bg-[#FFD700]/10 border-[#FFD700]/30';
    if (rank === 2) return 'bg-[#C0C0C0]/10 border-[#C0C0C0]/30';
    if (rank === 3) return 'bg-[#CD7F32]/10 border-[#CD7F32]/30';
    return '';
  };

  const totalPages = data ? Math.ceil(data.count / 25) : 0;

  return (
    <Card className="bg-[#0B1622]/80 border-[#1E3A5F]/50 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/20">
            <Trophy className="w-5 h-5 text-[#3AB3FF]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#E4EEF5]">Leaderboard</h3>
            {data && (
              <p className="text-sm text-[#85A8C3]">{data.total_participants} participants</p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#85A8C3]" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[#0B1622] border-[#1E3A5F] text-[#E4EEF5] placeholder:text-[#85A8C3]/50 focus:border-[#3AB3FF]"
          />
        </div>
      </div>

      {/* Sticky User Rank */}
      {data?.my_rank && (
        <div className="mb-4 p-3 rounded-lg bg-[#3AB3FF]/10 border border-[#3AB3FF]/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#3AB3FF]/20 text-[#3AB3FF] border-[#3AB3FF]/30">
              Your Position
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#E4EEF5] font-bold text-lg">#{data.my_rank}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#3AB3FF] animate-spin" />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="text-center py-12">
          <p className="text-[#85A8C3]">Failed to load leaderboard</p>
        </div>
      )}

      {/* Table */}
      {data && !isLoading && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E3A5F]/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#85A8C3]">Rank</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[#85A8C3]">Name</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[#85A8C3]">Trades</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-[#85A8C3]">Growth %</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[#85A8C3]">
                      No rankings found
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => {
                    const isCurrentUser = data.my_rank === row.rank;
                    return (
                      <tr 
                        key={row.rank}
                        className={`
                          border-b border-[#1E3A5F]/30 transition-colors
                          ${isCurrentUser ? 'bg-[#3AB3FF]/10 border-l-2 border-l-[#3AB3FF]' : 'hover:bg-[#1E3A5F]/20'}
                          ${getRankBgColor(row.rank)}
                        `}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center w-8 h-8">
                            {getRankIcon(row.rank)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-sm font-medium ${isCurrentUser ? 'text-[#3AB3FF]' : 'text-[#E4EEF5]'}`}>
                            {row.name}
                            {isCurrentUser && <span className="ml-2 text-xs text-[#3AB3FF]">(You)</span>}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-[#E4EEF5]">{row.total_trades}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-medium ${Number(row.growth_percent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(row.growth_percent) >= 0 ? '+' : ''}{Number(row.growth_percent).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1E3A5F]/50">
              <span className="text-sm text-[#85A8C3]">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-[#1E3A5F] text-[#E4EEF5] bg-[#0B1622] hover:bg-[#1E3A5F]/50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-[#1E3A5F] text-[#E4EEF5] bg-[#0B1622] hover:bg-[#1E3A5F]/50 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default CompetitionLeaderboard;
