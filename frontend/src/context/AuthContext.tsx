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

interface User {
  id: string;
  email: string;
  // Добавьте другие поля пользователя, если они будут возвращаться с бэкенда
}

interface AuthContextProps {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean; // Индикатор загрузки (например, при попытке автоматического входа по токену)
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  //forgotPassword: (email: string) => Promise<void>; // Можно добавить сюда, но пока оставим на странице
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

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

  // Функция входа
  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const res = await axiosInstance.post("/auth/login", {
          email,
          password,
        });
        const { token, id, email: userEmail } = res.data;

        localStorage.setItem("jwtToken", token);
        localStorage.setItem("user", JSON.stringify({ id, email: userEmail })); // Храним базовые данные пользователя

        setToken(token);
        setUser({ id, email: userEmail });
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`; // Настраиваем Axios заголовок
        logger.info("Login successful");
        navigate("/"); // Перенаправить на главную страницу после входа
      } catch (error: any) {
        logger.error(
          "Login failed:",
          error.response?.data?.message || error.message
        );
        setLoading(false);
        throw new Error(error.response?.data?.message || "Ошибка входа"); // Пробросить ошибку для отображения в UI
      } finally {
        // setLoading(false); // Уже сделано в catch или можно здесь, если нет ошибки
      }
    },
    [navigate]
  ); // Зависимость от navigate

  // Функция регистрации
  const register = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const res = await axiosInstance.post("/auth/register", {
          email,
          password,
        });
        const { token, id, email: userEmail } = res.data;

        localStorage.setItem("jwtToken", token);
        localStorage.setItem("user", JSON.stringify({ id, email: userEmail }));

        setToken(token);
        setUser({ id, email: userEmail });
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        logger.info("Registration successful");
        navigate("/"); // Перенаправить на главную страницу после регистрации
      } catch (error: any) {
        logger.error(
          "Registration failed:",
          error.response?.data?.message || error.message
        );
        setLoading(false);
        throw new Error(error.response?.data?.message || "Ошибка регистрации");
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
    }),
    [user, token, isAuthenticated, loading, login, register, logout]
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
