// src/components/RegisterForm.tsx
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "./Input";
import Checkbox from "./Checkbox";
import Spinner from "./Spinner";

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

type RegisterFormInputs = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onShowToast: (message: string, type: "success" | "error") => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onRegister,
  onShowToast,
}) => {
  const registerForm = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const handleRegisterSubmit: SubmitHandler<RegisterFormInputs> = async (
    data
  ) => {
    try {
      await onRegister(data.name, data.email, data.password);
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
        onShowToast(message, "error");
      }
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center self-center min-w-90 w-full max-w-140">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
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
          error={registerForm.formState.errors.confirmPassword?.message}
          disabled={registerForm.formState.isSubmitting}
          className="text-base py-3"
        />

        {/* Terms and Privacy Checkbox */}
        <div className="flex items-center space-x-4 mt-4">
          <Checkbox
            id="accept-terms"
            {...registerForm.register("acceptTerms")}
          />
          <label
            htmlFor="accept-terms"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            Я принимаю{" "}
            <a
              href="/terms"
              className="text-blue-500 hover:text-blue-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Условия использования
            </a>{" "}
            и{" "}
            <a
              href="/privacy"
              className="text-blue-500 hover:text-blue-600"
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
    </div>
  );
};

export default RegisterForm;
