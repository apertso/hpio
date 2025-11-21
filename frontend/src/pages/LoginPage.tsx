// src/pages/LoginPage.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import FormBlock from "../components/FormBlock";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";
import LoginForm from "../components/LoginForm";
import { isTauriMobile } from "../utils/platform";

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const metadata = getPageMetadata("login");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageMeta {...metadata} />
      <div className="flex flex-col flex-1 items-center w-full px-4 py-6 gap-6">
        <button
          type="button"
          onClick={() => {
            if (!isTauriMobile()) {
              navigate("/");
            }
          }}
          className="flex items-center justify-center pt-8 pb-8 w-full max-w-xl rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          <img
            src="/icons/favicon.svg"
            alt="Хочу Плачу Logo"
            className="w-14 h-14 mr-6 flex-shrink-0"
          />
          <div className="flex flex-col text-left">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Хочу Плачу
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ваш финансовый помощник
            </p>
          </div>
        </button>
        <div className="flex-1 flex w-full items-center justify-center">
          <FormBlock className="w-full max-w-xl bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <LoginForm
              onLogin={login}
              onShowToast={showToast}
              onSwitchToRegister={() => navigate("/register")}
              onSwitchToPasswordReset={() => navigate("/forgot-password")}
            />
          </FormBlock>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
