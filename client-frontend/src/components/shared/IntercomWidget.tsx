import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    Intercom: any;
    intercomSettings: any;
  }
}

export const IntercomWidget = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Only initialize Intercom if user is logged in
    if (!user) return;

    // Set up Intercom settings
    window.intercomSettings = {
      api_base: "https://api-iam.intercom.io",
      app_id: "xtkv5l6j",
      user_id: user.user_id,
      name: user.full_name || user.username,
      email: user.username, // Username is email in your system
      created_at: Math.floor(new Date(user.created_at).getTime() / 1000), // Convert to Unix timestamp
    };

    // Initialize Intercom widget
    const initializeIntercom = () => {
      if (typeof window.Intercom === 'function') {
        window.Intercom('reattach_activator');
        window.Intercom('update', window.intercomSettings);
      } else {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = 'https://widget.intercom.io/widget/xtkv5l6j';
        
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(script, firstScript);
        }

        // Set up Intercom function before script loads
        window.Intercom = function(...args: any[]) {
          if (!window.Intercom.q) {
            window.Intercom.q = [];
          }
          window.Intercom.q.push(args);
        };
        window.Intercom.q = [];
      }
    };

    initializeIntercom();

    // Cleanup function
    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
    };
  }, [user]);

  // Update Intercom when user data changes
  useEffect(() => {
    if (user && window.Intercom) {
      window.intercomSettings = {
        api_base: "https://api-iam.intercom.io",
        app_id: "xtkv5l6j",
        user_id: user.user_id,
        name: user.full_name || user.username,
        email: user.username, // Username is email in your system
        created_at: Math.floor(new Date(user.created_at).getTime() / 1000), // Convert to Unix timestamp
      };
      
      if (typeof window.Intercom === 'function') {
        window.Intercom('update', window.intercomSettings);
      }
    }
  }, [user?.user_id, user?.full_name, user?.username, user?.created_at]);

  return null; // This component doesn't render anything
};