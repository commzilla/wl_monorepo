import { BUILD_COMMIT } from '@/lib/version';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.we-fund.com';
const SNOOZE_KEY = 'version_update_snoozed_until';
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

interface VersionResponse {
  commit: string;
  service: string;
}

export const versionService = {
  async checkVersion(): Promise<{ needsUpdate: boolean; serverCommit: string; localCommit: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/version/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Version check failed:', response.status);
        return { needsUpdate: false, serverCommit: 'unknown', localCommit: BUILD_COMMIT };
      }

      const data: VersionResponse = await response.json();
      const serverCommit = data.commit;
      const localCommit = BUILD_COMMIT;

      // Don't trigger update if either is unknown or in development
      if (serverCommit === 'unknown' || localCommit === 'development') {
        return { needsUpdate: false, serverCommit, localCommit };
      }

      const needsUpdate = serverCommit !== localCommit;
      return { needsUpdate, serverCommit, localCommit };
    } catch (error) {
      console.warn('Version check error:', error);
      return { needsUpdate: false, serverCommit: 'error', localCommit: BUILD_COMMIT };
    }
  },

  isSnoozed(): boolean {
    const snoozedUntil = localStorage.getItem(SNOOZE_KEY);
    if (!snoozedUntil) return false;
    
    const snoozedTime = parseInt(snoozedUntil, 10);
    return Date.now() < snoozedTime;
  },

  snooze(hours: number = 4): void {
    const snoozedUntil = Date.now() + (hours * 60 * 60 * 1000);
    localStorage.setItem(SNOOZE_KEY, snoozedUntil.toString());
  },

  clearSnooze(): void {
    localStorage.removeItem(SNOOZE_KEY);
  },

  getCheckInterval(): number {
    return CHECK_INTERVAL;
  },
};
