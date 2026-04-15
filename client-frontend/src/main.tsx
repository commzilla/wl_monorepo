import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n/config'
import { logBrowserInfo, getBrowserInfo } from './utils/browserCompat'
import { LanguageProvider } from './contexts/LanguageContext'

// Log browser compatibility information for debugging
if (process.env.NODE_ENV === 'development') {
  logBrowserInfo();
}

// Platform-specific error handling
const browserInfo = getBrowserInfo();
if (browserInfo.isSafari) {
  console.log('🔍 Safari detected - applying platform-specific optimizations');
  
  // Safari-specific error handling
  window.addEventListener('error', (event) => {
    console.error('🚨 Safari Browser Error:', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: 'Safari',
    });
  });
} else {
  // General error handling for other browsers
  window.addEventListener('error', (event) => {
    console.error('🚨 Browser Error:', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  });
}

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', {
    reason: event.reason,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    platform: browserInfo.isSafari ? 'Safari' : 'Other',
  });
});

// Safari-specific storage check
if (browserInfo.isSafari) {
  try {
    const test = 'safari_test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    console.log('✅ Safari localStorage is working');
  } catch (e) {
    console.warn('⚠️ Safari localStorage may have issues:', e);
  }
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
