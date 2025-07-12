// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import axiosInstance from "../api/axiosInstance"; // Ваш настроенный экземпляр axios
import { useNavigate } from "react-router-dom";
import logger from "../utils/logger"; // Используем простой логгер на фронтенде
import userApi from "../api/userApi"; // <-- ADD THIS

export interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  photoPath?: string | null; // <-- ADD THIS
  // Добавьте другие поля пользователя, если они будут возвращаться с бэкенда
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean; // Индикатор загрузки (например, при попытке автоматического входа по токену)
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>; // <-- ADD THIS
  //forgotPassword: (email: string) => Promise<void>; // Можно добавить сюда, но пока оставим на странице
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Type guard for error with response
function isAxiosErrorWithMessage(
  error: unknown
): error is { response: { data: { message: string } } } {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as unknown as { response?: { data?: { message?: unknown } } })
      .response?.data?.message === "string"
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  // Инициализируем состояние, пытаясь получить данные из localStorage
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("jwtToken")
  );
  const [loading, setLoading] = useState(true); // Флаг загрузки при инициализации

  // Функция выхода
  const logout = useCallback(() => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    delete axiosInstance.defaults.headers.common["Authorization"]; // Удаляем заголовок Authorization
    logger.info("Logout successful");
    navigate("/login"); // Перенаправить на страницу входа после выхода
  }, [navigate]); // Зависимость от navigate

  // Эффект для проверки токена при загрузке приложения и настройки Axios
  useEffect(() => {
    if (token) {
      // TODO: Опционально, добавить эндпоинт на бэкенде для проверки валидности токена без полных данных пользователя
      // Например, GET /api/auth/verify-token
      // Если токен есть, но не валиден (например, истек), пользователь будет считаться не аутентифицированным
      // Пока полагаемся на интерцептор Axios для обработки 401
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
      setLoading(false); // Если токен есть, считаем загрузку завершенной
    } else {
      setLoading(false); // Если токена нет, загрузка завершена
    }
  }, [token]); // Зависимость от токена, чтобы перенастроить axios при изменении

  // Обработка 401 ошибки Axios (если еще не добавили в axiosInstance.ts)
  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Если ошибка 401 и это не запрос на login/register (чтобы избежать бесконечного цикла)
        if (
          error.response &&
          error.response.status === 401 &&
          !error.config.url.includes("/auth/login") &&
          !error.config.url.includes("/auth/register")
        ) {
          logger.warn("Received 401 Unauthorized. Logging out.");
          logout(); // Автоматический выход при неавторизованном запросе
          // Опционально: navigate('/login'); // Перенаправить на страницу входа
        }
        return Promise.reject(error);
      }
    );
    return () => {
      // Очистка интерцептора при размонтировании компонента
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, [navigate, logout]); // Зависимости от navigate и logout

  // Функция для обновления данных пользователя из бэкенда
  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await userApi.getProfile();
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
      logger.info("User data refreshed.");
    } catch (error) {
      logger.error("Failed to refresh user data, logging out.", error);
      // Если не удалось обновить данные (например, токен невалиден), выходим
      logout();
    }
  }, [logout]); // <-- ADD `logout` to dependency array if it's not already stable

  // Функция входа
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const res = await axiosInstance.post("/auth/login", {
          email,
          password,
        });
        const {
          token,
          id,
          name,
          email: userEmail,
          photoPath,
          isVerified,
        } = res.data;

        localStorage.setItem("jwtToken", token);
        const userData = { id, name, email: userEmail, photoPath, isVerified };
        localStorage.setItem("user", JSON.stringify(userData));

        setToken(token);
        setUser(userData);
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`; // Настраиваем Axios заголовок
        logger.info("Login successful");
        navigate("/dashboard"); // Перенаправить на главную страницу после входа
      } catch (error: unknown) {
        let message = "Ошибка входа";
        if (isAxiosErrorWithMessage(error)) {
          message = error.response.data.message;
        } else if (error instanceof Error) {
          message = error.message;
        }
        logger.error("Login failed:", message);
        setLoading(false);
        throw new Error(message); // Пробросить ошибку для отображения в UI
      } finally {
        // setLoading(false); // Уже сделано в catch или можно здесь, если нет ошибки
      }
    },
    [navigate]
  ); // Зависимость от navigate

  // Функция регистрации
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setLoading(true);
      try {
        const res = await axiosInstance.post("/auth/register", {
          name,
          email,
          password,
        });
        const {
          token,
          id: regId,
          name: regName,
          email: regEmail,
          photoPath: regPhotoPath,
          isVerified,
        } = res.data;

        localStorage.setItem("jwtToken", token);
        const regUserData = {
          id: regId,
          name: regName,
          email: regEmail,
          photoPath: regPhotoPath,
          isVerified,
        };
        localStorage.setItem("user", JSON.stringify(regUserData));

        setToken(token);
        setUser(regUserData);
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        logger.info("Registration successful");
        navigate("/dashboard"); // Перенаправить на главную страницу после регистрации
      } catch (error: unknown) {
        let message = "Ошибка регистрации";
        if (isAxiosErrorWithMessage(error)) {
          message = error.response.data.message;
        } else if (error instanceof Error) {
          message = error.message;
        }
        logger.error("Registration failed:", message);
        setLoading(false);
        throw new Error(message);
      } finally {
        // setLoading(false);
      }
    },
    [navigate]
  ); // Зависимость от navigate

  // Вычисляем статус аутентификации
  const isAuthenticated = useMemo(() => !!user && !!token, [user, token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      refreshUser, // <-- ADD THIS
    }),
    [
      user,
      token,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      refreshUser,
    ] // <-- ADD refreshUser
  );

  return (
    <AuthContext.Provider value={value}>
      {/* Опционально: показать индикатор загрузки, если loading === true */}
      {/* {loading ? <div>Загрузка...</div> : children} */}
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста аутентификации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
