
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ChallengeProductFiltersProps {
  selectedFilters: {
    challengeType?: string;
    isActive?: boolean;
  };
  onFilterChange: (filters: { challengeType?: string; isActive?: boolean }) => void;
}

const ChallengeProductFilters: React.FC<ChallengeProductFiltersProps> = ({
  selectedFilters,
  onFilterChange,
}) => {
  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(selectedFilters).some(value => value !== undefined);

  return (
    <div className="flex flex-wrap gap-4 mb-6 items-center">
      <Select
        value={selectedFilters.challengeType || ""}
        onValueChange={(value) => 
          onFilterChange({ 
            ...selectedFilters, 
            challengeType: value || undefined 
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Challenge Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one_step">1-Step</SelectItem>
          <SelectItem value="two_step">2-Step</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={selectedFilters.isActive !== undefined ? selectedFilters.isActive.toString() : ""}
        onValueChange={(value) => 
          onFilterChange({ 
            ...selectedFilters, 
            isActive: value ? value === "true" : undefined 
          })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
};

export default ChallengeProductFilters;
