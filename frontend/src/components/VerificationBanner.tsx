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
      className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4"
      role="alert"
    >
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-6 w-6 mr-3" />
        <div className="flex-grow">
          <p className="font-bold">{t("Подтвердите свой email")}</p>
          <p className="text-sm">
            {t("Пожалуйста, проверьте свой почтовый ящик и перейдите по ссылке для подтверждения, чтобы обезопасить свой аккаунт и иметь возможность восстановить пароль.")}
          </p>
          {message && <p className="text-sm mt-1">{t(message)}</p>}
        </div>
        <button
          onClick={handleResend}
          disabled={isLoading}
          className="ml-4 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 flex items-center min-w-32 justify-center"
        >
          {isLoading ? <Spinner size="sm" /> : t("Отправить снова")}
        </button>
      </div>
    </div>
  );
};

export default VerificationBanner;
