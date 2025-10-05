import axiosInstance from "./axiosInstance";

export interface Suggestion {
  id: string;
  userId: string;
  merchantName: string;
  amount: number;
  notificationData: string;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
  updatedAt: string;
}

export interface CreateSuggestionData {
  merchantName: string;
  amount: number;
  notificationData: string;
}

export const suggestionApi = {
  async getPendingSuggestions(): Promise<Suggestion[]> {
    const response = await axiosInstance.get("/api/suggestions");
    return response.data;
  },

  async createSuggestion(data: CreateSuggestionData): Promise<Suggestion> {
    const response = await axiosInstance.post("/api/suggestions", data);
    return response.data;
  },

  async bulkCreateSuggestions(
    suggestions: CreateSuggestionData[]
  ): Promise<Suggestion[]> {
    const response = await axiosInstance.post("/api/suggestions/bulk", {
      suggestions,
    });
    return response.data;
  },

  async acceptSuggestion(id: string): Promise<Suggestion> {
    const response = await axiosInstance.post(`/api/suggestions/${id}/accept`);
    return response.data;
  },

  async dismissSuggestion(id: string): Promise<Suggestion> {
    const response = await axiosInstance.post(`/api/suggestions/${id}/dismiss`);
    return response.data;
  },
};
