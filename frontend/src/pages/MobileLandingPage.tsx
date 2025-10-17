// src/pages/MobileLandingPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import FormBlock from "../components/FormBlock";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import PasswordResetForm from "../components/PasswordResetForm";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import axiosInstance from "../api/axiosInstance";
type TabType = "login" | "register" | "password-reset";
const MobileLandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const metadata = getPageMetadata("landing");
  const handlePasswordReset = async (email: string) => {
    const res = await axiosInstance.post("/auth/forgot-password", { email });
    return res.data;
  };
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
      {/* Top Section - Only show on login tab */}
      {activeTab === "login" && (
        <div className="flex items-center justify-center pt-8 pb-8 px-4">
          <img
            src="/icons/favicon.svg"
            alt="Хочу Плачу Logo"
            className="w-14 h-14 mr-6 flex-shrink-0"
          />
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Хочу Плачу
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ваш финансовый помощник
            </p>
          </div>
        </div>
      )}
      {/* Main Form */}
      <FormBlock className="flex flex-col flex-1 px-8 pb-24">
        {activeTab === "login" ? (
          <LoginForm
            onLogin={login}
            onShowToast={showToast}
            onSwitchToRegister={() => setActiveTab("register")}
            onSwitchToPasswordReset={() => setActiveTab("password-reset")}
          />
        ) : (
          <>
            {/* Back Button */}
            <div className="flex justify-start mb-4">
              <button
                onClick={() => setActiveTab("login")}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                Назад
              </button>
            </div>
            {activeTab === "register" ? (
              <RegisterForm onRegister={register} onShowToast={showToast} />
            ) : (
              <PasswordResetForm
                onSubmit={handlePasswordReset}
                onShowToast={showToast}
              />
            )}
          </>
        )}
      </FormBlock>
    </>
  );
};
export default MobileLandingPage;
