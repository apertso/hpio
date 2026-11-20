// src/components/VerificationBanner.tsx
import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getTranslatableErrorMessage } from "../utils/getErrorMessage";
import Spinner from "./Spinner";
import { authApi } from "../api/axiosInstance";

const VerificationBanner: React.FC = () => {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isAuthenticated || user?.isVerified) {
    return null;
  }

  const handleResend = async (): Promise<void> => {
    setIsLoading(true);
    setMessage(null);
    try {
      await authApi.resendVerificationEmail();
      setMessage("Новая ссылка для подтверждения отправлена на ваш email.");
    } catch (error) {
      setMessage(getTranslatableErrorMessage(error, "Не удалось отправить ссылку для подтверждения."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex shrink-0 items-start gap-3 border-b border-[var(--ui-border)] bg-amber-50/60 px-4 py-2.5 dark:bg-amber-400/[0.06] md:items-center md:px-6"
      role="alert"
    >
      <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400 md:mt-0" />
      <div className="min-w-0 flex-grow text-sm">
        <p className="text-gray-900 dark:text-gray-100">
          <span className="font-medium">{t("Подтвердите свой email")}</span>
          <span className="hidden text-gray-500 dark:text-gray-400 md:inline">
            {" — "}
            {t("Пожалуйста, проверьте свой почтовый ящик и перейдите по ссылке для подтверждения, чтобы обезопасить свой аккаунт и иметь возможность восстановить пароль.")}
          </span>
        </p>
        <p className="mt-0.5 text-gray-500 dark:text-gray-400 md:hidden">
          {t("Пожалуйста, проверьте свой почтовый ящик и перейдите по ссылке для подтверждения, чтобы обезопасить свой аккаунт и иметь возможность восстановить пароль.")}
        </p>
        {message && (
          <p className="mt-0.5 text-gray-600 dark:text-gray-300">{t(message)}</p>
        )}
      </div>
      <button
        onClick={handleResend}
        disabled={isLoading}
        className="flex h-7 min-w-28 shrink-0 items-center justify-center rounded-md border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-2.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-white/[0.06] cursor-pointer"
      >
        {isLoading ? <Spinner size="sm" /> : t("Отправить снова")}
      </button>
    </div>
  );
};

export default VerificationBanner;
