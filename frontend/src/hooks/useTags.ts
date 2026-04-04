import { useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import useApi from "./useApi";

export interface Tag {
  id: string;
  name: string;
}

interface UseTagsResult {
  tags: Tag[] | undefined;
  isLoading: boolean;
  error: Error | null;
  fetchTags: (...args: unknown[]) => Promise<Tag[] | void>;
}

const fetchTagsApi = async (): Promise<Tag[]> => {
  const res = await axiosInstance.get("/tags");
  return res.data;
};

const useTags = (enabled = true): UseTagsResult => {
  const {
    data: allTags,
    isLoading,
    error,
    execute: fetchTags,
  } = useApi<Tag[]>(fetchTagsApi, {
    offlineDataKey: "tags",
  });

  useEffect(() => {
    if (!enabled) return;
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    tags: allTags ?? undefined,
    isLoading,
    error,
    fetchTags,
  };
};

export default useTags;
