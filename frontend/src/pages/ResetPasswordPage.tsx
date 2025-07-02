import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import Spinner from "../components/Spinner";

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Токен для сброса пароля не найден.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await axiosInstance.post("/auth/reset-password", {
        token,
        password,
      });
      setSuccess(res.data.message || "Пароль успешно изменен!");
      logger.info("Password has been reset successfully.");
      setTimeout(() => navigate("/login"), 3000); // Redirect to login after 3 seconds
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const errObj = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        const errorMessage =
          errObj.response?.data?.message ||
          "Не удалось сбросить пароль. Возможно, ваш токен истек или недействителен.";
        setError(errorMessage);
        logger.error("Password reset failed:", errorMessage);
      } else {
        const errorMessage = "Произошла неизвестная ошибка при сбросе пароля.";
        setError(errorMessage);
        logger.error("Password reset failed:", String(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-header-height-footer-height)] p-4">
      <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
          Установить новый пароль
        </h2>
        {error && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {success && (
          <div
            className="bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-500/30 text-green-700 dark:text-green-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{success}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Новый пароль
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
              id="password"
              type="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || !!success}
            />
          </div>
          <div className="mb-6">
            <label
              className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2"
              htmlFor="confirm-password"
            >
              Подтвердите новый пароль
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
              id="confirm-password"
              type="password"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading || !!success}
            />
          </div>
          <div className="flex items-center justify-center mb-4">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-44"
              type="submit"
              disabled={isLoading || !!success}
            >
              {isLoading ? <Spinner size="sm" /> : "Сменить пароль"}
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

export default ResetPasswordPage;
