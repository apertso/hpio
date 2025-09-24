import React, { useState, useCallback } from "react";
import { syncService, ConnectionStatus } from "../utils/syncService";
import { offlineStorage } from "../utils/offlineStorage";
import logger from "../utils/logger";

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | void>;
  connectionStatus: ConnectionStatus;
  isOffline: boolean;
}

function useApi<T>(
  apiCall: (...args: any[]) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    enableOffline?: boolean;
    cacheKey?: string;
  } = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cachedData, setCachedData] = useState<T | null>(null);

  const { onSuccess, onError, enableOffline = true, cacheKey } = options;

  const connectionStatus = syncService.getConnectionStatus();
  const isOffline = connectionStatus === ConnectionStatus.OFFLINE;

  const execute = useCallback(
    async (...args: any[]): Promise<T | void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Try to fetch from API first if online
        if (!isOffline) {
          try {
            const result = await apiCall(...args);
            setData(result);
            setCachedData(result);
            onSuccess?.(result);

            // Cache the result if cacheKey is provided
            if (cacheKey) {
              localStorage.setItem(cacheKey, JSON.stringify(result));
            }

            return result;
          } catch (apiError) {
            logger.error("API call failed, trying offline fallback:", apiError);

            // If API fails and offline is enabled, try to get cached data
            if (enableOffline && cachedData) {
              setData(cachedData);
              const error = new Error("Using cached data - API unavailable");
              setError(error);
              onError?.(error);
              return cachedData;
            }

            throw apiError;
          }
        } else {
          // Offline mode - try to get cached data
          if (enableOffline && cachedData) {
            setData(cachedData);
            const error = new Error("Offline mode - using cached data");
            setError(error);
            onError?.(error);
            return cachedData;
          }

          throw new Error(
            "No internet connection and no cached data available"
          );
        }
      } catch (err) {
        const typedError = err as Error;
        setError(typedError);

        // Try to get cached data if there's an error and no data is currently set
        if (!data && cachedData && enableOffline) {
          setData(cachedData);
          logger.info("Using cached data due to error");
        } else {
          setData(null);
        }

        onError?.(typedError);
        throw typedError;
      } finally {
        setIsLoading(false);
      }
    },
    [
      apiCall,
      onSuccess,
      onError,
      isOffline,
      enableOffline,
      cachedData,
      data,
      cacheKey,
    ]
  );

  // Load cached data on mount if cacheKey is provided
  React.useEffect(() => {
    if (cacheKey) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsedData = JSON.parse(cached);
          setCachedData(parsedData);
          if (!data) {
            setData(parsedData);
          }
        } catch (error) {
          logger.error("Failed to parse cached data:", error);
        }
      }
    }
  }, [cacheKey, data]);

  return {
    data,
    isLoading,
    error,
    execute,
    connectionStatus,
    isOffline,
  };
}

export default useApi;
