
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { offerService } from '@/services/offerService';
import { Offer } from '@/lib/types/offer';
import { OfferDialog } from '@/components/offers/OfferDialog';
import { OfferDetailsDialog } from '@/components/offers/OfferDetailsDialog';
import { OfferFilters } from '@/components/offers/OfferFilters';
import { OfferCard } from '@/components/offers/OfferCard';
import PageHeader from '@/components/layout/PageHeader';

const Offers = () => {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { toast } = useToast();
  const { isAdmin, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const { data: offers = [], isLoading, error } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const response = await offerService.getOffers();
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => offerService.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({
        title: "Success",
        description: "Offer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete offer",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (offer: Offer) => {
    if (window.confirm(`Are you sure you want to delete "${offer.title}"?`)) {
      deleteMutation.mutate(offer.id!);
    }
  };

  const getOfferStatus = (offer: Offer) => {
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);
    
    if (!offer.is_active) return 'disabled';
    if (endDate < now) return 'expired';
    if (startDate > now) return 'upcoming';
    return 'active';
  };

  const filteredAndSortedOffers = useMemo(() => {
    let filtered = offers.filter(offer => {
      // Search filter
      const matchesSearch = !searchQuery || 
        offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        offer.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const offerStatus = getOfferStatus(offer);
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && offerStatus === 'active') ||
        (statusFilter === 'inactive' && (offerStatus === 'disabled' || offerStatus === 'upcoming')) ||
        (statusFilter === 'expired' && offerStatus === 'expired');

      return matchesSearch && matchesStatus;
    });

    // Sort offers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'oldest':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'end-date':
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [offers, searchQuery, statusFilter, sortBy]);

  const activeOffers = offers.filter(offer => getOfferStatus(offer) === 'active').length;

  if (!hasPermission('orders.view')) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading offers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Failed to load offers. Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4">
        <PageHeader
          title="Offers Management"
          subtitle="Create, manage, and track your promotional offers and discount campaigns"
          actions={
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Offer
            </Button>
          }
        />

        <OfferFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalOffers={offers.length}
          activeOffers={activeOffers}
        />

        {filteredAndSortedOffers.length > 0 ? (
          <div className={viewMode === 'grid' ?
            "grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :
            "space-y-3 sm:space-y-4"
          }>
            {filteredAndSortedOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                viewMode={viewMode}
                onView={() => {
                  setSelectedOffer(offer);
                  setIsDetailsDialogOpen(true);
                }}
                onEdit={() => {
                  setSelectedOffer(offer);
                  setIsEditDialogOpen(true);
                }}
                onDelete={() => handleDelete(offer)}
                isDeleting={deleteMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 bg-gradient-to-br from-muted/20 to-muted/40 border-dashed">
            <CardContent className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">
                {searchQuery || statusFilter !== 'all' ? 'No matching offers found' : 'No offers created yet'}
              </CardTitle>
              <CardDescription className="max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all' ? 
                  'Try adjusting your search criteria or filters to find what you\'re looking for.' :
                  'Get started by creating your first promotional offer to boost sales and engage customers.'
                }
              </CardDescription>
              {!searchQuery && statusFilter === 'all' && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Offer
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <OfferDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
      />

      {selectedOffer && (
        <>
          <OfferDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            mode="edit"
            offer={selectedOffer}
          />
          <OfferDetailsDialog
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
            offer={selectedOffer}
          />
        </>
      )}
    </div>
  );
};

export default Offers;
