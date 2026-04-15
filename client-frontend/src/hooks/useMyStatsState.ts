// Global state management for MyStats to prevent flickering and race conditions
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyStats } from '@/utils/api';
import { getBrowserInfo } from '@/utils/browserCompat';

interface MyStatsState {
  selectedEnrollment: any;
  isInitialized: boolean;
  isTransitioning: boolean;
}

/**
 * Centralized state management hook for MyStats page
 * Prevents race conditions and flickering by managing all enrollment-related state
 */
export function useMyStatsState() {
  const [state, setState] = useState<MyStatsState>({
    selectedEnrollment: null,
    isInitialized: false,
    isTransitioning: false,
  });
  
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const browserInfo = getBrowserInfo();
  const isFlickerProne = (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS;

  // Main query for enrollment data
  const { data: myStatsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['myStats-main', state.selectedEnrollment?.enrollment_id],
    queryFn: () => fetchMyStats(1, 100, state.selectedEnrollment?.enrollment_id),
    enabled: true, // Always enabled to get initial data
    staleTime: isFlickerProne ? 60000 : 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: isFlickerProne ? 1 : 3, // Less aggressive retry for flicker-prone environments
  });

  // Initialize enrollment when data first loads
  useEffect(() => {
    if (myStatsResponse?.results?.selected_enrollment && !state.isInitialized) {
      setState(prev => ({
        ...prev,
        selectedEnrollment: myStatsResponse.results.selected_enrollment,
        isInitialized: true,
      }));
    }
  }, [myStatsResponse?.results?.selected_enrollment, state.isInitialized]);

  // Debounced enrollment change to prevent rapid switching
  const changeEnrollment = useCallback((enrollment: any) => {
    if (enrollment?.enrollment_id === state.selectedEnrollment?.enrollment_id) {
      return; // No change needed
    }

    setState(prev => ({
      ...prev,
      isTransitioning: true,
    }));

    // Clear existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    // Debounce the enrollment change
    transitionTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        selectedEnrollment: enrollment,
        isTransitioning: false,
      }));
    }, isFlickerProne ? 200 : 100); // Longer delay for flicker-prone environments
  }, [state.selectedEnrollment?.enrollment_id, isFlickerProne]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    selectedEnrollment: state.selectedEnrollment,
    isInitialized: state.isInitialized,
    isTransitioning: state.isTransitioning,
    isLoadingStats,
    myStatsResponse,
    changeEnrollment,
    availableEnrollments: myStatsResponse?.results?.available_enrollments || [],
    // Helper to determine if we should show loading state
    shouldShowLoading: isLoadingStats || !state.selectedEnrollment || state.isTransitioning,
  };
}

/**
 * Hook for child components to get optimized query options based on current enrollment
 */
export function useMyStatsQueryOptions(selectedEnrollment: any) {
  const browserInfo = getBrowserInfo();
  const isFlickerProne = (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS;

  return {
    enabled: !!selectedEnrollment?.enrollment_id || !!selectedEnrollment?.account_id,
    staleTime: isFlickerProne ? 60000 : 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    retry: isFlickerProne ? 1 : 3,
    // Add a small delay for flicker-prone environments
    ...(isFlickerProne && {
      refetchInterval: false, // Disable automatic refetch
      refetchOnReconnect: false, // Disable refetch on reconnect
    }),
  };
}
