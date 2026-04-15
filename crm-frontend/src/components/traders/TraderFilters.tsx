import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { getCountryNameSafe } from '@/lib/utils/countryUtils';

interface TraderFiltersProps {
  selectedFilters: {
    kycStatus?: string;
    country?: string;
    challengeStatus?: string;
  };
  onFilterChange: (filters: { kycStatus?: string; country?: string; challengeStatus?: string }) => void;
  availableCountries: string[];
}

const TraderFilters: React.FC<TraderFiltersProps> = ({ 
  selectedFilters, 
  onFilterChange, 
  availableCountries 
}) => {
  const { t } = useLanguage();

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...selectedFilters };
    if (value === 'all') {
      delete newFilters[key as keyof typeof newFilters];
    } else {
      newFilters[key as keyof typeof newFilters] = value;
    }
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(selectedFilters).length > 0;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 flex flex-wrap gap-4">
            <div className="min-w-[200px]">
              <Select
                value={selectedFilters.kycStatus || 'all'}
                onValueChange={(value) => handleFilterChange('kycStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by KYC Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All KYC Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="not_submitted">Not Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
              <Select
                value={selectedFilters.country || 'all'}
                onValueChange={(value) => handleFilterChange('country', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {availableCountries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {getCountryNameSafe(country)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[200px]">
              <Select
                value={selectedFilters.challengeStatus || 'all'}
                onValueChange={(value) => handleFilterChange('challengeStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Challenge Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Challenge Status</SelectItem>
                  <SelectItem value="active">Has Active Challenges</SelectItem>
                  <SelectItem value="completed">Completed Challenges</SelectItem>
                  <SelectItem value="none">No Challenges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(selectedFilters).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="flex items-center gap-1">
                {key}: {key === 'country' ? getCountryNameSafe(value) : value}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange(key, 'all')}
                />
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TraderFilters;
