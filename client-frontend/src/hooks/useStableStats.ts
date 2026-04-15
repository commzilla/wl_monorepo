// Custom hook for stable stats rendering on macOS Chrome/Brave
import { useRef, useEffect, useState, useMemo } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getOptimizedQueryOptions, debounce } from '@/utils/performanceOptimization';

interface UseStableStatsOptions<T> {
  queryKey: (string | number | undefined)[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  dependencies?: any[];
}

/**
 * Hook that provides stable data loading for MyStats components
 * Prevents flickering during enrollment changes and data updates
 */
export function useStableStats<T>({
  queryKey,
  queryFn,
  enabled = true,
  dependencies = []
}: UseStableStatsOptions<T>) {
  const [isStable, setIsStable] = useState(false);
  const previousDataRef = useRef<T | null>(null);
  const stabilizationTimeoutRef = useRef<NodeJS.Timeout>();

  // Use optimized query options
  const queryOptions = useMemo(() => ({
    queryKey,
    queryFn,
    enabled,
    ...getOptimizedQueryOptions(),
    onSuccess: (data: T) => {
      // Debounce stabilization to prevent rapid state changes
      if (stabilizationTimeoutRef.current) {
        clearTimeout(stabilizationTimeoutRef.current);
      }
      
      stabilizationTimeoutRef.current = setTimeout(() => {
        setIsStable(true);
        previousDataRef.current = data;
      }, 100);
    },
  }), [queryKey.join('-'), enabled, ...dependencies]);

  const query = useQuery(queryOptions as UseQueryOptions<T>);

  // Reset stability when dependencies change
  useEffect(() => {
    setIsStable(false);
    if (stabilizationTimeoutRef.current) {
      clearTimeout(stabilizationTimeoutRef.current);
    }
  }, dependencies);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (stabilizationTimeoutRef.current) {
        clearTimeout(stabilizationTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...query,
    isStable,
    // Provide previous data during transitions to prevent flickering
    stableData: query.data || previousDataRef.current,
    // Indicate if we're showing stale data during transition
    isShowingStaleData: !query.data && !!previousDataRef.current,
  };
}

/**
 * Hook for stable enrollment management
 */
export function useStableEnrollment(initialEnrollment?: any) {
  const [currentEnrollment, setCurrentEnrollment] = useState(initialEnrollment);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced enrollment change to prevent rapid switching
  const debouncedSetEnrollment = useMemo(
    () => debounce((enrollment: any) => {
      setCurrentEnrollment(enrollment);
      setIsTransitioning(false);
    }, 150),
    []
  );

  const changeEnrollment = (enrollment: any) => {
    if (enrollment?.enrollment_id !== currentEnrollment?.enrollment_id) {
      setIsTransitioning(true);
      debouncedSetEnrollment(enrollment);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    enrollment: currentEnrollment,
    isTransitioning,
    changeEnrollment,
    setEnrollment: setCurrentEnrollment,
  };
}

/**
 * Hook for stable metric values that don't flicker during updates
 */
export function useStableMetrics(data: any) {
  const [stableMetrics, setStableMetrics] = useState<any>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (data) {
      // Debounce metric updates to prevent flickering
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        setStableMetrics(data);
      }, 50);
    }
  }, [data]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Return stable metrics or current data if no stable version exists
  return stableMetrics || data || {};
}

/**
 * Hook for preventing layout shifts during data loading
 */
export function useStableLayout() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elementRef.current) {
      const { width, height } = elementRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  return {
    ref: elementRef,
    minWidth: dimensions.width || 'auto',
    minHeight: dimensions.height || 'auto',
  };
}
