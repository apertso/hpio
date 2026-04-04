import { useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import useApi from "./useApi"; // Import the new hook
import { BuiltinIcon } from "../utils/builtinIcons";

export interface Category {
  id: string;
  name: string;
  type?: "expense" | "income";
  builtinIconName?: BuiltinIcon | null;
}

const fetchCategoriesApi = async (): Promise<Category[]> => {
  const res = await axiosInstance.get("/categories");
  return res.data;
};

const useCategories = (filterType?: "expense" | "income") => {
  const { user } = useAuth();

  const {
    data: allCategories,
    isLoading,
    error,
    execute: fetchCategories,
  } = useApi<Category[]>(fetchCategoriesApi, {
    offlineDataKey: "categories",
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Removed fetchCategories to prevent infinite loop

  const categories = useMemo(() => {
    if (!allCategories) return undefined;
    if (!filterType) return allCategories;
    return allCategories.filter((c) => c.type === filterType);
  }, [allCategories, filterType]);

  return { categories, isLoading, error, fetchCategories };
};

export default useCategories;
