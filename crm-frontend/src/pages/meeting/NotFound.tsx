import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="text-center">
        <div className="h-16 w-16 rounded-2xl bg-brand-600/10 flex items-center justify-center mx-auto mb-6">
          <img src="/wefund-icon.svg" alt="WeMeet" className="h-8 w-auto" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
        <a
          href="https://we-fund.com"
          className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
        >
          Go to we-fund.com
        </a>
      </div>
    </div>
  );
}
