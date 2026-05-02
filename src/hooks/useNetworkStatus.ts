import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track network connectivity status.
 * Listens to window 'online' and 'offline' events.
 * @returns {boolean} true if online, false if offline
 */
export function useNetworkStatus(): boolean {
  // Initialize with the current navigator status if available, defaulting to true
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  );

  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check one more time in case it changed between initial render and effect execution
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return isOnline;
}
