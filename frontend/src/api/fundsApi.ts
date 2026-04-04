import axiosInstance from "./axiosInstance";

export interface FundsSummary {
  totalAmount: number;
  currency: string;
  changeAmount: number | null;
}

export interface FundsHistoryPoint {
  date: string;
  totalAmount: number;
}

export const fundsApi = {
  getSummary: async (): Promise<FundsSummary> => {
    const response = await axiosInstance.get("/funds/summary");
    return response.data;
  },

  getHistory: async (params: {
    startDate: string;
    endDate: string;
  }): Promise<FundsHistoryPoint[]> => {
    const response = await axiosInstance.get("/funds/history", { params });
    return response.data;
  },
};
