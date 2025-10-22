import { useState, useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isLoading: boolean;
}

/**
 * Simple in-memory cache hook for tab-switch optimization
 * Keeps data for the duration of the session (doesn't persist to localStorage)
 * Automatically refreshes on actual page reload/refresh
 */
export function useDataCache<T>(
  cacheKey: string,
  cacheDurationMs: number = 5 * 60 * 1000 // 5 minutes default
) {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const [loading, setLoading] = useState(false);

  const getCachedData = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > cacheDurationMs;
    if (isExpired) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, [cacheDurationMs]);

  const setCachedData = useCallback((key: string, data: T) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      isLoading: false,
    });
  }, []);

  const fetchWithCache = useCallback(async (
    key: string,
    fetchFn: () => Promise<T>,
    forceRefresh: boolean = false
  ): Promise<T> => {
    // Check if we have valid cached data and not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedData(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Check if already loading this key
    const existingEntry = cache.current.get(key);
    if (existingEntry?.isLoading) {
      // Wait for existing request to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const entry = cache.current.get(key);
          if (entry && !entry.isLoading) {
            clearInterval(checkInterval);
            resolve(entry.data);
          }
        }, 50);
      });
    }

    // Mark as loading
    cache.current.set(key, {
      data: {} as T, // Use empty object instead of null
      timestamp: Date.now(),
      isLoading: true,
    });

    setLoading(true);

    try {
      const data = await fetchFn();
      setCachedData(key, data);
      setLoading(false);
      return data;
    } catch (error) {
      // Remove loading state on error
      cache.current.delete(key);
      setLoading(false);
      throw error;
    }
  }, [getCachedData, setCachedData]);

  const clearCache = useCallback((keyPattern?: string) => {
    if (keyPattern) {
      // Clear specific keys matching pattern
      for (const key of cache.current.keys()) {
        if (key.includes(keyPattern)) {
          cache.current.delete(key);
        }
      }
    } else {
      // Clear all cache
      cache.current.clear();
    }
  }, []);

  const isCached = useCallback((key: string): boolean => {
    return getCachedData(key) !== null;
  }, [getCachedData]);

  return {
    loading,
    fetchWithCache,
    getCachedData,
    setCachedData,
    clearCache,
    isCached,
  };
}