import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    WeFundSupport?: {
      userId: string;
      userEmail: string;
      userName: string;
      accountLogin?: string;
      apiBaseUrl: string;
      position?: 'bottom-right' | 'bottom-left';
      primaryColor?: string;
    };
    WeFundSupportWidget?: {
      toggle: () => void;
      open: () => void;
      close: () => void;
      reset: () => void;
    };
  }
}

export const SupportWidget = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://stg-api.we-fund.com/api';

    // Configure widget
    window.WeFundSupport = {
      userId: user.user_id,
      userEmail: user.username,
      userName: user.full_name || user.username?.split('@')[0] || 'Trader',
      apiBaseUrl,
      position: 'bottom-right',
    };

    // Load widget script
    const script = document.createElement('script');
    script.src = `${apiBaseUrl.replace(/\/api$/, '')}/support/widget.js`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      const widgetContainer = document.getElementById('wf-support-widget');
      if (widgetContainer) {
        widgetContainer.remove();
      }
      delete window.WeFundSupport;
      delete window.WeFundSupportWidget;
    };
  }, [user]);

  return null;
};
