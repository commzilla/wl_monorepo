
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/layout/PageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import ChallengeProductCard from '@/components/challenges/ChallengeProductCard';
import ChallengeProductSearch from '@/components/challenges/ChallengeProductSearch';
import ChallengeProductFilters from '@/components/challenges/ChallengeProductFilters';
import AddChallengeProductDialog from '@/components/challenges/AddChallengeProductDialog';
import { challengeService } from '@/services/challengeService';
import { toast } from '@/hooks/use-toast';

const ChallengeProducts = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState<{
    challengeType?: string;
    isActive?: boolean;
  }>({});

  const { data: challengeProducts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['challengeProducts'],
    queryFn: async () => {
      console.log('Fetching challenge products from API...');
      try {
        const products = await challengeService.getChallengeProducts();
        console.log('Challenge products loaded:', products);
        return products;
      } catch (error) {
        console.error('Error fetching challenge products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load challenge products',
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  const filteredProducts = React.useMemo(() => {
    return challengeProducts.filter(product => {
      // Search filter
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Challenge type filter
      const matchesType = !filters.challengeType || product.challenge_type === filters.challengeType;

      // Active status filter
      const matchesActive = filters.isActive === undefined || product.is_active === filters.isActive;

      return matchesSearch && matchesType && matchesActive;
    });
  }, [challengeProducts, searchQuery, filters]);

  const handleProductAdded = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader 
          title="Challenge Products"
          subtitle="Manage challenge product offerings"
          actions={<AddChallengeProductDialog onSuccess={handleProductAdded} />}
        />
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading challenge products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader 
          title="Challenge Products"
          subtitle="Manage challenge product offerings"
          actions={<AddChallengeProductDialog onSuccess={handleProductAdded} />}
        />
        <div className="text-center py-8">
          <p className="text-muted-foreground text-red-500">Error loading challenge products. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Challenge Products"
        subtitle="Manage challenge product offerings"
        actions={<AddChallengeProductDialog onSuccess={handleProductAdded} />}
      />
      
      <ChallengeProductSearch 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <ChallengeProductFilters
        selectedFilters={filters}
        onFilterChange={setFilters}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">No challenge products found matching your criteria.</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <ChallengeProductCard 
              key={product.id} 
              product={product} 
              onUpdate={refetch}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ChallengeProducts;
