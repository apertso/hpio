import axiosInstance from "./axiosInstance";

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  large?: string; // Alternative image URL from search API
  current_price: number;
}

export interface CryptoBalance {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  walletAddress?: string;
  quantity: number;
  currentPrice: number;
  totalValue: number;
  currency: string;
}

export const cryptoApi = {
  getTopAssets: async (): Promise<CryptoAsset[]> => {
    const response = await axiosInstance.get("/crypto/top");
    return response.data;
  },

  searchAssets: async (query: string): Promise<CryptoAsset[]> => {
    const response = await axiosInstance.get(
      `/crypto/search?q=${encodeURIComponent(query)}`
    );
    // Search API returns a slightly different format, mapping might be needed in backend or here
    // Assuming backend normalizes it or we handle "coins" array
    return response.data.coins || [];
  },

  getBalances: async (): Promise<CryptoBalance[]> => {
    const response = await axiosInstance.get("/crypto/balances");
    return response.data;
  },

  addBalance: async (data: {
    coinId: string;
    symbol: string;
    name: string;
    quantity: number;
    walletAddress?: string;
  }) => {
    const response = await axiosInstance.post("/crypto/balances", data);
    return response.data;
  },

  updateBalance: async (id: string, quantity: number, walletAddress?: string) => {
    const response = await axiosInstance.put(`/crypto/balances/${id}`, { quantity, walletAddress });
    return response.data;
  },

  deleteBalance: async (id: string) => {
    await axiosInstance.delete(`/crypto/balances/${id}`);
  },
};
