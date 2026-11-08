import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthPanel from "../components/AuthPanel";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";
import RegisterForm from "../components/RegisterForm";

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

  return (
    <>
      <PageMeta {...metadata} />
      <AuthPanel>
        <RegisterForm onRegister={registerUser} onShowToast={showToast} />
      </AuthPanel>
    </>
  );
};

export default RegisterPage;
