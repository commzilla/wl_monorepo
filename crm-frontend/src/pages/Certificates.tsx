import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Download, Eye, Edit, Trash2, FileText, Image, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/apiService';
import CertificateDialog from '@/components/certificates/CertificateDialog';
import CertificateDetailsDialog from '@/components/certificates/CertificateDetailsDialog';
import GenerateCertificateDialog from '@/components/certificates/GenerateCertificateDialog';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';

interface Certificate {
  id: string;
  user: string;
  user_username: string;
  certificate_type: 'phase_pass' | 'payout';
  title: string;
  enrollment_id?: string;
  payout_id?: string;
  image_url?: string;
  pdf_url?: string;
  issued_date: string;
  expiry_date?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const Certificates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [certificateToDelete, setCertificateToDelete] = useState<Certificate | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isDiscordManager, isContentCreator, hasPermission } = useAuth();

  // Check if user has edit permissions via RBAC
  const canEdit = hasPermission('certificates.manage');

  const { data, isLoading, error } = useQuery({
    queryKey: ['certificates', currentPage],
    queryFn: async () => {
      const response = await apiService.get<{
        count: number;
        next: string | null;
        previous: string | null;
        results: Certificate[];
      }>(`/certificates2/?page=${currentPage}`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      console.log('Certificates API response:', response.data);
      
      return response.data;
    },
  });

  const certificates = data?.results || [];
  const totalCount = data?.count || 0;
  const pageSize = 10; // Default page size from API
  const totalPages = Math.ceil(totalCount / pageSize);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(`/certificates2/${id}/`);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({
        title: "Success",
        description: "Certificate deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete certificate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const filteredCertificates = Array.isArray(certificates) ? certificates.filter(cert => {
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cert.user_username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || cert.certificate_type === typeFilter;
    return matchesSearch && matchesType;
  }) : [];

  const handleEdit = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setDetailsDialogOpen(true);
  };

  const handleDelete = (certificate: Certificate) => {
    setCertificateToDelete(certificate);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (certificateToDelete) {
      deleteMutation.mutate(certificateToDelete.id);
      setDeleteDialogOpen(false);
      setCertificateToDelete(null);
    }
  };

  const handleDownload = (url: string, type: 'image' | 'pdf') => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: "Error",
        description: `No ${type} URL available for this certificate`,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (certificate: Certificate) => {
    const isExpired = certificate.expiry_date && new Date(certificate.expiry_date) < new Date();
    return (
      <Badge variant={isExpired ? "destructive" : "default"}>
        {isExpired ? "Expired" : "Active"}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      'phase_pass': 'default',
      'payout': 'secondary',
    } as const;
    
    const labels = {
      'phase_pass': 'Phase Pass',
      'payout': 'Payout',
    };
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {labels[type as keyof typeof labels] || type}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="page-container">
        <div className="text-center text-red-500">
          Error loading certificates: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Certificates"
        subtitle="Manage trader certificates including phase passes and payout certificates"
      />

      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search certificates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="phase_pass">Phase Pass</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                </SelectContent>
              </Select>
              {canEdit && (
                <Button onClick={() => setCreateDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Certificate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certificates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Certificates ({filteredCertificates.length})</CardTitle>
            <CardDescription>
              Manage all trader certificates in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading certificates...</div>
            ) : filteredCertificates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No certificates found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Trader</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issued Date</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCertificates.map((certificate) => (
                      <TableRow key={certificate.id}>
                        <TableCell>
                          <div className="font-medium">{certificate.title}</div>
                          {certificate.expiry_date && (
                            <div className="text-sm text-muted-foreground">
                              Expires: {new Date(certificate.expiry_date).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{certificate.user_username}</TableCell>
                        <TableCell>{getTypeBadge(certificate.certificate_type)}</TableCell>
                        <TableCell>{getStatusBadge(certificate)}</TableCell>
                        <TableCell>
                          {new Date(certificate.issued_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {certificate.image_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(certificate.image_url!, 'image')}
                              >
                                <Image className="h-4 w-4" />
                              </Button>
                            )}
                            {certificate.pdf_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(certificate.pdf_url!, 'pdf')}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(certificate)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(certificate)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(certificate)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {canEdit && (
        <>
          <GenerateCertificateDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />

          <CertificateDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            certificate={selectedCertificate}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
                    <AlertDialogDescription className="mt-1">
                      Are you sure you want to delete this certificate? This action cannot be undone.
                    </AlertDialogDescription>
                  </div>
                </div>
              </AlertDialogHeader>
              
              {certificateToDelete && (
                <div className="my-4 p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{certificateToDelete.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Trader: {certificateToDelete.user_username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Type: {certificateToDelete.certificate_type === 'phase_pass' ? 'Phase Pass' : 'Payout'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued: {new Date(certificateToDelete.issued_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Certificate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <CertificateDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        certificate={selectedCertificate}
      />
    </div>
  );
};

export default Certificates;
