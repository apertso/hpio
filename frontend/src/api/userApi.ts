import axiosInstance from "./axiosInstance";
import { User } from "../context/AuthContext"; // We'll define User interface in AuthContext

export const PHOTO_URL = "/user/profile/photo";

// Data types for API calls
interface UpdateProfileData {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  notificationTime?: string;
  timezone?: string;
}

const userApi = {
  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get("/user/profile");
    return response.data;
  },

  // Лёгкий запрос профиля с поддержкой условного GET для обнаружения изменений, например подтверждения email
  getMe: async (
    etag?: string
  ): Promise<{ status: 200; data: User; etag?: string } | { status: 304 }> => {
    const headers: Record<string, string> = {};
    if (etag) headers["If-None-Match"] = etag;
    const response = await axiosInstance.get("/user/me", {
      headers,
      validateStatus: (s) => [200, 304].includes(s),
    });
    if (response.status === 304) {
      return { status: 304 as const };
    }
    return {
      status: 200 as const,
      data: response.data,
      etag:
        (response.headers && (response.headers["etag"] as string)) || undefined,
    };
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await axiosInstance.put("/user/profile", data);
    return response.data;
  },

  uploadPhoto: async (formData: FormData): Promise<{ photoPath: string }> => {
    const response = await axiosInstance.post("/user/profile/photo", formData);
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete("/user/account");
    return response.data;
  },
};

export default userApi;
