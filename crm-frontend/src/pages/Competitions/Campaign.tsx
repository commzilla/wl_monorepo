import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Trophy, Calendar, Users, DollarSign, Play, Square, Send, Pencil, Trash2, Eye } from 'lucide-react';
import { competitionService, Competition } from '@/services/competitionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import CampaignDialog from '@/components/competitions/CampaignDialog';
import CampaignDetailDialog from '@/components/competitions/CampaignDetailDialog';

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'draft':
      return 'secondary';
    case 'upcoming':
      return 'outline';
    case 'ongoing':
      return 'default';
    case 'ended':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const Campaign = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ id: string; action: 'publish' | 'start' | 'end' } | null>(null);

  const { data: competitions, isLoading } = useQuery({
    queryKey: ['competitions'],
    queryFn: () => competitionService.getCompetitions(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => competitionService.deleteCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast({ title: 'Competition deleted successfully' });
      setDeleteConfirmId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete competition', description: error.message, variant: 'destructive' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => competitionService.publishCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast({ title: 'Competition published successfully' });
      setActionConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to publish competition', description: error.message, variant: 'destructive' });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => competitionService.forceStartCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast({ title: 'Competition started successfully' });
      setActionConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to start competition', description: error.message, variant: 'destructive' });
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => competitionService.endCompetition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast({ title: 'Competition ended successfully' });
      setActionConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to end competition', description: error.message, variant: 'destructive' });
    },
  });

  const handleAction = () => {
    if (!actionConfirm) return;
    
    switch (actionConfirm.action) {
      case 'publish':
        publishMutation.mutate(actionConfirm.id);
        break;
      case 'start':
        startMutation.mutate(actionConfirm.id);
        break;
      case 'end':
        endMutation.mutate(actionConfirm.id);
        break;
    }
  };

  const getActionLabel = () => {
    if (!actionConfirm) return '';
    switch (actionConfirm.action) {
      case 'publish':
        return 'Publish';
      case 'start':
        return 'Start';
      case 'end':
        return 'End';
    }
  };

  const stats = React.useMemo(() => {
    if (!competitions) return { total: 0, draft: 0, upcoming: 0, ongoing: 0, ended: 0 };
    return {
      total: competitions.length,
      draft: competitions.filter(c => c.status === 'draft').length,
      upcoming: competitions.filter(c => c.status === 'upcoming').length,
      ongoing: competitions.filter(c => c.status === 'ongoing').length,
      ended: competitions.filter(c => c.status === 'ended').length,
    };
  }, [competitions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">Manage trading competitions and campaigns</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ongoing</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ongoing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ended</CardTitle>
            <Square className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ended}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Challenge</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Entry Type</TableHead>
                  <TableHead>Prize Pool</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No campaigns found. Create your first campaign to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  competitions?.map((competition) => (
                    <TableRow key={competition.id}>
                      <TableCell className="font-medium">{competition.title}</TableCell>
                      <TableCell>
                        {competition.challenge_detail ? (
                          <span className="text-sm">
                            {competition.challenge_detail.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{competition.organizer_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {competition.entry_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">{competition.prize_pool_text}</TableCell>
                      <TableCell>{format(new Date(competition.start_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(competition.end_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(competition.status)} className="capitalize">
                          {competition.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border">
                            <DropdownMenuItem onClick={() => {
                              setSelectedCompetition(competition);
                              setIsDetailDialogOpen(true);
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {competition.status !== 'ended' && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedCompetition(competition);
                                setIsEditDialogOpen(true);
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {competition.status === 'draft' && (
                              <DropdownMenuItem onClick={() => setActionConfirm({ id: competition.id, action: 'publish' })}>
                                <Send className="mr-2 h-4 w-4" />
                                Publish
                              </DropdownMenuItem>
                            )}
                            {competition.status === 'upcoming' && (
                              <DropdownMenuItem onClick={() => setActionConfirm({ id: competition.id, action: 'start' })}>
                                <Play className="mr-2 h-4 w-4" />
                                Force Start
                              </DropdownMenuItem>
                            )}
                            {competition.status !== 'ended' && (
                              <DropdownMenuItem 
                                onClick={() => setActionConfirm({ id: competition.id, action: 'end' })}
                                className="text-destructive"
                              >
                                <Square className="mr-2 h-4 w-4" />
                                End Now
                              </DropdownMenuItem>
                            )}
                            {competition.status === 'draft' && (
                              <DropdownMenuItem 
                                onClick={() => setDeleteConfirmId(competition.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CampaignDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        competition={null}
      />

      <CampaignDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedCompetition(null);
        }}
        competition={selectedCompetition}
      />

      {/* Detail Dialog */}
      <CampaignDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false);
          setSelectedCompetition(null);
        }}
        competition={selectedCompetition}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action Confirmation */}
      <AlertDialog open={!!actionConfirm} onOpenChange={() => setActionConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getActionLabel()} Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {getActionLabel().toLowerCase()} this campaign?
              {actionConfirm?.action === 'end' && ' This will mark the competition as ended.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              {getActionLabel()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Campaign;
