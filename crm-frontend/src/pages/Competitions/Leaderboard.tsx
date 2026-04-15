import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Download, RefreshCw, Search, Trophy, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { competitionRegistrationService } from '@/services/competitionRegistrationService';
import { Competition } from '@/services/competitionService';
import { competitionLeaderboardService, LeaderboardEntry, LiveLeaderboardEntry, SortOption } from '@/services/competitionLeaderboardService';

type LeaderboardMode = 'snapshot' | 'live';

const Leaderboard: React.FC = () => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>('snapshot');

  // Fetch competitions list
  const { data: competitions, isLoading: isLoadingCompetitions, refetch: refetchCompetitions } = useQuery({
    queryKey: ['competitions-leaderboard-list', statusFilter],
    queryFn: () => competitionRegistrationService.getCompetitions(statusFilter === 'all' ? undefined : statusFilter),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch snapshot leaderboard for selected competition
  const { data: snapshotData, isLoading: isLoadingSnapshot, refetch: refetchSnapshot } = useQuery({
    queryKey: ['competition-leaderboard-snapshot', selectedCompetition?.id, currentPage, pageSize, sortBy],
    queryFn: () => competitionLeaderboardService.getLeaderboard(selectedCompetition!.id, currentPage, pageSize, sortBy),
    enabled: !!selectedCompetition && leaderboardMode === 'snapshot',
    staleTime: 1 * 60 * 1000,
  });

  // Fetch live leaderboard for selected competition
  const { data: liveData, isLoading: isLoadingLive, refetch: refetchLive } = useQuery({
    queryKey: ['competition-leaderboard-live', selectedCompetition?.id, currentPage, pageSize],
    queryFn: () => competitionLeaderboardService.getLiveLeaderboard(selectedCompetition!.id, currentPage, pageSize),
    enabled: !!selectedCompetition && leaderboardMode === 'live',
    staleTime: 30 * 1000, // Live data should refresh more often
  });

  const leaderboardData = leaderboardMode === 'snapshot' ? snapshotData : liveData;
  const isLoadingLeaderboard = leaderboardMode === 'snapshot' ? isLoadingSnapshot : isLoadingLive;
  const refetchLeaderboard = leaderboardMode === 'snapshot' ? refetchSnapshot : refetchLive;

  const handleModeChange = (checked: boolean) => {
    setLeaderboardMode(checked ? 'live' : 'snapshot');
    setCurrentPage(1);
  };

  const handleExportCSV = async () => {
    if (!selectedCompetition) return;
    
    try {
      const blob = await competitionLeaderboardService.exportLeaderboardCSV(selectedCompetition.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCompetition.title}_leaderboard.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Successful',
        description: 'Leaderboard CSV has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export leaderboard CSV.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numValue);
  };

  const formatPercent = (value: number | string | null) => {
    if (value === null || value === undefined) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'default';
      case 'ended':
        return 'secondary';
      case 'upcoming':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white whitespace-nowrap gap-1"><span>🥇</span><span>1st</span></Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white whitespace-nowrap gap-1"><span>🥈</span><span>2nd</span></Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-white whitespace-nowrap gap-1"><span>🥉</span><span>3rd</span></Badge>;
    return <span className="text-muted-foreground">{rank}</span>;
  };

  // Get initial balance based on mode
  const getInitialBalance = (entry: LeaderboardEntry | LiveLeaderboardEntry) => {
    if (leaderboardMode === 'live') {
      return (entry as LiveLeaderboardEntry).initial_balance;
    }
    return (entry as LeaderboardEntry).mt5_initial_balance;
  };

  // Filter leaderboard entries by search
  const filteredEntries = leaderboardData?.results.filter(entry =>
    entry.trader_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.trader_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.mt5_login?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Selected competition leaderboard view
  if (selectedCompetition) {
    return (
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-0 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setSelectedCompetition(null); setCurrentPage(1); }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Trophy className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-500" />
                {selectedCompetition.title} - Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">
                {leaderboardData?.total_participants || 0} participants
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Snapshot/Live Switch */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <Label htmlFor="leaderboard-mode" className={`text-sm ${leaderboardMode === 'snapshot' ? 'font-medium' : 'text-muted-foreground'}`}>
                Snapshot
              </Label>
              <Switch
                id="leaderboard-mode"
                checked={leaderboardMode === 'live'}
                onCheckedChange={handleModeChange}
              />
              <Label htmlFor="leaderboard-mode" className={`text-sm ${leaderboardMode === 'live' ? 'font-medium' : 'text-muted-foreground'}`}>
                Live
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchLeaderboard()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="default" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Mode indicator badge */}
        {leaderboardMode === 'live' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              Live Data
            </Badge>
            <span className="text-sm text-muted-foreground">Real-time MT5 equity and balance</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or MT5 login..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {leaderboardMode === 'snapshot' && (
                <Select value={sortBy} onValueChange={(value) => { setSortBy(value as SortOption); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rank">Rank</SelectItem>
                    <SelectItem value="growth">Growth %</SelectItem>
                    <SelectItem value="trades">Total Trades</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLeaderboard ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leaderboard entries found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead>MT5 Login</TableHead>
                      <TableHead className="text-right">Initial Balance</TableHead>
                      <TableHead className="text-right">Growth %</TableHead>
                      <TableHead className="text-right">Trades</TableHead>
                      <TableHead className="text-right">Equity</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={`${entry.mt5_login}-${entry.rank}`}>
                        <TableCell>{getRankBadge(entry.rank)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.trader_name}</p>
                            <p className="text-sm text-muted-foreground">{entry.trader_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{entry.mt5_login || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(getInitialBalance(entry))}</TableCell>
                        <TableCell className="text-right">
                          <span className={entry.growth_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(entry.growth_percent)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{entry.total_trades}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.equity)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.balance)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {leaderboardMode === 'snapshot' && (entry as LeaderboardEntry).captured_at 
                            ? format(new Date((entry as LeaderboardEntry).captured_at), 'MMM dd, HH:mm') 
                            : leaderboardMode === 'live' ? 'Live' : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Pagination */}
                {leaderboardData && leaderboardData.total_pages > 1 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Page {leaderboardData.current_page} of {leaderboardData.total_pages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(leaderboardData.total_pages, p + 1))}
                        disabled={currentPage === leaderboardData.total_pages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Competition list view
  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-5 sm:h-6 w-5 sm:w-6 text-yellow-500" />
            Competition Leaderboards
          </h1>
          <p className="text-sm text-muted-foreground">
            View leaderboard rankings for each competition
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchCompetitions()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select a Competition</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCompetitions ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : !competitions || competitions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No competitions found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {competitions.map((competition) => (
                <Card
                  key={competition.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedCompetition(competition)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{competition.title}</CardTitle>
                      <Badge variant={getStatusBadgeVariant(competition.status)}>
                        {competition.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{competition.max_participants} max participants</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      <span className="whitespace-pre-wrap">{competition.prize_pool_text}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(competition.start_at), 'MMM dd')} - {format(new Date(competition.end_at), 'MMM dd, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
