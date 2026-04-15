// Safe storage utility with fallbacks for cross-browser compatibility
class SafeStorage {
  private isSupported: boolean;
  private fallbackStorage: Map<string, string>;

  constructor() {
    this.isSupported = this.checkSupport();
    this.fallbackStorage = new Map();
  }

  private checkSupport(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage not supported, falling back to in-memory storage');
      return false;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.isSupported) {
        localStorage.setItem(key, value);
      } else {
        // Try sessionStorage first
        try {
          sessionStorage.setItem(key, value);
        } catch (e) {
          // Fallback to in-memory storage
          this.fallbackStorage.set(key, value);
        }
      }
    } catch (e) {
      console.error('Error setting storage item:', e);
      // Always fallback to in-memory storage
      this.fallbackStorage.set(key, value);
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.isSupported) {
        return localStorage.getItem(key);
      } else {
        // Try sessionStorage first
        try {
          return sessionStorage.getItem(key);
        } catch (e) {
          // Fallback to in-memory storage
          return this.fallbackStorage.get(key) || null;
        }
      }
    } catch (e) {
      console.error('Error getting storage item:', e);
      return this.fallbackStorage.get(key) || null;
    }
  }

  removeItem(key: string): void {
    try {
      if (this.isSupported) {
        localStorage.removeItem(key);
      } else {
        // Try sessionStorage first
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          // Fallback to in-memory storage
          this.fallbackStorage.delete(key);
        }
      }
    } catch (e) {
      console.error('Error removing storage item:', e);
      this.fallbackStorage.delete(key);
    }
  }

  clear(): void {
    try {
      if (this.isSupported) {
        localStorage.clear();
      } else {
        try {
          sessionStorage.clear();
        } catch (e) {
          this.fallbackStorage.clear();
        }
      }
    } catch (e) {
      console.error('Error clearing storage:', e);
      this.fallbackStorage.clear();
    }
  }

  // Get storage info for debugging
  getStorageInfo(): {
    type: 'localStorage' | 'sessionStorage' | 'memory';
    isSupported: boolean;
    itemCount: number;
  } {
    if (this.isSupported) {
      return {
        type: 'localStorage',
        isSupported: true,
        itemCount: localStorage.length,
      };
    } else {
      try {
        return {
          type: 'sessionStorage',
          isSupported: false,
          itemCount: sessionStorage.length,
        };
      } catch (e) {
        return {
          type: 'memory',
          isSupported: false,
          itemCount: this.fallbackStorage.size,
        };
      }
    }
  }
}

// Cookie fallback for persistent storage when localStorage is not available
class CookieStorage {
  setItem(key: string, value: string, days: number = 30): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${key}=${value};expires=${expires.toUTCString()};path=/`;
  }

  getItem(key: string): string | null {
    const name = key + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let cookie of cookieArray) {
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length);
      }
    }
    return null;
  }

  removeItem(key: string): void {
    document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
  }
}

// Enhanced storage with multiple fallbacks
class EnhancedStorage {
  private safeStorage: SafeStorage;
  private cookieStorage: CookieStorage;

  constructor() {
    this.safeStorage = new SafeStorage();
    this.cookieStorage = new CookieStorage();
  }

  // Set item with automatic fallback
  setItem(key: string, value: string, persistent: boolean = true): void {
    this.safeStorage.setItem(key, value);
    
    // For critical persistent data, also store in cookies
    if (persistent && (key === 'access_token' || key === 'refresh_token' || key === 'user')) {
      this.cookieStorage.setItem(key, value, 30);
    }
  }

  // Get item with fallback chain
  getItem(key: string): string | null {
    // Try storage first
    let value = this.safeStorage.getItem(key);
    
    // If not found and it's a critical key, try cookies
    if (!value && (key === 'access_token' || key === 'refresh_token' || key === 'user')) {
      value = this.cookieStorage.getItem(key);
      // If found in cookies, restore to storage
      if (value) {
        this.safeStorage.setItem(key, value);
      }
    }
    
    return value;
  }

  // Remove item from all storage types
  removeItem(key: string): void {
    this.safeStorage.removeItem(key);
    this.cookieStorage.removeItem(key);
  }

  // Clear all storage
  clear(): void {
    this.safeStorage.clear();
    // Clear critical cookies
    this.cookieStorage.removeItem('access_token');
    this.cookieStorage.removeItem('refresh_token');
    this.cookieStorage.removeItem('user');
  }

  // Get comprehensive storage info
  getStorageInfo() {
    return {
      safeStorage: this.safeStorage.getStorageInfo(),
      cookiesEnabled: navigator.cookieEnabled,
    };
  }
}

// Export singleton instances
export const safeStorage = new SafeStorage();
export const cookieStorage = new CookieStorage();
export const enhancedStorage = new EnhancedStorage();

// Export for use in existing code
export default safeStorage; 