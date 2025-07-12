// src/pages/RegisterPage.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Используем хук из контекста
import Spinner from "../components/Spinner";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";

const RegisterPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, isAuthenticated, loading: authLoading } = useAuth(); // Получаем функцию регистрации из контекста
  const navigate = useNavigate();

  useEffect(() => {
    // Если проверка аутентификации завершена и пользователь аутентифицирован, перенаправляем его
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Пароль и подтверждение пароля не совпадают.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов.");
      setIsLoading(false);
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Пароль должен содержать хотя бы одну заглавную букву.");
      setIsLoading(false);
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Пароль должен содержать хотя бы одну строчную букву.");
      setIsLoading(false);
      return;
    }
    if (!/\d/.test(password)) {
      setError("Пароль должен содержать хотя бы одну цифру.");
      setIsLoading(false);
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Пароль должен содержать хотя бы один специальный символ.");
      setIsLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      // Перенаправление происходит внутри AuthContext.register при успехе
    } catch (err: unknown) {
      let message = "Ошибка регистрации";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message;
      }
      setError(message); // Отобразить ошибку из контекста
    } finally {
      setIsLoading(false);
    }
  };

  // Пока идет проверка токена, показываем спиннер, чтобы избежать мелькания формы
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-header-height-footer-height)] p-4">
      <FormBlock className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
          Регистрация
        </h2>
        {error && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Имя"
            id="name"
            type="text"
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input
            label="Email"
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <div>
            <Input
              label="Пароль"
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Пароль должен содержать минимум 8 символов, включая заглавную
              букву, цифру и спецсимвол.
            </p>
          </div>
          <Input
            label="Подтвердите пароль"
            id="confirm-password"
            type="password"
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <div className="flex items-center justify-center pt-2">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-44"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? <Spinner size="sm" /> : "Зарегистрироваться"}
            </button>
          </div>
          <div className="text-center text-sm text-gray-700 dark:text-gray-200">
            Уже есть аккаунт?{" "}
            <Link
              to="/login"
              className="font-bold text-blue-500 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
            >
              Войти
            </Link>
          </div>
        </form>
      </FormBlock>
    </div>
  );
};

export default RegisterPage;
