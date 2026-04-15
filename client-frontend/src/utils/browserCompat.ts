// Browser compatibility utilities
export const supportsLocalStorage = (): boolean => {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

export const supportsFetch = (): boolean => {
  return typeof fetch !== 'undefined';
};

export const supportsIntersectionObserver = (): boolean => {
  return typeof IntersectionObserver !== 'undefined';
};

export const supportsCustomProperties = (): boolean => {
  return typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', 'var(--test)');
};

export const supportsGridLayout = (): boolean => {
  return typeof CSS !== 'undefined' && CSS.supports && CSS.supports('display', 'grid');
};

export const supportsFlexbox = (): boolean => {
  return typeof CSS !== 'undefined' && CSS.supports && CSS.supports('display', 'flex');
};

// Browser detection utilities
export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const isBrave = !!(navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function';
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && !isBrave;
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor) && !isChrome && !isBrave;
  const isEdge = /Edge/.test(ua) || /Edg/.test(ua);
  const isIE = /Trident/.test(ua);
  const isMobile = /Mobi|Android/i.test(ua);
  const isMacOS = /Mac|macOS/.test(navigator.platform) || /Mac/.test(navigator.userAgent);

  return {
    isChrome,
    isBrave,
    isFirefox,
    isSafari,
    isEdge,
    isIE,
    isMobile,
    isMacOS,
    userAgent: ua,
  };
};

// Feature detection for modern APIs
export const hasModernFeatures = (): boolean => {
  return (
    supportsFetch() &&
    supportsLocalStorage() &&
    typeof Promise !== 'undefined' &&
    typeof Array.prototype.includes !== 'undefined' &&
    typeof Object.assign !== 'undefined'
  );
};

// Polyfill for older browsers
export const safeFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  if (supportsFetch()) {
    return fetch(url, options);
  } else {
    // Fallback to XMLHttpRequest for older browsers
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || 'GET', url);
      
      // Set headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value as string);
        });
      }
      
      xhr.onload = () => {
        const response = {
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          statusText: xhr.statusText,
          json: () => Promise.resolve(JSON.parse(xhr.responseText)),
          text: () => Promise.resolve(xhr.responseText),
        } as Response;
        resolve(response);
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      
      if (options.body) {
        xhr.send(options.body as string);
      } else {
        xhr.send();
      }
    });
  }
};

// Performance monitoring
export const getPerformanceMetrics = () => {
  if ('performance' in window && performance.getEntriesByType) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: navigation.responseEnd - navigation.requestStart,
        ttfb: navigation.responseStart - navigation.requestStart,
      };
    }
  }
  return null;
};

// Console logging for debugging
export const logBrowserInfo = () => {
  const browserInfo = getBrowserInfo();
  const features = {
    localStorage: supportsLocalStorage(),
    fetch: supportsFetch(),
    intersectionObserver: supportsIntersectionObserver(),
    customProperties: supportsCustomProperties(),
    gridLayout: supportsGridLayout(),
    flexbox: supportsFlexbox(),
    modernFeatures: hasModernFeatures(),
  };
  
  console.group('🔧 Browser Compatibility Information');
  console.log('Browser:', browserInfo);
  console.log('Features:', features);
  console.log('Performance:', getPerformanceMetrics());
  console.groupEnd();
}; 