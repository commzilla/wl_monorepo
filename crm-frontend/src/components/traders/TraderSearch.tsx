
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface TraderSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const TraderSearch: React.FC<TraderSearchProps> = ({ searchQuery, onSearchChange }) => {
  const { t } = useLanguage();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce the search query updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange(localSearchQuery);
    }, 1500); // 1.5 second delay

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, onSearchChange]);

  // Update local state when external searchQuery changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('traders.searchPlaceholder')}
            className="pl-10"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default TraderSearch;
