import { useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import useApi from "./useApi"; // Import the new hook
import { BuiltinIcon } from "../utils/builtinIcons";

interface Category {
  id: string;
  name: string;
  builtinIconName?: BuiltinIcon | null;
}

const fetchCategoriesApi = async (): Promise<Category[]> => {
  const res = await axiosInstance.get("/categories");
  return res.data;
};

const useCategories = () => {
  const {
    data: categories,
    isLoading,
    error,
    execute: fetchCategories,
  } = useApi<Category[]>(fetchCategoriesApi);

  useEffect(() => {
    fetchCategories();
  }, []); // Removed fetchCategories to prevent infinite loop

  return { categories, isLoading, error, fetchCategories };
};

export default useCategories;
