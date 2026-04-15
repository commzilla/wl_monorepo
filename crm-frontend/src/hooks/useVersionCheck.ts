import { useState, useEffect, useCallback } from 'react';
import { versionService } from '@/services/versionService';

interface VersionState {
  needsUpdate: boolean;
  serverCommit: string;
  localCommit: string;
  isChecking: boolean;
}

export function useVersionCheck() {
  const [state, setState] = useState<VersionState>({
    needsUpdate: false,
    serverCommit: '',
    localCommit: '',
    isChecking: false,
  });
  const [showDialog, setShowDialog] = useState(false);

  const checkVersion = useCallback(async () => {
    // Skip if snoozed
    if (versionService.isSnoozed()) {
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      const result = await versionService.checkVersion();
      
      setState({
        needsUpdate: result.needsUpdate,
        serverCommit: result.serverCommit,
        localCommit: result.localCommit,
        isChecking: false,
      });

      // Only show dialog if update is needed and not snoozed
      if (result.needsUpdate && !versionService.isSnoozed()) {
        setShowDialog(true);
      }
    } catch (error) {
      setState(prev => ({ ...prev, isChecking: false }));
    }
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
  }, []);

  useEffect(() => {
    // Initial check after a short delay (let the app load first)
    const initialTimeout = setTimeout(() => {
      checkVersion();
    }, 5000);

    // Set up periodic checks
    const interval = setInterval(() => {
      checkVersion();
    }, versionService.getCheckInterval());

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkVersion]);

  return {
    ...state,
    showDialog,
    closeDialog,
    checkVersion,
  };
}
