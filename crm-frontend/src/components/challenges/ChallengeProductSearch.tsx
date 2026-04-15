
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface ChallengeProductSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const ChallengeProductSearch: React.FC<ChallengeProductSearchProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
      <Input
        placeholder="Search challenge products..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10"
      />
    </div>
  );
};

export default ChallengeProductSearch;
