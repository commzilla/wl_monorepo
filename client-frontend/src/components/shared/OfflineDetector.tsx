import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineDetector: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#28BFFF]/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#28BFFF]/3 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#28BFFF]/2 rounded-full blur-[200px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(40,191,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(40,191,255,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Content card */}
        <div className="relative z-10 max-w-lg w-full">
          <div className="bg-[#0A1114]/80 backdrop-blur-2xl rounded-3xl border border-[rgba(40,191,255,0.12)] p-10 md:p-14 text-center shadow-[0_0_80px_rgba(40,191,255,0.08)]">
            
            {/* Icon with animated rings */}
            <div className="relative w-28 h-28 mx-auto mb-8">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-[#28BFFF]/10 animate-ping" style={{ animationDuration: '3s' }} />
              {/* Middle ring */}
              <div className="absolute inset-2 rounded-full border border-[#28BFFF]/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
              {/* Icon circle */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[#28BFFF]/15 to-[#28BFFF]/5 border border-[#28BFFF]/20 flex items-center justify-center shadow-[0_0_40px_rgba(40,191,255,0.15)_inset]">
                <WifiOff className="w-10 h-10 text-[#28BFFF]" />
              </div>
            </div>

            {/* Text */}
            <h1 className="text-[#E4EEF5] text-2xl md:text-3xl font-bold tracking-tight mb-3">
              No Internet Connection
            </h1>
            <p className="text-[#85A8C3] text-sm md:text-base leading-relaxed mb-8 max-w-sm mx-auto">
              It looks like you're offline. Please check your network connection and try again.
            </p>

            {/* Retry button */}
            <button
              onClick={() => window.location.reload()}
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#28BFFF]/15 to-[#28BFFF]/10 border border-[#28BFFF]/30 text-[#28BFFF] font-semibold text-sm hover:from-[#28BFFF]/25 hover:to-[#28BFFF]/15 hover:border-[#28BFFF]/50 transition-all duration-300 shadow-[0_0_30px_rgba(40,191,255,0.1)] hover:shadow-[0_0_40px_rgba(40,191,255,0.2)]"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              Try Again
            </button>

            {/* Status indicator */}
            <div className="mt-8 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-[#85A8C3]/60 tracking-wide uppercase">Offline</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
