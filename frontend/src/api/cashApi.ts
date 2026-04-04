import axiosInstance from "./axiosInstance";

export interface CashBalance {
  currency: string;
  amount: number;
}

export const cashApi = {
  getBalances: async (): Promise<CashBalance[]> => {
    const response = await axiosInstance.get("/cash/balances");
    return response.data;
  },

  setBalances: async (balances: CashBalance[]): Promise<CashBalance[]> => {
    const response = await axiosInstance.put("/cash/balances", { balances });
    return response.data;
  },
};
