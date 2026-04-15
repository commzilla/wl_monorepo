import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Search, Mail, AlertCircle, CheckCircle, RefreshCw, Send, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface MigrationLog {
  id: string;
  batch_id: string;
  email: string;
  username: string;
  challenge_name: string;
  account_size: string;
  currency: string;
  broker_type: string;
  mt5_account_id: string;
  mt5_password: string;
  mt5_investor_password: string;
  payout_config_type: string;
  success: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface Filters {
  batch_id: string;
  email: string;
  username: string;
  challenge_name: string;
  payout_config_type: string;
  success: string;
  broker_type: string;
  mt5_account_id: string;
  created_at_after: string;
  created_at_before: string;
}

const MigrationLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<Filters>({
    batch_id: '',
    email: '',
    username: '',
    challenge_name: '',
    payout_config_type: '',
    success: '',
    broker_type: '',
    mt5_account_id: '',
    created_at_after: '',
    created_at_before: ''
  });
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  const [searchQuery, setSearchQuery] = useState('');
  

  // Fetch migration logs
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['migration-logs', filters, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'created_at_after') {
            params.append('created_at__gte', value);
          } else if (key === 'created_at_before') {
            params.append('created_at__lte', value);
          } else {
            params.append(key, value);
          }
        }
      });
      
      // Add search
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await apiService.get<MigrationLog[]>(`/admin/migration/logs/?${params.toString()}`);
      if (response.status === 200) {
        return response.data || [];
      }
      throw new Error('Failed to fetch migration logs');
    }
  });

  // Send emails mutation
  const sendEmailsMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const response = await apiService.post('/admin/migration/send-emails/', { batch_id: batchId });
      if (response.status === 200) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to send emails');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Emails Sent Successfully",
        description: `Sent to ${data.sent?.length || 0} users. Failed: ${data.failed?.length || 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ['migration-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Sending Emails",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    setFilters(prev => ({ ...prev, created_at_after: date ? format(date, 'yyyy-MM-dd') : '' }));
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    setFilters(prev => ({ ...prev, created_at_before: date ? format(date, 'yyyy-MM-dd') : '' }));
  };

  const clearFilters = () => {
    setFilters({
      batch_id: '',
      email: '',
      username: '',
      challenge_name: '',
      payout_config_type: '',
      success: '',
      broker_type: '',
      mt5_account_id: '',
      created_at_after: '',
      created_at_before: ''
    });
    setSearchQuery('');
  };

  const handleSendEmails = (batchId: string) => {
    sendEmailsMutation.mutate(batchId);
  };

  // Group logs by batch_id
  const groupedLogs = React.useMemo(() => {
    if (!logs) return {};
    
    const groups: { [key: string]: MigrationLog[] } = {};
    logs.forEach(log => {
      if (!groups[log.batch_id]) {
        groups[log.batch_id] = [];
      }
      groups[log.batch_id].push(log);
    });
    
    return groups;
  }, [logs]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Migration Logs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage migration logs and send user emails</p>
        </div>
      </div>


      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search across email, username, challenge name, notes, MT5 account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Batch ID</label>
              <Input
                placeholder="Filter by batch ID"
                value={filters.batch_id}
                onChange={(e) => handleFilterChange('batch_id', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                placeholder="Filter by email"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Username</label>
              <Input
                placeholder="Filter by username"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Challenge Name</label>
              <Input
                placeholder="Filter by challenge"
                value={filters.challenge_name}
                onChange={(e) => handleFilterChange('challenge_name', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Success Status</label>
              <Select value={filters.success || 'all'} onValueChange={(value) => handleFilterChange('success', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Success</SelectItem>
                  <SelectItem value="false">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Payout Config</label>
              <Select value={filters.payout_config_type || 'all'} onValueChange={(value) => handleFilterChange('payout_config_type', value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Broker Type</label>
              <Input
                placeholder="Filter by broker"
                value={filters.broker_type}
                onChange={(e) => handleFilterChange('broker_type', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">MT5 Account ID</label>
              <Input
                placeholder="Filter by MT5 account"
                value={filters.mt5_account_id}
                onChange={(e) => handleFilterChange('mt5_account_id', e.target.value)}
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                Created After
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={handleDateFromChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                Created Before
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={handleDateToChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results by Batch */}
      <div className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load migration logs. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading logs...</span>
            </CardContent>
          </Card>
        ) : logs && logs.length > 0 ? (
          Object.entries(groupedLogs).map(([batchId, batchLogs]) => {
            const successfulLogs = batchLogs.filter(log => log.success);
            const failedLogs = batchLogs.filter(log => !log.success);
            
            return (
              <Card key={batchId}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 flex-wrap">
                        <span>Batch: {batchId.split('-')[0]}...</span>
                        <Badge variant="outline">{batchLogs.length} entries</Badge>
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {successfulLogs.length} successful, {failedLogs.length} failed
                        {batchLogs[0] && ` • Created ${format(new Date(batchLogs[0].created_at), 'MMM dd, yyyy HH:mm')}`}
                      </p>
                    </div>
                    {successfulLogs.length > 0 && (
                      <Button
                        onClick={() => handleSendEmails(batchId)}
                        disabled={sendEmailsMutation.isPending}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        {sendEmailsMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        Send Emails ({successfulLogs.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Challenge</TableHead>
                          <TableHead>Account Size</TableHead>
                          <TableHead>Broker</TableHead>
                          <TableHead>MT5 Account</TableHead>
                          <TableHead>Payout Config</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant={log.success ? "default" : "destructive"}>
                                {log.success ? (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                )}
                                {log.success ? 'Success' : 'Failed'}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.email}</TableCell>
                            <TableCell>{log.username}</TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {log.challenge_name}
                            </TableCell>
                            <TableCell>
                              {log.account_size} {log.currency}
                            </TableCell>
                            <TableCell>{log.broker_type}</TableCell>
                            <TableCell>{log.mt5_account_id}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {log.payout_config_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {log.notes}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No migration logs found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MigrationLogs;