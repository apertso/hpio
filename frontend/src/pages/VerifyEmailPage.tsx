// src/pages/VerifyEmailPage.tsx
import { useLanguage } from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/axiosInstance";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import PageMeta from "../components/PageMeta";
import { PageHeader } from "../components/layout/Page";
import { getPageMetadata } from "../utils/pageMetadata";

const VerifyEmailPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const metadata = getPageMetadata("verify-email");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState("");
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Токен для верификации не найден.");
      return;
    }

    const verify = async () => {
      try {
        const response = await authApi.verifyEmail(token);
        setStatus("success");
        setMessage(response.message || "Email успешно подтвержден!");
        // Refresh user data in context to update the isVerified flag
        await refreshUser();
        // Redirect to dashboard after a delay
        setTimeout(() => navigate("/dashboard"), 3000);
      } catch (error) {
        setStatus("error");
        setMessage(getErrorMessage(error));
      }
    };

    verify();
  }, [token, navigate, refreshUser]);

  return (
    <>
      <PageMeta {...metadata} />
      {/* В приложении: только кнопка меню на мобильных, без полосы шапки на десктопе */}
      <PageHeader desktopBar={false} />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
        {status === "verifying" && (
          <>
            <Spinner size="lg" />
            <h1 className="ui-page-title mt-4">
              {t("Подтверждаем ваш email...")}
            </h1>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="ui-page-title mb-1.5">
              {t("Верификация прошла успешно!")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t(message)}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("Вы будете перенаправлены на главную страницу через 3 секунды.")}
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="ui-page-title mb-1.5">
              {t("Ошибка верификации")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t(message)}
            </p>
            <Link to="/dashboard" className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer">
              {t("Вернуться на главную")}
            </Link>
          </>
        )}
      </div>
    </>
  );
};

export default VerifyEmailPage;
