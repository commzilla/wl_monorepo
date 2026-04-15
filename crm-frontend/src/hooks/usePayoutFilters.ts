import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'payout-management-filters';

export interface PayoutFiltersState {
  search: string;
  status: string;
  traderEmail: string;
  traderUsername: string;
  dateFrom: string;
  dateTo: string;
  ordering: string;
}

const defaultFilters: PayoutFiltersState = {
  search: '',
  status: 'all',
  traderEmail: '',
  traderUsername: '',
  dateFrom: '',
  dateTo: '',
  ordering: '-requested_at',
};

export const usePayoutFilters = () => {
  // Initialize state from localStorage or defaults
  const [filters, setFilters] = useState<PayoutFiltersState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      console.log('[usePayoutFilters] Initializing, localStorage value:', saved);
      if (saved) {
        const parsed = { ...defaultFilters, ...JSON.parse(saved) };
        console.log('[usePayoutFilters] Using saved filters:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading payout filters from localStorage:', error);
    }
    console.log('[usePayoutFilters] Using default filters');
    return defaultFilters;
  });

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving payout filters to localStorage:', error);
    }
  }, [filters]);

  const setSearch = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
  }, []);

  const setStatus = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  }, []);

  const setTraderEmail = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, traderEmail: value }));
  }, []);

  const setTraderUsername = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, traderUsername: value }));
  }, []);

  const setDateFrom = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, dateFrom: value }));
  }, []);

  const setDateTo = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, dateTo: value }));
  }, []);

  const setOrdering = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, ordering: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    ...filters,
    setSearch,
    setStatus,
    setTraderEmail,
    setTraderUsername,
    setDateFrom,
    setDateTo,
    setOrdering,
    clearFilters,
  };
};
