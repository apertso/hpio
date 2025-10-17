// src/components/LoginForm.tsx
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "./Input";
import Spinner from "./Spinner";

const loginSchema = z.object({
  email: z.string().email("Неверный формат email."),
  password: z.string().min(1, "Пароль обязателен."),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

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

  const handleLoginSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      await onLogin(data.email, data.password);
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
        <Input
          label="Email"
          id="login-email"
          type="email"
          placeholder="your@email.com"
          {...loginForm.register("email")}
          error={loginForm.formState.errors.email?.message}
          disabled={loginForm.formState.isSubmitting}
          className="text-base py-3" // Larger touch targets for mobile
        />
        <div className="space-y-1">
          <Input
            label="Пароль"
            id="login-password"
            type="password"
            placeholder="********"
            {...loginForm.register("password")}
            error={loginForm.formState.errors.password?.message}
            disabled={loginForm.formState.isSubmitting}
            className="text-base py-3"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSwitchToPasswordReset}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              Забыли пароль?
            </button>
          </div>
        </div>
        <button
          className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base"
          type="submit"
          disabled={loginForm.formState.isSubmitting}
        >
          {loginForm.formState.isSubmitting ? <Spinner size="sm" /> : "Войти"}
        </button>
      </form>

      {/* Registration Link */}
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-4">
        Впервые здесь?{" "}
        <button
          onClick={onSwitchToRegister}
          className="text-blue-500 hover:text-blue-600 font-medium"
        >
          Создать аккаунт
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
