import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { Link } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailField, PasswordField } from "./Input";
import { Button } from "./Button";
import useFormPersistence from "../hooks/useFormPersistence";
import { getTranslatableErrorMessage } from "../utils/getErrorMessage";

const loginSchema = z.object({
  email: z.string().email("Неверный формат email."),
  password: z.string().min(1, "Пароль обязателен."),
});

type LoginFormInputs = z.infer<typeof loginSchema>;
const LOGIN_FORM_STORAGE_KEY = "login_form_data";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onShowToast: (message: string, type: "success" | "error") => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onShowToast,
}) => {
  const { t } = useLanguage();
  const loginForm = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const { clearPersistedData } = useFormPersistence(
    loginForm,
    LOGIN_FORM_STORAGE_KEY
  );
  const { register, clearErrors, formState: { errors, isSubmitting } } = loginForm;
  const email = register("email");
  const password = register("password");

  const handleLoginSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      await onLogin(data.email, data.password);
      clearPersistedData();
    } catch (err: unknown) {
      onShowToast(getTranslatableErrorMessage(err, "Ошибка входа"), "error");
    }
  };

  return (
    <>
      <h1 id="auth-title" className="public-title">
        {t("Вход в аккаунт")}
      </h1>
      <form
        noValidate
        aria-busy={isSubmitting}
        onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
        className="mt-6 space-y-4"
      >
        <EmailField
          label={t("Электронная почта")}
          inputId="login-email"
          placeholder="example@example.com"
          autoComplete="email"
          {...email}
          onChange={(event) => {
            clearErrors("email");
            void email.onChange(event);
          }}
          error={errors.email?.message}
          disabled={isSubmitting}
          required
        />
        <div>
          <PasswordField
            inputId="login-password"
            autoComplete="current-password"
            {...password}
            onChange={(event) => {
              clearErrors("password");
              void password.onChange(event);
            }}
            error={errors.password?.message}
            disabled={isSubmitting}
            required
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="public-link inline-flex min-h-11 items-center text-sm">
              {t("Забыли пароль?")}
            </Link>
          </div>
        </div>
        <Button
          size="large"
          type="submit"
          loading={isSubmitting}
          className="public-action w-full"
          label={t("Войти")}
        />
      </form>

      <p className="mt-6 border-t border-gray-200 pt-4 text-center text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
        {t("Впервые здесь?")}{" "}
        <Link to="/register" className="public-link inline-flex min-h-11 items-center">
          {t("Создать аккаунт")}
        </Link>
      </p>
    </>
  );
};

export default LoginForm;
