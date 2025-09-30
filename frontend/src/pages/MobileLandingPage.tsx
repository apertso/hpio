// src/pages/MobileLandingPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";
import { BottomNavigationBar } from "../components";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";

const loginSchema = z.object({
  email: z.string().email("Неверный формат email."),
  password: z.string().min(1, "Пароль обязателен."),
});

const registerSchema = z
  .object({
    name: z.string().min(1, "Имя обязательно для заполнения."),
    email: z.string().email("Неверный формат email."),
    password: z
      .string()
      .min(8, "Пароль должен быть не менее 8 символов.")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву.")
      .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву.")
      .regex(/\d/, "Пароль должен содержать хотя бы одну цифру.")
      .regex(
        /[^A-Za-z0-9]/,
        "Пароль должен содержать хотя бы один специальный символ."
      ),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message:
        "Необходимо принять условия использования и политику конфиденциальности.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
  });

type LoginFormInputs = z.infer<typeof loginSchema>;
type RegisterFormInputs = z.infer<typeof registerSchema>;

type TabType = "login" | "register";

const MobileLandingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("login");
  const { login, register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const metadata = getPageMetadata("landing");

  const loginForm = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const registerForm = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    delayError: 1000,
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLoginSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      await login(data.email, data.password);
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
      showToast(message, "error");
    }
  };

  const handleRegisterSubmit: SubmitHandler<RegisterFormInputs> = async (
    data
  ) => {
    try {
      await register(data.name, data.email, data.password);
    } catch (err: unknown) {
      let message = "Ошибка регистрации";
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        message = (err as { message: string }).message;
      }

      if (message.includes("уже существует")) {
        registerForm.setError("email", { type: "server", message });
      } else {
        showToast(message, "error");
      }
    }
  };

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

      <div className="min-h-full">
        {/* Top Section */}
        <div className="flex flex-col items-center pt-12 pb-8 px-4">
          <img
            src="/icons/favicon.svg"
            alt="Хочу Плачу Logo"
            className="w-16 h-16 mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Хочу Плачу
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Ваш финансовый помощник
          </p>
        </div>

        {/* Main Form */}
        <div className="flex justify-center px-4 pb-24">
          <FormBlock className="w-full max-w-md">
            {activeTab === "login" ? (
              <>
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
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
                  <button
                    className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base"
                    type="submit"
                    disabled={loginForm.formState.isSubmitting}
                  >
                    {loginForm.formState.isSubmitting ? (
                      <Spinner size="sm" />
                    ) : (
                      "Войти"
                    )}
                  </button>
                </form>

                {/* Privacy Note */}
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4 px-4">
                  Нажимая «Войти», вы соглашаетесь с нашей{" "}
                  <a
                    href="/privacy"
                    className="text-blue-500 hover:text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Политикой конфиденциальности
                  </a>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                  Создать аккаунт
                </h2>
                <form
                  onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                  className="space-y-6"
                >
                  <Input
                    label="Имя"
                    id="register-name"
                    type="text"
                    placeholder="Ваше имя"
                    {...registerForm.register("name")}
                    error={registerForm.formState.errors.name?.message}
                    disabled={registerForm.formState.isSubmitting}
                    className="text-base py-3"
                  />
                  <Input
                    label="Email"
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    {...registerForm.register("email")}
                    error={registerForm.formState.errors.email?.message}
                    disabled={registerForm.formState.isSubmitting}
                    className="text-base py-3"
                  />
                  <Input
                    label="Пароль"
                    id="register-password"
                    type="password"
                    placeholder="********"
                    {...registerForm.register("password")}
                    error={registerForm.formState.errors.password?.message}
                    disabled={registerForm.formState.isSubmitting}
                    className="text-base py-3"
                  />
                  <Input
                    label="Подтвердите пароль"
                    id="register-confirm-password"
                    type="password"
                    placeholder="********"
                    {...registerForm.register("confirmPassword")}
                    error={
                      registerForm.formState.errors.confirmPassword?.message
                    }
                    disabled={registerForm.formState.isSubmitting}
                    className="text-base py-3"
                  />

                  {/* Terms and Privacy Checkbox */}
                  <div className="flex items-start space-x-3 mt-4">
                    <input
                      id="accept-terms"
                      type="checkbox"
                      {...registerForm.register("acceptTerms")}
                      className="mt-1 h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label
                      htmlFor="accept-terms"
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      Я принимаю{" "}
                      <a
                        href="/terms"
                        className="text-blue-500 hover:text-blue-600 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Условия использования
                      </a>{" "}
                      и{" "}
                      <a
                        href="/privacy"
                        className="text-blue-500 hover:text-blue-600 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Политику конфиденциальности
                      </a>
                    </label>
                  </div>

                  <button
                    className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base mt-4"
                    type="submit"
                    disabled={
                      registerForm.formState.isSubmitting ||
                      !registerForm.watch("acceptTerms")
                    }
                  >
                    {registerForm.formState.isSubmitting ? (
                      <Spinner size="sm" />
                    ) : (
                      "Зарегистрироваться"
                    )}
                  </button>
                </form>
              </>
            )}
          </FormBlock>
        </div>

        {/* Bottom Navigation */}
        <BottomNavigationBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
};

export default MobileLandingPage;
