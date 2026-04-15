import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Award,
  Coins,
  CreditCard,
  Eye,
  Filter,
  Layers,
  LineChart,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Ticket,
  Trophy,
  User,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';
import { eventLogService } from '@/services/eventLogService';
import { EventLog } from '@/lib/types/eventLog';
import { getCategoryLabel, getEventTypeLabel } from '@/lib/utils/eventLogUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EventLogDetailsDialog from '@/components/profile-manager/EventLogDetailsDialog';

interface EventLogsTabProps {
  traderId: string;
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories', icon: Layers },
  { value: 'account', label: 'Account', icon: User },
  { value: 'profile', label: 'Profile', icon: UserCog },
  { value: 'kyc', label: 'KYC / Verification', icon: Shield },
  { value: 'challenge', label: 'Challenge', icon: Trophy },
  { value: 'mt5', label: 'MT5 / Trading', icon: LineChart },
  { value: 'payout', label: 'Payout', icon: CreditCard },
  { value: 'certificate', label: 'Certificate', icon: Award },
  { value: 'affiliate', label: 'Affiliate', icon: Users },
  { value: 'offer', label: 'Offer / Coupon', icon: Ticket },
  { value: 'wallet', label: 'Wallet / Transaction', icon: Wallet },
  { value: 'risk', label: 'Risk / Breach', icon: AlertTriangle },
  { value: 'wecoins', label: 'WeCoins', icon: Coins },
  { value: 'security', label: 'Security', icon: ShieldAlert },
  { value: 'system', label: 'System', icon: Settings },
  { value: 'admin', label: 'Admin', icon: Shield },
] as const;

const getCategoryBadgeVariant = (category: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!category) return 'outline';

  switch (category.toLowerCase()) {
    case 'security':
    case 'risk':
      return 'destructive';
    case 'system':
    case 'admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function EventLogsTab({ traderId }: EventLogsTabProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<EventLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const selectedCategory = CATEGORY_OPTIONS.find((option) => option.value === category);

  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ['profile-manager-event-logs', traderId, category],
    queryFn: () => eventLogService.getUserEventLogs(traderId, { category: category === 'all' ? undefined : category }),
    enabled: !!traderId,
  });

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      const candidate = [
        log.description,
        log.event_type,
        log.category,
        log.user?.full_name,
        log.user?.email,
        log.challenge?.mt5_account_id,
        log.ip_address,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return candidate.includes(term);
    });
  }, [logs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[260px]">
        <div className="text-center space-y-3">
          <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading event logs...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16">
        <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-destructive">Failed to load event logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-card/70 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Event Logs</h3>
            <p className="text-xs text-muted-foreground">Audit trail for user activity, actions, and system events</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="h-6">
              Total {logs.length}
            </Badge>
            <Badge variant="outline" className="h-6">
              Showing {paginatedLogs.length}
            </Badge>
            {selectedCategory && category !== 'all' && (
              <Badge variant="outline" className="h-6 gap-1">
                <selectedCategory.icon className="h-3 w-3" />
                {selectedCategory.label}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2 w-full">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full lg:w-[260px] text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(({ value, label, icon: Icon }) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by description, event, user, email, account, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {(search || category !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              onClick={() => {
                setSearch('');
                setCategory('all');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 border border-border/60 rounded-xl bg-card/50">
          <Activity className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {logs.length === 0 ? 'No event logs found' : 'No event logs match your search'}
          </p>
          {(search || category !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearch('');
                setCategory('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 overflow-hidden bg-card/60 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User/Engine</TableHead>
                <TableHead>Challenge</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getCategoryBadgeVariant(log.category)}>
                      {getCategoryLabel(log.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium max-w-[220px]">
                    {getEventTypeLabel(log.event_type)}
                  </TableCell>
                  <TableCell>
                    {log.engine ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium capitalize">{log.engine.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">System</p>
                      </div>
                    ) : log.user ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium">{log.user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{log.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.challenge?.mt5_account_id || '-'}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {log.description || '-'}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLog(log);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
            </p>

            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[78px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {totalPages > 1 && (
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;

                      if (totalPages > 5) {
                        if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        </div>
      )}

      <EventLogDetailsDialog
        log={selectedLog}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
}
