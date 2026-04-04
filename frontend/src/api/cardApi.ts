import axiosInstance from "./axiosInstance";
import { CardData, BinInfo, CardBalanceData } from "../types/cardData";

export interface CardBalanceInput {
  currency: string;
  amount: number;
}

export const cardApi = {
  getCards: async (): Promise<CardData[]> => {
    const response = await axiosInstance.get("/cards");
    return response.data;
  },

  getCard: async (id: string): Promise<CardData> => {
    const response = await axiosInstance.get(`/cards/${id}`);
    return response.data;
  },

  createCard: async (data: Partial<CardData>): Promise<CardData> => {
    const response = await axiosInstance.post("/cards", data);
    return response.data;
  },

  updateCard: async (id: string, data: Partial<CardData>): Promise<CardData> => {
    const response = await axiosInstance.put(`/cards/${id}`, data);
    return response.data;
  },

  deleteCard: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/cards/${id}`);
  },

  getBalances: async (id: string): Promise<CardBalanceData[]> => {
    const response = await axiosInstance.get(`/cards/${id}/balances`);
    return response.data;
  },

  setBalances: async (
    id: string,
    balances: CardBalanceInput[]
  ): Promise<CardBalanceData[]> => {
    const response = await axiosInstance.put(`/cards/${id}/balances`, {
      balances,
    });
    return response.data;
  },

  lookupBin: async (bin: string): Promise<BinInfo | null> => {
    try {
      const response = await axiosInstance.get(`/cards/bin/${bin}`);
      return response.data;
    } catch {
      return null;
    }
  },
};
