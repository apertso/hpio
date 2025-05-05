// src/pages/PasswordResetPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance"; // Прямое использование axios для этого эндпоинта
import logger from "../utils/logger";

const PasswordResetPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null); // Сообщение об успехе или ошибке
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);

    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Инструкции по сбросу пароля отправлены."); // Сообщение с бэкенда
      logger.info(`Password reset request submitted for ${email}`);
    } catch (err: any) {
      logger.error(
        "Forgot password request failed:",
        err.response?.data?.message || err.message
      );
      // Отображаем безопасное сообщение из сервиса, даже если произошла ошибка на уровне запроса
      // Т.к. сервис спроектирован так, чтобы не раскрывать наличие email
      setMessage(
        "Если пользователь с таким Email существует, инструкции по сбросу пароля будут отправлены на указанный адрес."
      );
      // setError(err.response?.data?.message || 'Произошла ошибка.'); // Можно показывать более детальную ошибку для отладки
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-header-height-footer-height)] p-4">
      <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
          Сброс пароля
        </h2>
        {message && (
          <div
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{message}</span>
          </div>
        )}
        {error && ( // Отображаем, если есть специфическая ошибка запроса (опционально)
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <p className="text-center text-gray-700 dark:text-gray-200 mb-4">
          Введите ваш Email для получения инструкций по сбросу пароля.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-center mb-4">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Отправка..." : "Отправить инструкции"}
            </button>
          </div>
          <div className="text-center text-sm text-gray-700 dark:text-gray-200">
            <Link
              to="/login"
              className="font-bold text-blue-500 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
            >
              Вернуться ко входу
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetPage;
