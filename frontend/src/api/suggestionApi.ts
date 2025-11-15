import axiosInstance from "./axiosInstance";

export interface Suggestion {
  id: string;
  userId: string;
  merchantName: string;
  amount: number;
  notificationData: string;
  notificationTimestamp?: number;
  status: "pending" | "accepted" | "dismissed";
  createdAt: string;
  updatedAt: string;
}

interface SuggestionResponse
  extends Omit<Suggestion, "notificationTimestamp"> {
  notificationTimestamp?: number | string | null;
}

const parseNotificationTimestamp = (
  timestamp?: number | string | null
): number | undefined => {
  if (timestamp === null || timestamp === undefined) {
    return undefined;
  }

  if (typeof timestamp === "number") {
    return Number.isNaN(timestamp) ? undefined : timestamp;
  }

  const parsed = Number(timestamp);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const mapSuggestionResponse = (
  suggestion: SuggestionResponse
): Suggestion => {
  const { notificationTimestamp, ...rest } = suggestion;
  const parsedTimestamp = parseNotificationTimestamp(notificationTimestamp);

  return {
    ...rest,
    notificationTimestamp: parsedTimestamp,
  };
};

export interface CreateSuggestionData {
  merchantName: string;
  amount: number;
  notificationData: string;
  notificationTimestamp?: number;
}

export const suggestionApi = {
  async getPendingSuggestions(): Promise<Suggestion[]> {
    const response = await axiosInstance.get<SuggestionResponse[]>(
      "/suggestions"
    );
    return response.data.map(mapSuggestionResponse);
  },

  async createSuggestion(data: CreateSuggestionData): Promise<Suggestion> {
    const response = await axiosInstance.post<SuggestionResponse>(
      "/suggestions",
      data
    );
    return mapSuggestionResponse(response.data);
  },

  async bulkCreateSuggestions(
    suggestions: CreateSuggestionData[]
  ): Promise<Suggestion[]> {
    const response = await axiosInstance.post<SuggestionResponse[]>(
      "/suggestions/bulk",
      {
        suggestions,
      }
    );
    return response.data.map(mapSuggestionResponse);
  },

  async acceptSuggestion(id: string): Promise<Suggestion> {
    const response = await axiosInstance.post<SuggestionResponse>(
      `/suggestions/${id}/accept`
    );
    return mapSuggestionResponse(response.data);
  },

  async dismissSuggestion(id: string): Promise<Suggestion> {
    const response = await axiosInstance.post<SuggestionResponse>(
      `/suggestions/${id}/dismiss`
    );
    return mapSuggestionResponse(response.data);
  },
};
