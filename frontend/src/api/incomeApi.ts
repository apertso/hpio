import axiosInstance from "./axiosInstance";
import { IncomeData, CreateIncomeData } from "../types/incomeData";

export const incomeApi = {
  getIncomes: async (): Promise<IncomeData[]> => {
    const response = await axiosInstance.get("/incomes");
    return response.data;
  },

  getIncome: async (id: string): Promise<IncomeData> => {
    const response = await axiosInstance.get(`/incomes/${id}`);
    return response.data;
  },

  createIncome: async (data: CreateIncomeData): Promise<IncomeData> => {
    const response = await axiosInstance.post("/incomes", data);
    return response.data;
  },

  updateIncome: async (id: string, data: CreateIncomeData): Promise<IncomeData> => {
    const response = await axiosInstance.put(`/incomes/${id}`, data);
    return response.data;
  },

  deleteIncome: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/incomes/${id}`);
  },
};
