import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchIcon } from 'lucide-react';

interface IPSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const IPSearch: React.FC<IPSearchProps> = ({ searchQuery, onSearchChange }) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce the search query updates
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChange(localSearchQuery);
    }, 500); // 0.5 second delay for IP search

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, onSearchChange]);

  // Update local state when external searchQuery changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by IP address, account number, or email..."
            className="pl-10"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default IPSearch;
