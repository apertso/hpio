// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import axiosInstance from "../api/axiosInstance"; // Ваш настроенный экземпляр axios
import { useNavigate } from "react-router-dom";
import logger from "../utils/logger"; // Используем простой логгер на фронтенде
import userApi from "../api/userApi"; // <-- ADD THIS
import { isTauriMobile } from "../utils/platform";

export interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  photoPath?: string | null; // <-- ADD THIS
  notificationMethod?: "email" | "push" | "none";
  notificationTime?: string;
  timezone?: string; // <-- ADD THIS LINE
  fcmToken?: string | null;
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
  refreshUser: () => Promise<void>; // Синхронное обновление профиля (старый путь)
  revalidateMe: (reason?: string) => Promise<void>; // Легкая пере-валидация /user/me
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

const USER_STORAGE_KEY = "user";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  // Инициализируем состояние, пытаясь получить данные из localStorage
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("jwtToken")
  );
  const [loading, setLoading] = useState(true); // Флаг загрузки при инициализации

  // ETag и контроль конкурентных запросов
  const etagRef = useRef<string | null>(null);
  const inflightRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  const focusDebounceRef = useRef<number | null>(null);

  // Функция выхода
  const logout = useCallback(() => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    delete axiosInstance.defaults.headers.common["Authorization"]; // Удаляем заголовок Authorization
    logger.info("Logout successful");
    // Для мобильного приложения перенаправляем на / (страница входа), для десктопа - на /login
    navigate(isTauriMobile() ? "/" : "/login");
  }, [navigate]); // Зависимость от navigate

  // Эффект для проверки токена при загрузке приложения и настройки Axios
  useEffect(() => {
    if (token) {
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
        if (
          error.response &&
          error.response.status === 401 &&
          !error.config.url.includes("/auth/login") &&
          !error.config.url.includes("/auth/register")
        ) {
          logger.warn("Received 401 Unauthorized. Logging out.");
          logout(); // Автоматический выход при неавторизованном запросе
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, [navigate, logout]); // Зависимости от navigate и logout

  // Легкая пере-валидация /user/me (с ETag/304)
  const revalidateMe = useCallback(async () => {
    if (!token) return; // нет смысла запрашивать без токена
    const callId = ++inflightRef.current;
    try {
      const resp = await userApi.getMe(etagRef.current || undefined);
      if (resp.status === 304) {
        if (callId === inflightRef.current) {
          // нет изменений
        }
        return;
      }
      if (callId !== inflightRef.current) return;
      if ("etag" in resp && resp.etag) etagRef.current = resp.etag;
      const next = resp.data as User;
      const wasUnverified = user?.isVerified === false;
      setUser(next);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
      if (wasUnverified && next.isVerified) {
        logger.info("Email verified detected via revalidation.");
      }
    } catch (error) {
      // 401 перехватится интерцептором и вызовет logout
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message || "")
          : String(error);
      logger.warn("Revalidate /user/me failed:", message);
    }
  }, [token, user]);

  // Дебаунс для событий фокуса/видимости
  const debounceRevalidate = useCallback(() => {
    if (focusDebounceRef.current) window.clearTimeout(focusDebounceRef.current);
    focusDebounceRef.current = window.setTimeout(() => {
      revalidateMe();
    }, 500);
  }, [revalidateMe]);

  // События: видимость, online
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") debounceRevalidate();
    };
    const onOnline = () => revalidateMe();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [revalidateMe, debounceRevalidate]);

  // Поллинг только если пользователь не верифицирован
  useEffect(() => {
    const shouldPoll =
      !!user &&
      user.isVerified === false &&
      document.visibilityState === "visible" &&
      navigator.onLine;

    if (!shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (!pollRef.current) {
      pollRef.current = window.setInterval(() => revalidateMe(), 60000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [user?.isVerified, revalidateMe]);

  // Первичная пере-валидация при монтировании
  useEffect(() => {
    revalidateMe();

    // Register FCM token on app startup (Android only)
    if (isTauriMobile()) {
      (async () => {
        try {
          const { getFcmToken, registerFcmToken } = await import(
            "../api/fcmApi"
          );
          const fcmToken = await getFcmToken();
          if (fcmToken) {
            await registerFcmToken(fcmToken);
            logger.info("FCM token registered successfully");
          }
        } catch (error) {
          logger.error("Failed to register FCM token:", error);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Полное обновление профиля (старый путь)
  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await userApi.getProfile();
      setUser(freshUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
      logger.info("User data refreshed.");
    } catch (error) {
      logger.error("Failed to refresh user data, logging out.", error);
      logout();
    }
  }, [logout]);

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
          notificationMethod,
          notificationTime,
          timezone,
        } = res.data;

        localStorage.setItem("jwtToken", token);
        const userData = {
          id,
          name,
          email: userEmail,
          photoPath,
          isVerified,
          notificationMethod,
          notificationTime,
          timezone,
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));

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
          timezone,
        } = res.data;

        localStorage.setItem("jwtToken", token);
        const regUserData: User = {
          id: regId,
          name: regName,
          email: regEmail,
          photoPath: regPhotoPath,
          isVerified,
          notificationMethod: "email", // default
          notificationTime: "09:30", // default
          timezone,
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(regUserData));

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
      refreshUser,
      revalidateMe,
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
      revalidateMe,
    ]
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
