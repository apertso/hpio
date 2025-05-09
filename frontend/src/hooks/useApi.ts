import { useState, useCallback } from "react";

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | void>;
}

function useApi<T>(
  apiCall: (...args: any[]) => Promise<T>,
  {
    onSuccess,
    onError,
  }: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | void> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await apiCall(...args);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const typedError = err as Error;
        setError(typedError);
        setData(null);
        onError?.(typedError);
      } finally {
        setIsLoading(false);
      }
    },
    [apiCall, onSuccess, onError]
  );

  return { data, isLoading, error, execute };
}

export default useApi;
