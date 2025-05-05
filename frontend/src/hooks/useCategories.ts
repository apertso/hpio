import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";

interface Category {
  id: string;
  name: string;
}

const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get("/categories");
      setCategories(res.data);
      setIsLoading(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "Failed to load categories.";
      logger.error("Failed to fetch categories:", errorMessage, error);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, error };
};

export default useCategories;
