/**
 * Client-side tracking utilities for chat analytics
 */

export interface ClientInfo {
  ip?: string;
  browser: {
    name: string;
    version: string;
    userAgent: string;
  };
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    screen: {
      width: number;
      height: number;
    };
  };
  location?: {
    country?: string;
    city?: string;
    region?: string;
    timezone: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  page: {
    url: string;
    referrer: string;
    title: string;
  };
  session: {
    startTime: string;
    language: string;
    cookiesEnabled: boolean;
  };
}

class ClientTracker {
  private clientInfo: ClientInfo | null = null;
  private ipInfo: any = null;

  /**
   * Detect browser information
   */
  private detectBrowser() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    // Chrome
    if (ua.includes('Chrome') && !ua.includes('Edg')) {
      browserName = 'Chrome';
      const match = ua.match(/Chrome\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Firefox
    else if (ua.includes('Firefox')) {
      browserName = 'Firefox';
      const match = ua.match(/Firefox\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Safari
    else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      browserName = 'Safari';
      const match = ua.match(/Version\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }
    // Edge
    else if (ua.includes('Edg')) {
      browserName = 'Edge';
      const match = ua.match(/Edg\/([0-9.]+)/);
      browserVersion = match ? match[1] : 'Unknown';
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent: ua
    };
  }

  /**
   * Detect device information
   */
  private detectDevice() {
    const ua = navigator.userAgent;
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    let os = 'Unknown';

    // Device type detection
    if (/tablet/i.test(ua) || (/iPad/i.test(ua))) {
      deviceType = 'tablet';
    } else if (/mobile/i.test(ua) || /iPhone|Android/i.test(ua)) {
      deviceType = 'mobile';
    }

    // OS detection
    if (ua.includes('Windows')) {
      os = 'Windows';
    } else if (ua.includes('Mac OS')) {
      os = 'macOS';
    } else if (ua.includes('Linux')) {
      os = 'Linux';
    } else if (ua.includes('Android')) {
      os = 'Android';
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      os = 'iOS';
    }

    return {
      type: deviceType,
      os,
      screen: {
        width: screen.width,
        height: screen.height
      }
    };
  }

  /**
   * Get IP and location information
   */
  private async fetchIPAndLocation(): Promise<any> {
    try {
      // Try multiple IP services for reliability
      const services = [
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          if (response.ok) {
            const data = await response.json();
            return this.normalizeIPData(data, service);
          }
        } catch (error) {
          console.warn(`IP service ${service} failed:`, error);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.warn('All IP services failed:', error);
      return null;
    }
  }

  /**
   * Normalize IP data from different services
   */
  private normalizeIPData(data: any, service: string) {
    let normalized: any = {};

    if (service.includes('ipapi.co')) {
      normalized = {
        ip: data.ip,
        country: data.country_name,
        city: data.city,
        region: data.region,
        coordinates: { lat: data.latitude, lng: data.longitude }
      };
    } else if (service.includes('ip-api.com')) {
      normalized = {
        ip: data.query,
        country: data.country,
        city: data.city,
        region: data.regionName,
        coordinates: { lat: data.lat, lng: data.lon }
      };
    } else if (service.includes('ipinfo.io')) {
      const coords = data.loc ? data.loc.split(',') : [];
      normalized = {
        ip: data.ip,
        country: data.country,
        city: data.city,
        region: data.region,
        coordinates: coords.length === 2 ? { lat: parseFloat(coords[0]), lng: parseFloat(coords[1]) } : undefined
      };
    }

    return normalized;
  }

  /**
   * Get browser location (if user grants permission)
   */
  private async getBrowserLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  /**
   * Collect all client information
   */
  async collectClientInfo(): Promise<ClientInfo> {
    if (this.clientInfo) {
      return this.clientInfo;
    }

    console.log('📊 Collecting client information...');

    // Fetch IP and location data
    this.ipInfo = await this.fetchIPAndLocation();
    
    // Try to get more precise location from browser
    const browserLocation = await this.getBrowserLocation();

    this.clientInfo = {
      ip: this.ipInfo?.ip,
      browser: this.detectBrowser(),
      device: this.detectDevice(),
      location: {
        country: this.ipInfo?.country,
        city: this.ipInfo?.city,
        region: this.ipInfo?.region,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        coordinates: browserLocation || this.ipInfo?.coordinates
      },
      page: {
        url: window.location.href,
        referrer: document.referrer || 'Direct',
        title: document.title
      },
      session: {
        startTime: new Date().toISOString(),
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled
      }
    };

    console.log('📊 Client info collected:', this.clientInfo);
    return this.clientInfo;
  }

  /**
   * Get session analytics
   */
  getSessionAnalytics() {
    const chatCounts = this.getChatCounts();
    const sessionDuration = this.getSessionDuration();
    
    return {
      chatCounts,
      sessionDuration,
      pageViews: this.getPageViews(),
      isReturningVisitor: this.isReturningVisitor(),
      deviceFingerprint: this.generateDeviceFingerprint()
    };
  }

  /**
   * Get chat interaction counts
   */
  private getChatCounts() {
    const stored = localStorage.getItem('chat_analytics') || '{}';
    const analytics = JSON.parse(stored);
    
    return {
      totalSessions: analytics.totalSessions || 0,
      totalMessages: analytics.totalMessages || 0,
      lastChatDate: analytics.lastChatDate || null,
      averageSessionLength: analytics.averageSessionLength || 0
    };
  }

  /**
   * Update chat counts
   */
  updateChatCounts(messagesInSession: number, sessionStartTime: string) {
    const stored = localStorage.getItem('chat_analytics') || '{}';
    const analytics = JSON.parse(stored);
    
    const sessionDuration = new Date().getTime() - new Date(sessionStartTime).getTime();
    const prevAverage = analytics.averageSessionLength || 0;
    const prevSessions = analytics.totalSessions || 0;
    
    const newAnalytics = {
      totalSessions: prevSessions + 1,
      totalMessages: (analytics.totalMessages || 0) + messagesInSession,
      lastChatDate: new Date().toISOString(),
      averageSessionLength: prevSessions === 0 ? sessionDuration : (prevAverage * prevSessions + sessionDuration) / (prevSessions + 1)
    };
    
    localStorage.setItem('chat_analytics', JSON.stringify(newAnalytics));
    return newAnalytics;
  }

  /**
   * Calculate current session duration
   */
  private getSessionDuration() {
    const startTime = sessionStorage.getItem('session_start') || new Date().toISOString();
    if (!sessionStorage.getItem('session_start')) {
      sessionStorage.setItem('session_start', startTime);
    }
    
    return new Date().getTime() - new Date(startTime).getTime();
  }

  /**
   * Get page views count
   */
  private getPageViews() {
    const count = parseInt(sessionStorage.getItem('page_views') || '0') + 1;
    sessionStorage.setItem('page_views', count.toString());
    return count;
  }

  /**
   * Check if returning visitor
   */
  private isReturningVisitor() {
    const hasVisited = localStorage.getItem('has_visited');
    if (!hasVisited) {
      localStorage.setItem('has_visited', 'true');
      localStorage.setItem('first_visit', new Date().toISOString());
      return false;
    }
    return true;
  }

  /**
   * Generate device fingerprint for tracking
   */
  private generateDeviceFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.cookieEnabled.toString()
    ];
    
    // Simple hash function
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Reset tracking data (for testing)
   */
  reset() {
    this.clientInfo = null;
    this.ipInfo = null;
    localStorage.removeItem('chat_analytics');
    sessionStorage.removeItem('session_start');
    sessionStorage.removeItem('page_views');
  }
}

// Singleton instance
export const clientTracker = new ClientTracker();

/**
 * Hook for using client tracking in React components
 */
export const useClientTracking = () => {
  const collectInfo = () => clientTracker.collectClientInfo();
  const getAnalytics = () => clientTracker.getSessionAnalytics();
  const updateChatCounts = (messages: number, startTime: string) => 
    clientTracker.updateChatCounts(messages, startTime);
  
  return {
    collectInfo,
    getAnalytics,
    updateChatCounts
  };
};