import React from "react";
import axiosInstance from "../api/axiosInstance";
import AuthPanel from "../components/AuthPanel";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import PasswordResetForm from "../components/PasswordResetForm";

const PasswordResetPage: React.FC = () => {
  const metadata = getPageMetadata("forgot-password");

  const handlePasswordReset = async (email: string): Promise<void> => {
    await axiosInstance.post("/auth/forgot-password", { email });
  };

  return (
    <>
      <PageMeta {...metadata} />
      <AuthPanel>
        <PasswordResetForm onSubmit={handlePasswordReset} />
      </AuthPanel>
    </>
  );
};

export default PasswordResetPage;
