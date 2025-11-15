// src/components/LoginForm.tsx
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailField, PasswordField } from "./Input";
import { Button } from "./Button";
import Spinner from "./Spinner";
import useFormPersistence from "../hooks/useFormPersistence";

const loginSchema = z.object({
  email: z.string().email("Неверный формат email."),
  password: z.string().min(1, "Пароль обязателен."),
});

type LoginFormInputs = z.infer<typeof loginSchema>;
const LOGIN_FORM_STORAGE_KEY = "login_form_data";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onShowToast: (message: string, type: "success" | "error") => void;
  onSwitchToRegister: () => void;
  onSwitchToPasswordReset: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onLogin,
  onShowToast,
  onSwitchToRegister,
  onSwitchToPasswordReset,
}) => {
  const loginForm = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const { clearPersistedData } = useFormPersistence(
    loginForm,
    LOGIN_FORM_STORAGE_KEY
  );

  const handleLoginSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      await onLogin(data.email, data.password);
      clearPersistedData();
    } catch (err: unknown) {
      let message = "Ошибка входа";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message;
      }
      onShowToast(message, "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center self-center min-w-90 w-full max-w-140">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
        Вход в аккаунт
      </h2>
      <form
        onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
        className="space-y-6"
      >
        <EmailField
          inputId="login-email"
          placeholder="your@email.com"
          autoComplete="email"
          {...loginForm.register("email")}
          error={loginForm.formState.errors.email?.message}
          disabled={loginForm.formState.isSubmitting}
          className="text-base py-3"
          required
        />
        <div className="space-y-1">
          <PasswordField
            inputId="login-password"
            placeholder="********"
            autoComplete="current-password"
            {...loginForm.register("password")}
            error={loginForm.formState.errors.password?.message}
            disabled={loginForm.formState.isSubmitting}
            className="text-base py-3"
            required
          />
          <div className="flex justify-end">
            <Button
              variant="link"
              size="small"
              type="button"
              onClick={onSwitchToPasswordReset}
            >
              Забыли пароль?
            </Button>
          </div>
        </div>
        <Button
          variant="primary"
          size="large"
          type="submit"
          disabled={loginForm.formState.isSubmitting}
          className="w-full md:w-auto md:min-w-[24em] md:mx-auto"
        >
          {loginForm.formState.isSubmitting ? <Spinner size="sm" /> : "Войти"}
        </Button>
      </form>

      {/* Registration Link */}
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
        Впервые здесь?{" "}
        <Button variant="link" size="small" onClick={onSwitchToRegister}>
          Создать аккаунт
        </Button>
      </p>
    </div>
  );
};

export default LoginForm;
