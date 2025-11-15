// src/pages/PasswordResetPage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import axiosInstance from "../api/axiosInstance";
import FormBlock from "../components/FormBlock";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";
import PasswordResetForm from "../components/PasswordResetForm";
import { Button } from "../components/Button";

const PasswordResetPage: React.FC = () => {
  const metadata = getPageMetadata("forgot-password");
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handlePasswordReset = async (email: string): Promise<void> => {
    await axiosInstance.post("/auth/forgot-password", { email });
  };

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
            <PasswordResetForm
              onSubmit={handlePasswordReset}
              onShowToast={showToast}
            />
          </FormBlock>
        </div>
      </div>
    </>
  );
};

export default PasswordResetPage;
