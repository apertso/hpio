// src/hooks/useFormPersistence.ts
import { useEffect, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import logger from "../utils/logger";

interface UseFormPersistenceResult {
  clearPersistedData: () => void;
}

const useFormPersistence = <T>(
  form: UseFormReturn<T>,
  storageKey: string
): UseFormPersistenceResult => {
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData) as T;
        if (parsedData && typeof parsedData === "object") {
          form.reset(parsedData);
        }
      }
    } catch (error) {
      logger.warn(`Failed to load saved form data for ${storageKey}:`, error);
    }
  }, [form, storageKey]);

  useEffect(() => {
    const subscription = form.watch((data) => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        logger.warn(`Failed to save form data for ${storageKey}:`, error);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, storageKey]);

  const clearPersistedData = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (error) {
      logger.warn(`Failed to clear form data for ${storageKey}:`, error);
    }
  }, [storageKey]);

  return { clearPersistedData };
};

export default useFormPersistence;
