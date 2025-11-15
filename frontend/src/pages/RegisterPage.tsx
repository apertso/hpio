// src/pages/RegisterPage.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import FormBlock from "../components/FormBlock";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";
import RegisterForm from "../components/RegisterForm";
import { Button } from "../components/Button";

const RegisterPage: React.FC = () => {
  const {
    register: registerUser,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const metadata = getPageMetadata("register");

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
        <div className="flex justify-start w-full max-w-xl">
          <Button
            variant="secondary"
            icon={<ArrowLeftIcon className="w-5 h-5" />}
            label="Назад"
            onClick={() => navigate("/login")}
          />
        </div>
        <div className="flex-1 flex w-full items-center justify-center">
          <FormBlock className="w-full max-w-xl px-4 md:p-6">
            <RegisterForm onRegister={registerUser} onShowToast={showToast} />
          </FormBlock>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
