/**
 * Offline Status Hook
 * Detects when user is offline and data is being served from cache
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from 'react-query';

interface OfflineStatus {
  isOffline: boolean;
  isUsingCache: boolean;
  shouldShowBanner: boolean;
}

/**
 * Hook to detect offline status and cache usage
 * Shows banner when offline AND data is from cache
 */
export function useOfflineStatus(): OfflineStatus {
  const [isOffline, setIsOffline] = useState(() => {
    // Check initial online status (only on client)
    if (typeof window !== 'undefined') {
      return !navigator.onLine;
    }
    return false;
  });
  const [isUsingCache, setIsUsingCache] = useState(false);
  const queryClient = useQueryClient();

  // Function to check if we're using cached data
  const checkCacheUsage = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isOffline) {
      setIsUsingCache(false);
      return;
    }

    // When offline, check if we have cached data
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    // Check if any queries have cached data that's being used
    const hasCachedData = queries.some(query => {
      const state = query.state;
      // If query has data and is in success state (not fetching), it's using cache
      // Also check if query failed but has previous data (fallback to cache)
      return (
        state.data !== undefined && 
        (state.status === 'success' || (state.status === 'error' && state.data))
      );
    });

    setIsUsingCache(hasCachedData);
  }, [isOffline, queryClient]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Check initial online status
    setIsOffline(!navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOffline(false);
      setIsUsingCache(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      // Check cache usage when going offline
      setTimeout(checkCacheUsage, 100);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkCacheUsage]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Check cache usage when offline status changes
    checkCacheUsage();

    // Periodic check when offline to detect cache usage
    // This is more reliable than listening to specific events
    let intervalId: NodeJS.Timeout | null = null;
    if (isOffline) {
      // Check immediately
      checkCacheUsage();
      // Then check periodically (every 2 seconds) when offline
      intervalId = setInterval(checkCacheUsage, 2000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isOffline, checkCacheUsage]);

  // Show banner only when offline AND using cache
  const shouldShowBanner = isOffline && isUsingCache;

  return {
    isOffline,
    isUsingCache,
    shouldShowBanner,
  };
}

