import axiosInstance from "./axiosInstance";

export interface MerchantCategoryRule {
  id: string;
  userId: string;
  categoryId: string;
  merchantKeyword: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    builtinIconName?: string;
  };
}

export interface CreateMerchantRuleData {
  categoryId: string;
  merchantKeyword: string;
}

export const merchantRuleApi = {
  async getMerchantRules(): Promise<MerchantCategoryRule[]> {
    const response = await axiosInstance.get("/api/merchant-rules");
    return response.data;
  },

  async findRuleByMerchant(
    merchant: string
  ): Promise<MerchantCategoryRule | null> {
    try {
      const response = await axiosInstance.get("/api/merchant-rules/find", {
        params: { merchant },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async createMerchantRule(
    data: CreateMerchantRuleData
  ): Promise<MerchantCategoryRule> {
    const response = await axiosInstance.post("/api/merchant-rules", data);
    return response.data;
  },

  async deleteMerchantRule(id: string): Promise<void> {
    await axiosInstance.delete(`/api/merchant-rules/${id}`);
  },
};
