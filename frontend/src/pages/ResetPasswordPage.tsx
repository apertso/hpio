import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import Spinner from "../components/Spinner";
import { PasswordField } from "../components/Input";
import FormBlock from "../components/FormBlock";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const metadata = getPageMetadata("reset-password");

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

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Пароль должен содержать хотя бы одну заглавную букву.");
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError("Пароль должен содержать хотя бы одну строчную букву.");
      return;
    }
    if (!/\d/.test(password)) {
      setError("Пароль должен содержать хотя бы одну цифру.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("Пароль должен содержать хотя бы один специальный символ.");
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
      setTimeout(() => navigate("/login"), 3000); // Перенаправляем на страницу входа через 3 секунды
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
    <>
      <PageMeta {...metadata} />

      <div className="flex justify-center items-center min-h-[calc(100vh-header-height-footer-height)] p-4">
        <FormBlock className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="Новый пароль"
              inputId="password"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading || !!success}
              description="Пароль должен содержать минимум 8 символов, включая заглавную букву, цифру и спецсимвол."
              autoComplete="new-password"
            />
            <PasswordField
              label="Подтвердите новый пароль"
              inputId="confirm-password"
              placeholder="********"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading || !!success}
              autoComplete="new-password"
            />
            <div className="flex items-center justify-center pt-2">
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
        </FormBlock>
      </div>
    </>
  );
};

export default ResetPasswordPage;
