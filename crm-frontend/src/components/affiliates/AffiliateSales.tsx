
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Loader2, DollarSign, User, Calendar, Eye, TrendingUp, Plus, MoreHorizontal, Edit, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import { AffiliateReferral } from '@/services/affiliateService';
import ReferralFilters from './ReferralFilters';
import ReferralDialog from './ReferralDialog';

interface AffiliateSalesProps {
  sales: AffiliateReferral[] | undefined;
  summary?: {
    total_referrals: number;
    total_commission: number;
    by_status: Array<{
      commission_status: string;
      count: number;
      total: number;
    }>;
  };
  pagination?: {
    count: number;
    next: string | null;
    previous: string | null;
    currentPage: number;
    totalPages: number;
  };
  isLoading: boolean;
  onFiltersChange: (filters: any) => void;
  onPageChange: (page: number) => void;
  onCreateReferral: (data: Partial<AffiliateReferral>) => Promise<void>;
  onUpdateReferral: (id: string, data: Partial<AffiliateReferral>) => Promise<void>;
  onDeleteReferral: (id: string) => Promise<void>;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const AffiliateSales = React.memo<AffiliateSalesProps>(({ 
  sales, 
  summary,
  pagination,
  isLoading, 
  onFiltersChange,
  onPageChange,
  onCreateReferral,
  onUpdateReferral,
  onDeleteReferral,
  isCreating = false,
  isUpdating = false,
  isDeleting = false
}) => {
  const [editingReferral, setEditingReferral] = React.useState<AffiliateReferral | null>(null);
  const [deletingReferral, setDeletingReferral] = React.useState<AffiliateReferral | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  if (isLoading) {
    return (
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Affiliate Sales & Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCommissionStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{status}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleEdit = (referral: AffiliateReferral) => {
    setEditingReferral(referral);
  };

  const handleDelete = (referral: AffiliateReferral) => {
    setDeletingReferral(referral);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingReferral) {
      await onDeleteReferral(deletingReferral.id);
      setShowDeleteDialog(false);
      setDeletingReferral(null);
    }
  };

  return (
    <div className="space-y-4">
      <ReferralFilters onFiltersChange={onFiltersChange} />
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold">{summary.total_referrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Commission</p>
                  <p className="text-2xl font-bold">${summary.total_commission}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Eye className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">By Status</p>
                  <div className="flex gap-2 mt-1">
                    {summary.by_status.map((status, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {status.commission_status}: {status.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card className="glass-card border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Affiliate Sales & Referrals
            </CardTitle>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Referral
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !sales || sales.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No Sales/Referrals Data</p>
            </div>
          ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Referred User</TableHead>
                  <TableHead>Challenge</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(sales) && sales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/10">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{sale.affiliate_username}</span>
                          <p className="text-xs text-muted-foreground">{sale.affiliate_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{sale.referred_username}</span>
                          {sale.referred_email && (
                            <p className="text-xs text-muted-foreground">{sale.referred_email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-primary font-medium">{sale.challenge_name}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          ${sale.commission_amount.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCommissionStatusBadge(sale.commission_status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(sale.date_referred).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.note ? (
                        <span className="text-sm text-muted-foreground">{sale.note}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(sale)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(sale)}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.count} total items)
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => pagination.currentPage > 1 && onPageChange(pagination.currentPage - 1)}
                      className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(pagination.totalPages - 4, pagination.currentPage - 2)) + i;
                    if (page > pagination.totalPages) return null;
                    
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => onPageChange(page)}
                          isActive={page === pagination.currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => pagination.currentPage < pagination.totalPages && onPageChange(pagination.currentPage + 1)}
                      className={pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </Card>

      <ReferralDialog
        open={showCreateDialog || !!editingReferral}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingReferral(null);
          }
        }}
        referral={editingReferral}
        onSubmit={editingReferral ? 
          (data) => onUpdateReferral(editingReferral.id, data) : 
          onCreateReferral
        }
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Referral</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this referral? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

AffiliateSales.displayName = 'AffiliateSales';

export default AffiliateSales;
