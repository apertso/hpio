import axiosInstance from "./axiosInstance";
import { User } from "../context/AuthContext"; // We'll define User interface in AuthContext

export const PHOTO_URL = "/user/profile/photo";

// Data types for API calls
interface UpdateProfileData {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
}

const userApi = {
  getProfile: async (): Promise<User> => {
    const response = await axiosInstance.get("/user/profile");
    return response.data;
  },

  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    const response = await axiosInstance.put("/user/profile", data);
    return response.data;
  },

  uploadPhoto: async (formData: FormData): Promise<{ photoPath: string }> => {
    const response = await axiosInstance.post("/user/profile/photo", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete("/user/account");
    return response.data;
  },
};

export default userApi;
