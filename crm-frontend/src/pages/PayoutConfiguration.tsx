
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit, Trash2, Settings, Calendar, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import PageHeader from '@/components/layout/PageHeader';
import PayoutConfigDialog from '@/components/payouts/PayoutConfigDialog';

interface PayoutConfigData {
  id: string;
  enrollment: string;
  client_name: string;
  client_email: string;
  challenge_name: string;
  mt5_account_id: string;
  account_size: number;
  config_type: 'default' | 'custom';
  live_trading_start_date: string;
  profit_share_percent: string | null;
  payment_cycle: 'monthly' | 'biweekly' | 'custom_days' | 'custom_interval';
  custom_cycle_days: number | null;
  custom_payout_days: number[] | null;
  first_payout_delay_days: number | null;
  subsequent_cycle_days: number | null;
  min_net_amount: string | null;
  base_share_percent: string | null;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
  trader_share_percent: number | null;
}

const PayoutConfiguration = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentCycleFilter, setPaymentCycleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PayoutConfigData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['payout-configs'],
    queryFn: async () => {
      const response = await apiService.get<PayoutConfigData[]>('/payout-configs/');
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(`/payout-configs/${id}/`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-configs'] });
      toast({
        title: "Success",
        description: "Payout configuration deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = (config.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (config.client_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (config.mt5_account_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (config.challenge_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (config.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPaymentCycle = paymentCycleFilter === 'all' || config.payment_cycle === paymentCycleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && config.is_active) ||
                         (statusFilter === 'inactive' && !config.is_active);
    
    return matchesSearch && matchesPaymentCycle && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredConfigs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedConfigs = filteredConfigs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentCycleFilter, statusFilter]);

  const handleEdit = (config: PayoutConfigData) => {
    setEditingConfig(config);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this payout configuration?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingConfig(null);
  };

  const getPaymentCycleBadge = (cycle: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      monthly: "default",
      biweekly: "secondary",
      custom_days: "outline",
      custom_interval: "outline",
    };
    const labels: Record<string, string> = {
      monthly: "Monthly",
      biweekly: "Biweekly", 
      custom_days: "Custom Days",
      custom_interval: "Custom Interval",
    };
    return <Badge variant={variants[cycle] || "default"}>{labels[cycle] || cycle}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPercentage = (value: string | null | undefined) => {
    if (!value) return 'Policy Driven';
    const parsed = parseFloat(value);
    return isNaN(parsed) ? '0.00%' : `${parsed.toFixed(2)}%`;
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Payout Configuration"
        subtitle="Manage trader payout configurations and profit sharing settings"
        actions={
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus size={16} />
            Add Configuration
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{configs.length}</p>
                  <p className="text-sm text-muted-foreground">Total Configs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{configs.filter(c => c.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active Configs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Percent className="h-8 w-8 text-blue-600" />
                <div>
                   <p className="text-2xl font-bold">
                     {configs.length > 0 
                       ? (configs.reduce((sum, c) => {
                           if (!c.profit_share_percent) return sum; // Skip policy-driven configs
                           const parsed = parseFloat(c.profit_share_percent);
                           return sum + (isNaN(parsed) ? 0 : parsed);
                         }, 0) / configs.filter(c => c.profit_share_percent).length).toFixed(1)
                       : '0'
                     }%
                   </p>
                  <p className="text-sm text-muted-foreground">Avg Profit Share</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{configs.filter(c => c.payment_cycle === 'monthly').length}</p>
                  <p className="text-sm text-muted-foreground">Monthly Cycles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter size={20} />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search by trader, email, MT5 ID, challenge..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={paymentCycleFilter} onValueChange={setPaymentCycleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Payment Cycle" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Cycles</SelectItem>
                   <SelectItem value="monthly">Monthly</SelectItem>
                   <SelectItem value="biweekly">Biweekly</SelectItem>
                   <SelectItem value="custom_days">Custom Days</SelectItem>
                   <SelectItem value="custom_interval">Custom Interval</SelectItem>
                 </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Configurations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payout Configurations ({totalItems})</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-20">
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
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : paginatedConfigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payout configurations found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                     <TableRow>
                       <TableHead>Trader</TableHead>
                       <TableHead>MT5 Account</TableHead>
                       <TableHead>Challenge</TableHead>
                       <TableHead>Account Size</TableHead>
                       <TableHead>Config Type</TableHead>
                       <TableHead>Start Date</TableHead>
                       <TableHead>Payment Cycle</TableHead>
                       <TableHead>Trader Share %</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                   <TableBody>
                     {paginatedConfigs.map((config) => (
                       <TableRow key={config.id}>
                         <TableCell>
                           <div>
                             <div className="font-medium">{config.client_name}</div>
                             <div className="text-xs text-muted-foreground">{config.client_email}</div>
                           </div>
                         </TableCell>
                         <TableCell className="font-mono text-sm">
                           {config.mt5_account_id}
                         </TableCell>
                         <TableCell>
                           {config.challenge_name}
                         </TableCell>
                         <TableCell className="font-mono">
                           ${(config.account_size ?? 0).toLocaleString()}
                         </TableCell>
                         <TableCell>
                           <Badge variant={config.config_type === 'custom' ? "secondary" : "default"}>
                             {config.config_type === 'custom' ? 'Custom' : 'Policy'}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           {formatDate(config.live_trading_start_date)}
                         </TableCell>
                         <TableCell>
                           {getPaymentCycleBadge(config.payment_cycle)}
                         </TableCell>
                         <TableCell className="font-medium">
                           {config.trader_share_percent != null 
                             ? `${config.trader_share_percent.toFixed(2)}%`
                             : 'N/A'}
                         </TableCell>
                         <TableCell>
                           <Badge variant={config.is_active ? "default" : "secondary"}>
                             {config.is_active ? 'Active' : 'Inactive'}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-2">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleEdit(config)}
                             >
                               <Edit size={16} />
                             </Button>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleDelete(config.id)}
                               className="text-destructive hover:text-destructive"
                             >
                               <Trash2 size={16} />
                             </Button>
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </div>

               {/* Pagination Controls */}
               {totalPages > 1 && (
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t">
                   <div className="text-xs sm:text-sm text-muted-foreground">
                     Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                   </div>
                   <div className="flex flex-wrap items-center gap-2">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage(1)}
                       disabled={currentPage === 1}
                       className="hidden sm:inline-flex"
                     >
                       First
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                       disabled={currentPage === 1}
                     >
                       Previous
                     </Button>
                     <div className="flex items-center gap-1">
                       {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         let pageNum;
                         if (totalPages <= 5) {
                           pageNum = i + 1;
                         } else if (currentPage <= 3) {
                           pageNum = i + 1;
                         } else if (currentPage >= totalPages - 2) {
                           pageNum = totalPages - 4 + i;
                         } else {
                           pageNum = currentPage - 2 + i;
                         }
                         return (
                           <Button
                             key={pageNum}
                             variant={currentPage === pageNum ? "default" : "outline"}
                             size="sm"
                             onClick={() => setCurrentPage(pageNum)}
                             className="w-10"
                           >
                             {pageNum}
                           </Button>
                         );
                       })}
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                       disabled={currentPage === totalPages}
                     >
                       Next
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setCurrentPage(totalPages)}
                       disabled={currentPage === totalPages}
                       className="hidden sm:inline-flex"
                     >
                       Last
                     </Button>
                   </div>
                 </div>
               )}
             </>
            )}
          </CardContent>
        </Card>
      </div>

      <PayoutConfigDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        config={editingConfig}
      />
    </div>
  );
};

export default PayoutConfiguration;
