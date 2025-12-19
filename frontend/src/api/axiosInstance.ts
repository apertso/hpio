import axios, { AxiosHeaders } from "axios";
import { syncService } from "../utils/syncService";
import { trackApiRequest, trackApiError } from "../utils/breadcrumbs";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Добавление интерцептора для автоматического прикрепления JWT токена к запросам
axiosInstance.interceptors.request.use(
  (config) => {
    // Получаем токен из localStorage (или другого места, где вы его храните после входа)
    const token = localStorage.getItem("jwtToken");

    // Если токен существует, добавляем его в заголовок Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Если отправляем FormData, удаляем Content-Type чтобы axios установил правильный boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    // Обработка ошибок запроса
    return Promise.reject(error);
  }
);

// Интерцептор для проверки оффлайн режима перед запросами
axiosInstance.interceptors.request.use(
  async (config) => {
    const headersInstance =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers);

    if (headersInstance.has("X-Offline-Replay")) {
      config.headers = headersInstance;
      return config;
    }

    config.headers = headersInstance;

    const method = (config.method || "get").toLowerCase();
    const isMutation = ["post", "put", "patch", "delete"].includes(method);

    if (!navigator.onLine && isMutation) {
      window.dispatchEvent(new CustomEvent("offline-api-request"));
      const response = await syncService.enqueueOfflineRequest(config);
      config.adapter = async () => response;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase() || "GET";
    const url = response.config.url || "";
    const status = response.status;
    trackApiRequest(method, url, status);
    return response;
  },
  (error) => {
    const method = error.config?.method?.toUpperCase() || "UNKNOWN";
    const url = error.config?.url || "unknown";
    const errorMessage =
      error.response?.data?.message || error.message || "Unknown error";
    trackApiError(method, url, errorMessage);
    return Promise.reject(error);
  }
);

// Add functions for recurring series API
export const seriesApi = {
  getSeriesById: async (id: string) => {
    const response = await axiosInstance.get(`/series/${id}`);
    return response.data;
  },
  updateSeries: async (id: string, data: unknown) => {
    const response = await axiosInstance.put(`/series/${id}`, data);
    return response.data;
  },
  getAllSeries: async () => {
    const response = await axiosInstance.get("/series");
    return response.data;
  },
  deleteSeries: async (id: string) => {
    const response = await axiosInstance.delete(`/series/${id}`);
    return response.data;
  },
};

export const authApi = {
  verifyEmail: async (token: string) => {
    const response = await axiosInstance.post("/auth/verify-email", { token });
    return response.data;
  },
  resendVerificationEmail: async () => {
    const response = await axiosInstance.post("/auth/resend-verification");
    return response.data;
  },
};

export default axiosInstance;
