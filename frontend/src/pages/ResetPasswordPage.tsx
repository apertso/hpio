import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import { Button } from "../components/Button";
import { PasswordField } from "../components/Input";
import AuthPanel from "../components/AuthPanel";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { getTranslatableErrorMessage } from "../utils/getErrorMessage";

const ResetPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const metadata = getPageMetadata("reset-password");

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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
      await axiosInstance.post("/auth/reset-password", {
        token,
        password,
      });
      setSuccess(true);
      logger.info("Password has been reset successfully.");
      setTimeout(() => navigate("/login"), 3000); // Перенаправляем на страницу входа через 3 секунды
    } catch (err: unknown) {
      setError(getTranslatableErrorMessage(err, "Не удалось сбросить пароль. Возможно, ваш токен истек или недействителен."));
      logger.error("Password reset failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageMeta {...metadata} />

      <AuthPanel>
        <h1 id="auth-title" className="public-title">
          {t("Установить новый пароль")}
        </h1>
        {error && (
          <div
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300"
            role="alert"
          >
            <span className="block sm:inline">{t(error)}</span>
          </div>
        )}
        {success && (
          <div
            className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950 dark:bg-indigo-400/10 dark:text-indigo-100"
            role="status"
          >
            <span className="block sm:inline">{t("Пароль успешно изменен.")}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={isLoading}>
          <PasswordField
            label={t("Новый пароль")}
            inputId="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading || success}
            description={t("Не менее 8 символов: заглавная и строчная латинские буквы, цифра и спецсимвол.")}
            autoComplete="new-password"
          />
          <PasswordField
            label={t("Подтвердите новый пароль")}
            inputId="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading || success}
            autoComplete="new-password"
          />
          <Button
            className="public-action w-full"
            size="large"
            type="submit"
            loading={isLoading}
            disabled={isLoading || success}
            label={t("Сменить пароль")}
          />
        </form>
        <Link to="/login" className="public-link mt-4 inline-flex min-h-11 items-center text-sm">
          {t("Вернуться ко входу")}
        </Link>
      </AuthPanel>
    </>
  );
};

export default ResetPasswordPage;
