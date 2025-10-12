// src/pages/RegisterPage.tsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Используем хук из контекста
import Spinner from "../components/Spinner";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { useToast } from "../context/ToastContext";

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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
  });

type RegisterFormInputs = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const metadata = getPageMetadata("register");

  const {
    register: formRegister,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    delayError: 1000,
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    try {
      await register(data.name, data.email, data.password);
      // Перенаправление происходит внутри AuthContext.register при успехе
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
        setError("email", { type: "server", message });
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

      <div className="flex justify-center items-center min-h-[calc(100vh-header-height-footer-height)] p-4">
        <FormBlock className="w-full max-w-md">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
            Регистрация
          </h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <Input
              label="Имя"
              id="name"
              type="text"
              placeholder="Ваше имя"
              {...formRegister("name")}
              onChange={(e) => {
                clearErrors("name");
                formRegister("name").onChange(e);
              }}
              required
              disabled={isSubmitting}
              error={errors.name?.message}
            />
            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="Email"
              {...formRegister("email")}
              onChange={(e) => {
                clearErrors("email");
                formRegister("email").onChange(e);
              }}
              required
              disabled={isSubmitting}
              error={errors.email?.message}
            />
            <div>
              <Input
                label="Пароль"
                id="password"
                type="password"
                placeholder="********"
                {...formRegister("password")}
                onChange={(e) => {
                  clearErrors("password");
                  formRegister("password").onChange(e);
                }}
                required
                disabled={isSubmitting}
                error={errors.password?.message}
              />
            </div>
            <Input
              label="Подтвердите пароль"
              id="confirm-password"
              type="password"
              placeholder="********"
              {...formRegister("confirmPassword")}
              onChange={(e) => {
                clearErrors("confirmPassword");
                formRegister("confirmPassword").onChange(e);
              }}
              required
              disabled={isSubmitting}
              error={errors.confirmPassword?.message}
            />
            <div className="flex items-center justify-center pt-2">
              <button
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-44"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner size="sm" /> : "Зарегистрироваться"}
              </button>
            </div>
            <div className="text-center text-sm text-gray-700 dark:text-gray-200">
              Уже есть аккаунт?{" "}
              <Link
                to="/login"
                className="font-bold text-blue-500 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-600"
              >
                Войти
              </Link>
            </div>
          </form>
        </FormBlock>
      </div>
    </>
  );
};

export default RegisterPage;
