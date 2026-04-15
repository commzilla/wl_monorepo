// Test utilities to verify performance fixes for macOS Chrome/Brave
// This file helps developers test the flickering fixes

import { getBrowserInfo } from './browserCompat';
import { isFlickerProneEnvironment } from './performanceOptimization';

/**
 * Test if the current environment is the problematic one
 */
export const testEnvironmentDetection = (): void => {
  const browserInfo = getBrowserInfo();
  
  console.group('🔍 Environment Detection Test');
  console.log('Browser Info:', browserInfo);
  console.log('Is macOS Chrome/Brave:', (browserInfo.isChrome || browserInfo.isBrave) && browserInfo.isMacOS);
  console.log('Is flicker-prone environment:', isFlickerProneEnvironment());
  console.groupEnd();
};

/**
 * Test performance monitoring
 */
export const testPerformanceMonitoring = (): void => {
  console.group('⚡ Performance Monitoring Test');
  
  // Simulate component render
  const start = performance.now();
  
  // Simulate some work
  for (let i = 0; i < 1000; i++) {
    Math.random();
  }
  
  const end = performance.now();
  console.log(`Simulated render took ${end - start} milliseconds`);
  
  // Test memory usage
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory usage:', {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
    });
  }
  
  console.groupEnd();
};

/**
 * Test CSS fixes application
 */
export const testCSSFixes = (): void => {
  console.group('🎨 CSS Fixes Test');
  
  // Create a test element
  const testElement = document.createElement('div');
  testElement.className = 'trading-stats-overview';
  document.body.appendChild(testElement);
  
  // Check if CSS fixes are applied
  const computedStyle = window.getComputedStyle(testElement);
  
  console.log('CSS Transform applied:', computedStyle.transform !== 'none');
  console.log('Backface visibility:', computedStyle.backfaceVisibility);
  console.log('Will-change:', computedStyle.willChange);
  
  // Cleanup
  document.body.removeChild(testElement);
  
  console.groupEnd();
};

/**
 * Test data stability during updates
 */
export const testDataStability = (): void => {
  console.group('📊 Data Stability Test');
  
  // Simulate rapid data updates
  const testData = [
    { net_pnl: 1234.56 },
    { net_pnl: null },
    { net_pnl: undefined },
    { net_pnl: 0 },
    { net_pnl: -567.89 }
  ];
  
  testData.forEach((data, index) => {
    const formatted = data.net_pnl?.toLocaleString() || '0';
    console.log(`Test ${index + 1}: ${JSON.stringify(data)} -> "${formatted}"`);
  });
  
  console.groupEnd();
};

/**
 * Run all tests
 */
export const runAllPerformanceTests = (): void => {
  console.log('🚀 Running MyStats Performance Fix Tests...\n');
  
  testEnvironmentDetection();
  testPerformanceMonitoring();
  testCSSFixes();
  testDataStability();
  
  console.log('\n✅ All tests completed!');
};

/**
 * Monitor for layout shifts (useful for debugging flickering)
 */
export const monitorLayoutShifts = (): void => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift') {
          console.warn('Layout shift detected:', entry);
        }
      }
    });
    
    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      console.log('Layout shift monitoring started');
    } catch (e) {
      console.log('Layout shift monitoring not supported');
    }
  }
};

/**
 * Development helper to log component re-renders
 */
export const logComponentRender = (componentName: string, props?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 ${componentName} rendered`, props ? { props } : '');
  }
};

// Auto-run tests in development
if (process.env.NODE_ENV === 'development') {
  // Delay to ensure DOM is ready
  setTimeout(() => {
    runAllPerformanceTests();
    monitorLayoutShifts();
  }, 1000);
}
