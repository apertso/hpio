// src/pages/PasswordResetPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance"; // Прямое использование axios для этого эндпоинта
import logger from "../utils/logger";
import Spinner from "../components/Spinner";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const PasswordResetPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null); // Сообщение об успехе или ошибке
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const metadata = getPageMetadata("forgot-password");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);

    try {
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Инструкции по сбросу пароля отправлены."); // Сообщение с бэкенда
      logger.info(`Password reset request submitted for ${email}`);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const errorObj = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        logger.error(
          "Forgot password request failed:",
          errorObj.response?.data?.message || errorObj.message
        );
      } else {
        logger.error("Forgot password request failed:", String(err));
      }
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
    <>
      <PageMeta {...metadata} />

      <div className="flex justify-center items-center min-h-[calc(100vh-header-height-footer-height)] p-4">
        <FormBlock className="w-full max-w-md">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
            Сброс пароля
          </h2>
          {message && (
            <div
              className="bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-500/30 text-green-700 dark:text-green-400 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <span className="block sm:inline">{message}</span>
            </div>
          )}
          {error && (
            <div
              className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <p className="text-center text-gray-700 dark:text-gray-200 mb-4">
            Введите ваш Email для получения инструкций по сбросу пароля.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="flex items-center justify-center">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-56"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="sm" /> : "Отправить инструкции"}
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
        </FormBlock>
      </div>
    </>
  );
};

export default PasswordResetPage;
