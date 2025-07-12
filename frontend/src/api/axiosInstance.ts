import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api", // URL вашего бэкенда
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

    return config;
  },
  (error) => {
    // Обработка ошибок запроса
    return Promise.reject(error);
  }
);

// TODO: Добавить интерцептор для обработки ошибок ответа (например, 401 Unauthorized)
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 401) {
//       // Например, перенаправить на страницу входа
//       console.log('401 Unauthorized - redirecting to login');
//       // window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

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
