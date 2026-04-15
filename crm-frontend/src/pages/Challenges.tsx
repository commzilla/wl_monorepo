import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Loader2, User, Calendar, Target, Shield, TrendingUp, Trophy, Eye, EyeOff, Copy, ChevronLeft, ChevronRight, FileText, Plus, MoreHorizontal, Edit, Trash2, Settings, Info, Download } from 'lucide-react';
import { challengeService, ChallengeEnrollmentFilters, ChallengeEnrollment, ChallengeEnrollmentResponse, ChallengeOverview, LatestBreach, Challenge } from '@/services/challengeService';
import ChallengeEnrollmentDialog from '@/components/challenges/ChallengeEnrollmentDialog';
import DeleteChallengeEnrollmentDialog from '@/components/challenges/DeleteChallengeEnrollmentDialog';
import BreachDetailsDialog from '@/components/challenges/BreachDetailsDialog';
import { ChallengeExportDialog } from '@/components/challenges/ChallengeExportDialog';

type ChallengeStatus =
  | 'active'
  | 'phase_1_in_progress'
  | 'phase_1_passed'
  | 'awaiting_payment'
  | 'phase_2_in_progress'
  | 'phase_2_passed'
  | 'live_in_progress'
  | 'completed'
  | 'failed'
  | 'payout_limit_reached'
  | 'all';

const Challenges = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeType, setChallengeType] = useState<string>('all');
  const [challengeId, setChallengeId] = useState<string>('all');
  const [status, setStatus] = useState<ChallengeStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ChallengeEnrollmentFilters>({});
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeEnrollment | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showMt5Password, setShowMt5Password] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);
  
  // CRUD dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<ChallengeEnrollment | null>(null);
  const [deletingEnrollment, setDeletingEnrollment] = useState<ChallengeEnrollment | null>(null);
  
  // Breach dialog states
  const [selectedBreach, setSelectedBreach] = useState<LatestBreach | null>(null);
  const [isBreachDialogOpen, setIsBreachDialogOpen] = useState(false);
  
  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Fetch challenge types for filter dropdown
  const { data: challengesList } = useQuery({
    queryKey: ['challenges-list'],
    queryFn: () => challengeService.getChallenges(),
    staleTime: 10 * 60 * 1000,
  });

  // Update filters when search/filter values change
  useEffect(() => {
    const newFilters: ChallengeEnrollmentFilters = {};

    if (searchQuery.trim()) {
      newFilters.search = searchQuery.trim();
    }

    if (status !== 'all') {
      newFilters.status = status;
    }

    if (challengeId !== 'all') {
      newFilters.challenge__id = Number(challengeId);
    } else if (challengeType !== 'all') {
      newFilters.challenge__step_type = challengeType;
    }

    newFilters.page = currentPage;
    newFilters.page_size = 10;

    setFilters(newFilters);
  }, [searchQuery, status, challengeType, challengeId, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, status, challengeType, challengeId]);

  // Fetch challenge enrollments
  const { 
    data: challengeData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['challenge-enrollments', filters],
    queryFn: () => challengeService.getChallengeEnrollments(filters),
  });

  // Handle the API response format correctly
  let challenges: ChallengeEnrollment[] = [];
  let overview = { total_challenges: 0, active: 0, live: 0, failed: 0 };
  let totalCount = 0;
  let hasNextPage = false;
  let hasPreviousPage = false;

  if (challengeData) {
    console.log('Challenge data received:', challengeData);
    
    if (Array.isArray(challengeData)) {
      // Old API format - direct array
      challenges = challengeData;
      totalCount = challenges.length;
    } else if (challengeData && typeof challengeData === 'object') {
      // New API format - nested structure
      // The actual challenges array is at challengeData.results.results
      // The overview data is at challengeData.results.overview
      challenges = Array.isArray(challengeData.results?.results) ? challengeData.results.results : [];
      overview = challengeData.results?.overview || overview;
      totalCount = challengeData.count || challenges.length;
      hasNextPage = !!challengeData.next;
      hasPreviousPage = !!challengeData.previous;
    }
  }
  
  console.log('Processed challenges (should be array):', challenges, 'Array check:', Array.isArray(challenges));

  // Helper function to get status badge
  const getStatusBadge = (status: string, breach?: LatestBreach | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'phase_1_in_progress':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Phase 1 - In Progress</Badge>;
      case 'phase_1_passed':
        return <Badge variant="warning">Phase 1 - Passed</Badge>;
      case 'awaiting_payment':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Awaiting Payment</Badge>;
      case 'phase_2_in_progress':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Phase 2 - In Progress</Badge>;
      case 'phase_2_passed':
        return <Badge variant="warning">Phase 2 - Passed</Badge>;
      case 'live_in_progress':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Live - In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'payout_limit_reached':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Payout Limit Reached</Badge>;
      case 'failed':
        // Get previous status from breach data if available
        let previousStatusText = '';
        if (breach?.previous_state?.status) {
          const prevStatus = breach.previous_state.status;
          if (prevStatus === 'live_in_progress') {
            previousStatusText = 'Live - ';
          } else if (prevStatus === 'phase_1_in_progress' || prevStatus === 'phase_1_passed') {
            previousStatusText = 'Phase 1 - ';
          } else if (prevStatus === 'phase_2_in_progress' || prevStatus === 'phase_2_passed') {
            previousStatusText = 'Phase 2 - ';
          }
        }
        
        return (
          <div className="flex items-center gap-1.5">
            {breach && (
              <Info 
                className="h-4 w-4 text-red-500 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBreach(breach);
                  setIsBreachDialogOpen(true);
                }}
              />
            )}
            <Badge className="bg-red-500 hover:bg-red-600">
              {previousStatusText}Failed
            </Badge>
          </div>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const handleViewBreach = (breach: LatestBreach) => {
    setSelectedBreach(breach);
    setIsBreachDialogOpen(true);
  };

  // Helper function to get progress text based on status
  const getProgressText = (status: string, completedDate: string | null): string => {
    switch (status) {
      case 'phase_1_passed':
        return 'Phase 1 Completed';
      case 'awaiting_payment':
        return 'Awaiting Payment';
      case 'phase_2_passed':
        return 'Phase 2 Completed';
      case 'live_in_progress':
        return 'Live Trading in Progress';
      case 'completed':
        return 'Challenge Completed';
      case 'phase_1_in_progress':
        return 'Phase 1 In Progress';
      case 'phase_2_in_progress':
        return 'Phase 2 In Progress';
      case 'failed':
        return 'Challenge Failed';
      case 'payout_limit_reached':
        return 'Payout Limit Reached';
      default:
        return status;
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setChallengeType('all');
    setChallengeId('all');
    setStatus('all');
  };

  const handleViewDetails = (challenge: ChallengeEnrollment) => {
    setSelectedChallenge(challenge);
    setIsDetailsDialogOpen(true);
    setShowMt5Password(false);
    setShowInvestorPassword(false);
  };

  const getPhaseIcon = (phaseType: string) => {
    switch (phaseType) {
      case 'phase-1':
        return <Target className="h-4 w-4" />;
      case 'phase-2':
        return <TrendingUp className="h-4 w-4" />;
      case 'live-trader':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phaseType: string) => {
    switch (phaseType) {
      case 'phase-1':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'phase-2':
        return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'live-trader':
        return 'bg-green-500/10 text-green-700 border-green-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleCreateNew = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (enrollment: ChallengeEnrollment) => {
    setEditingEnrollment(enrollment);
  };

  const handleDelete = (enrollment: ChallengeEnrollment) => {
    setDeletingEnrollment(enrollment);
  };

  const handleDialogSuccess = () => {
    refetch();
    setEditingEnrollment(null);
  };

  if (error) {
    return (
      <div>
        <PageHeader 
          title="Challenges" 
          subtitle="Manage trader challenges and progress"
        />
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error loading challenges: {error.message}</p>
              <Button onClick={() => refetch()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Challenges" 
        subtitle="Manage trader challenges and progress"
      />
      
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Filter Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trader name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={challengeType} onValueChange={(value) => { setChallengeType(value); if (value !== 'all') setChallengeId('all'); }}>
              <SelectTrigger>
                <SelectValue placeholder="Step Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Step Types</SelectItem>
                <SelectItem value="1-step">1-Step</SelectItem>
                <SelectItem value="2-step">2-Step</SelectItem>
              </SelectContent>
            </Select>

            <Select value={challengeId} onValueChange={(value) => { setChallengeId(value); if (value !== 'all') setChallengeType('all'); }}>
              <SelectTrigger>
                <SelectValue placeholder="Challenge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Challenges</SelectItem>
                {challengesList?.map((ch) => (
                  <SelectItem key={ch.id} value={ch.id.toString()}>
                    {ch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(value) => setStatus(value as ChallengeStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="phase_1_in_progress">Phase 1 - In Progress</SelectItem>
                <SelectItem value="phase_1_passed">Phase 1 - Passed</SelectItem>
                <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                <SelectItem value="phase_2_in_progress">Phase 2 - In Progress</SelectItem>
                <SelectItem value="phase_2_passed">Phase 2 - Passed</SelectItem>
                <SelectItem value="live_in_progress">Live - In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="payout_limit_reached">Payout Limit Reached</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleResetFilters}>
              <Filter className="mr-2" size={16} />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Overview Cards - Hidden per user request */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-md">
                <Trophy className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Challenges</p>
                <p className="text-lg font-semibold">{overview.total_challenges}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/10 rounded-md">
                <Target className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Challenges</p>
                <p className="text-lg font-semibold">{overview.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-md">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live Trading</p>
                <p className="text-lg font-semibold">{overview.live}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-md">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed Challenges</p>
                <p className="text-lg font-semibold">{overview.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}
      
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="text-lg font-semibold">
              Enrollments ({totalCount})
              {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin inline" />}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setIsExportDialogOpen(true)} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {!isMobile && 'Export'}
              </Button>
              <Button onClick={handleCreateNew} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {isMobile ? 'New' : 'Create Enrollment'}
              </Button>
              {!isMobile && (
                <Button onClick={() => navigate('/bulk-challenge-enrollments')} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Bulk Enrollments
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Loading challenges...</p>
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No challenges found matching your filters
            </div>
          ) : isMobile ? (
            /* Mobile: Card-based layout */
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <Card key={challenge.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{challenge.client_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{challenge.client_email}</div>
                    </div>
                    {getStatusBadge(challenge.status, challenge.latest_breach)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground">Challenge</span>
                      <div className="font-medium text-xs">{challenge.challenge.name}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Account Size</span>
                      <div className="font-medium text-xs">{challenge.account_size} {challenge.currency}</div>
                    </div>
                    {challenge.mt5_account_id && (
                      <div>
                        <span className="text-xs text-muted-foreground">MT5</span>
                        <div className="font-mono text-xs">{challenge.mt5_account_id}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-muted-foreground">Start</span>
                      <div className="text-xs">{new Date(challenge.start_date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => navigate(`/enrollment-review/${challenge.id}`)}>
                      <Settings className="mr-1 h-3 w-3" />
                      Manager
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(challenge)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(challenge)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actions</TableHead>
                  <TableHead>Trader</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Challenge</TableHead>
                  <TableHead>Balance / Account Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Live/Breach Date</TableHead>
                  <TableHead>MT5 Account</TableHead>
                  <TableHead className="text-right">More</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {challenges.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/enrollment-review/${challenge.id}`)}
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Manager
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{challenge.client_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{challenge.client_email}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(challenge.client_email, 'Email')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{challenge.challenge.name}</span>
                        <div className="text-sm text-muted-foreground">
                          {challenge.challenge.step_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {challenge.current_balance ? (
                          <span className="font-medium">{challenge.current_balance} / {challenge.account_size} {challenge.currency}</span>
                        ) : (
                          <>
                            <span className="font-medium">{challenge.account_size} {challenge.currency}</span>
                            <div className="text-sm text-muted-foreground">Account Size</div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(challenge.status, challenge.latest_breach)}</TableCell>
                    <TableCell>{new Date(challenge.start_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {challenge.status === 'failed' ? (
                        challenge.updated_at ? (
                          <div>
                            <div className="font-medium">{new Date(challenge.updated_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">Breach Date</div>
                          </div>
                        ) : '-'
                      ) : challenge.status === 'live_in_progress' ? (
                        challenge.live_start_date ? (
                          <div>
                            <div className="font-medium">{new Date(challenge.live_start_date).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">Live Date</div>
                          </div>
                        ) : '-'
                      ) : (
                        challenge.completed_date ? (
                          <div>
                            <div className="font-medium">{new Date(challenge.completed_date).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">Completion Date</div>
                          </div>
                        ) : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {challenge.mt5_account_id ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{challenge.mt5_account_id}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(challenge.mt5_account_id!, 'MT5 Account')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {challenge.broker_type?.toUpperCase() || 'MT5'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(challenge)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(challenge)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}
          {totalCount > 10 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {Math.ceil(totalCount / 10)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!hasPreviousPage || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!hasNextPage || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Challenge Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Challenge Enrollment Details
              </DialogTitle>
              {selectedChallenge && (
                <Button
                  onClick={() => navigate(`/enrollment-review/${selectedChallenge.id}`)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Review Full Information
                </Button>
              )}
            </div>
          </DialogHeader>
          
          {selectedChallenge && (
            <div className="space-y-6 animate-fade-in">
              {/* Client Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="text-sm font-semibold">{selectedChallenge.client_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm">{selectedChallenge.client_email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Challenge Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Challenge Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Challenge Name</label>
                      <p className="text-sm font-semibold">{selectedChallenge.challenge.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Type</label>
                      <p className="text-sm">{selectedChallenge.challenge.step_type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge variant={selectedChallenge.challenge.is_active ? "default" : "secondary"}>
                          {selectedChallenge.challenge.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Account Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Size</label>
                      <p className="text-sm font-semibold">{selectedChallenge.account_size} {selectedChallenge.currency}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedChallenge.status)}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Progress</label>
                      <p className="text-sm">{getProgressText(selectedChallenge.status, selectedChallenge.completed_date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MT5 Integration Details */}
              {selectedChallenge.mt5_account_id && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">MT5 Account Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">MT5 Account ID</label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{selectedChallenge.mt5_account_id}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(selectedChallenge.mt5_account_id!, 'Account ID')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Broker Type</label>
                        <p className="text-sm">{selectedChallenge.broker_type?.toUpperCase() || 'MT5'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                        <Badge variant={selectedChallenge.is_active ? "default" : "secondary"}>
                          {selectedChallenge.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    {/* MT5 Passwords */}
                    {(selectedChallenge.mt5_password || selectedChallenge.mt5_investor_password) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        {selectedChallenge.mt5_password && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">MT5 Password</label>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono">
                                {showMt5Password ? selectedChallenge.mt5_password : '••••••••••••'}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowMt5Password(!showMt5Password)}
                                className="h-6 w-6 p-0"
                              >
                                {showMt5Password ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedChallenge.mt5_password!, 'MT5 Password')}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {selectedChallenge.mt5_investor_password && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">MT5 Investor Password</label>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-mono">
                                {showInvestorPassword ? selectedChallenge.mt5_investor_password : '••••••••••••'}
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowInvestorPassword(!showInvestorPassword)}
                                className="h-6 w-6 p-0"
                              >
                                {showInvestorPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(selectedChallenge.mt5_investor_password!, 'MT5 Investor Password')}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                      <p className="text-sm font-semibold">{new Date(selectedChallenge.start_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Completion Date</label>
                      <p className="text-sm">
                        {selectedChallenge.completed_date 
                          ? new Date(selectedChallenge.completed_date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : 'Not completed yet'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Challenge Phases */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Challenge Phases</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedChallenge.challenge.phases && selectedChallenge.challenge.phases.length > 0 ? (
                    <div className="space-y-4">
                      {selectedChallenge.challenge.phases.map((phase, index) => (
                        <div
                          key={phase.id}
                          className={`p-4 rounded-lg border ${getPhaseColor(phase.phase_type)} transition-colors`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getPhaseIcon(phase.phase_type)}
                              <span className="font-medium text-sm capitalize">
                                {phase.phase_type === 'phase-1' ? 'Phase 1' : 
                                 phase.phase_type === 'phase-2' ? 'Phase 2' : 'Live Trader'}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {phase.trading_period}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">Profit Target:</span>
                              <span className="ml-1 font-medium">
                                {phase.profit_target ? `${phase.profit_target}%` : 'No target'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Daily Loss:</span>
                              <span className="ml-1 font-medium">{phase.max_daily_loss}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Max Total Loss:</span>
                              <span className="ml-1 font-medium">{phase.max_loss}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Min Trading Days:</span>
                              <span className="ml-1 font-medium">{phase.min_trading_days}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No phases configured for this challenge</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes Section */}
              {selectedChallenge.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedChallenge.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Challenge Enrollment Dialog */}
      <ChallengeEnrollmentDialog
        enrollment={editingEnrollment}
        open={isCreateDialogOpen || !!editingEnrollment}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingEnrollment(null);
          }
        }}
        onSuccess={handleDialogSuccess}
      />

      {/* Delete Challenge Enrollment Dialog */}
      <DeleteChallengeEnrollmentDialog
        enrollment={deletingEnrollment}
        open={!!deletingEnrollment}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingEnrollment(null);
          }
        }}
        onSuccess={handleDialogSuccess}
      />

      {/* Breach Details Dialog */}
      <BreachDetailsDialog
        breach={selectedBreach}
        open={isBreachDialogOpen}
        onOpenChange={setIsBreachDialogOpen}
      />

      {/* Export Dialog */}
      <ChallengeExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
      />
    </div>
  );
};

export default Challenges;
