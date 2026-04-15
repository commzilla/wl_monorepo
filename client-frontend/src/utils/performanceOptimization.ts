// Performance optimization utilities for MyStats components
// Specifically designed to prevent flickering on macOS Chrome/Brave

import { getBrowserInfo } from './browserCompat';

/**
 * Debounce function to prevent excessive re-renders during rapid state changes
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit API calls during enrollment switching
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Get platform-specific styles to prevent GPU compositing issues
 */
export const getPlatformStyles = () => {
  const browserInfo = getBrowserInfo();
  
  // macOS Chrome/Brave specific fixes
  const isMacChromeBrave = (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS;
  
  if (isMacChromeBrave) {
    return {
      WebkitTransform: 'translateZ(0)',
      transform: 'translateZ(0)',
      WebkitBackfaceVisibility: 'hidden' as const,
      backfaceVisibility: 'hidden' as const,
      WebkitPerspective: '1000px',
      perspective: '1000px',
      willChange: 'auto' as const,
    };
  }
  
  return {};
};

/**
 * Get container styles for stats components
 */
export const getStatsContainerStyles = () => {
  const browserInfo = getBrowserInfo();
  const isMacChromeBrave = (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS;
  
  if (isMacChromeBrave) {
    return {
      ...getPlatformStyles(),
      contain: 'layout style paint' as const,
      isolation: 'isolate' as const,
    };
  }
  
  return {};
};

/**
 * Memoization helper for expensive calculations
 */
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Clean cache if it gets too large
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
};

/**
 * Request Animation Frame helper for smooth updates
 */
export const requestIdleCallback = (callback: () => void) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(callback, 1);
  }
};

/**
 * Optimized state update helper that batches updates
 */
export const batchStateUpdates = (updates: (() => void)[]) => {
  // Use React's unstable_batchedUpdates if available, otherwise use RAF
  if ('unstable_batchedUpdates' in window) {
    (window as any).unstable_batchedUpdates(() => {
      updates.forEach(update => update());
    });
  } else {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }
};

/**
 * Check if the current environment might experience the flickering issue
 */
export const isFlickerProneEnvironment = (): boolean => {
  const browserInfo = getBrowserInfo();
  return (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS;
};

/**
 * Get optimized query options for React Query
 */
export const getOptimizedQueryOptions = (baseOptions: any = {}) => {
  const isFlickerProne = isFlickerProneEnvironment();
  
  return {
    ...baseOptions,
    keepPreviousData: true,
    staleTime: isFlickerProne ? 60000 : 30000, // Longer stale time for flicker-prone environments
    cacheTime: isFlickerProne ? 300000 : 180000, // Longer cache time
    refetchOnWindowFocus: !isFlickerProne, // Disable refetch on focus for flicker-prone environments
    retry: (failureCount: number, error: any) => {
      // More conservative retry strategy for flicker-prone environments
      if (isFlickerProne && failureCount >= 2) return false;
      return failureCount < 3;
    },
  };
};

/**
 * Performance monitoring for development
 */
export const measurePerformance = (name: string, fn: () => void) => {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
  } else {
    fn();
  }
};

/**
 * Safe number formatting that prevents layout shifts
 */
export const formatNumberStable = (value: any, defaultValue: string = '0'): string => {
  if (value === null || value === undefined) return defaultValue;
  
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  
  // Use fixed-width formatting to prevent layout shifts
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * Create stable refs that don't change on re-renders
 */
export const createStableRef = <T>(initialValue: T) => {
  const ref = { current: initialValue };
  return ref;
};
