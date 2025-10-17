// src/pages/VerifyEmailPage.tsx
import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/axiosInstance";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const VerifyEmailPage: React.FC = () => {
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

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
        {status === "verifying" && (
          <>
            <Spinner size="lg" />
            <h1 className="text-xl md:text-2xl font-bold mt-4 text-gray-900 dark:text-gray-100">
              Подтверждаем ваш email...
            </h1>
          </>
        )}
        {status === "success" && (
          <>
            <h1 className="text-3xl font-bold text-green-600 mb-4">
              Верификация прошла успешно!
            </h1>
            <p className="text-lg text-gray-900 dark:text-gray-100">
              {message}
            </p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Вы будете перенаправлены на главную страницу через 3 секунды.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-3xl font-bold text-red-600 mb-4">
              Ошибка верификации
            </h1>
            <p className="text-lg text-gray-900 dark:text-gray-100">
              {message}
            </p>
            <Link to="/dashboard" className="mt-4 text-blue-500">
              Вернуться на главную
            </Link>
          </>
        )}
      </div>
    </>
  );
};

export default VerifyEmailPage;
