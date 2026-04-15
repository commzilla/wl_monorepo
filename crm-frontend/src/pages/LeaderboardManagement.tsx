import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Search, Pencil, Users, ShieldCheck, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  leaderboardManagementService,
  type LeaderboardTrader,
  type LeaderboardFilters,
} from '@/services/leaderboardManagementService';

const LeaderboardManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<LeaderboardFilters>({
    visibility: 'all',
    live_only: false,
    search: '',
    page: 1,
    page_size: 25,
  });

  const [searchInput, setSearchInput] = useState('');
  const [editTrader, setEditTrader] = useState<LeaderboardTrader | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard-management', filters],
    queryFn: () => leaderboardManagementService.getTraders(filters),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, hidden }: { userId: string; hidden: boolean }) =>
      leaderboardManagementService.updateTrader(userId, { hidden_from_leaderboard: hidden }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-management'] });
      toast({
        title: 'Updated',
        description: result.hidden_from_leaderboard
          ? 'Trader hidden from leaderboard'
          : 'Trader is now visible on leaderboard',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const displayNameMutation = useMutation({
    mutationFn: ({ userId, name }: { userId: string; name: string | null }) =>
      leaderboardManagementService.updateTrader(userId, { leaderboard_display_name: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-management'] });
      toast({ title: 'Updated', description: 'Display name updated' });
      setEditTrader(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const openEditDialog = (trader: LeaderboardTrader) => {
    setEditTrader(trader);
    setEditDisplayName(trader.leaderboard_display_name || '');
  };

  const handleSaveDisplayName = () => {
    if (!editTrader) return;
    displayNameMutation.mutate({
      userId: editTrader.user_id,
      name: editDisplayName.trim() || null,
    });
  };

  const stats = data?.stats;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Leaderboard Management"
        subtitle="Control which traders appear on public leaderboards and manage display names"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Traders</p>
                <p className="text-2xl font-bold">{stats?.total ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Visible</p>
                <p className="text-2xl font-bold">{stats?.visible ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldOff className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Hidden</p>
                <p className="text-2xl font-bold">{stats?.hidden ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1">
              <Label className="mb-2 block text-sm">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label className="mb-2 block text-sm">Visibility</Label>
              <Select
                value={filters.visibility}
                onValueChange={(val) =>
                  setFilters((prev) => ({ ...prev, visibility: val as any, page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Checkbox
                id="live-only"
                checked={filters.live_only}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({ ...prev, live_only: !!checked, page: 1 }))
                }
              />
              <Label htmlFor="live-only" className="text-sm cursor-pointer whitespace-nowrap">
                Live accounts only
              </Label>
            </div>
            <Button onClick={handleSearch} className="w-full sm:w-auto">Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Display Name Override</TableHead>
                    <TableHead>Live Account</TableHead>
                    <TableHead>Visible</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No traders found
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.results?.map((trader) => (
                    <TableRow key={trader.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <img
                            src={trader.profile_picture || 'https://we-fund.b-cdn.net/img/default-avatar.svg'}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                          <span className="font-medium">{trader.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{trader.email}</TableCell>
                      <TableCell>
                        {trader.leaderboard_display_name ? (
                          <Badge variant="secondary">{trader.leaderboard_display_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {trader.has_live_account ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Live</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!trader.hidden_from_leaderboard}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({
                                userId: trader.user_id,
                                hidden: !checked,
                              })
                            }
                          />
                          {trader.hidden_from_leaderboard ? (
                            <EyeOff className="h-4 w-4 text-red-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(trader)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Pagination */}
              {data && data.total_pages > 1 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {data.current_page} of {data.total_pages} ({data.total_results} results)
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.current_page <= 1}
                      onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.current_page >= data.total_pages}
                      onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Display Name Dialog */}
      <Dialog open={!!editTrader} onOpenChange={(open) => !open && setEditTrader(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Display Name</DialogTitle>
            <DialogDescription>
              Set a custom display name for {editTrader?.full_name} on the leaderboard. Leave blank to use their real name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leaderboard Display Name</Label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Leave empty to use real name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrader(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDisplayName}
              disabled={displayNameMutation.isPending}
            >
              {displayNameMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaderboardManagement;
