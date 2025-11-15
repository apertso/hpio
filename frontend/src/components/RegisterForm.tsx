// src/components/RegisterForm.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextInputField, EmailField, PasswordField } from "./Input";
import Checkbox from "./Checkbox";
import { Button } from "./Button";
import useFormPersistence from "../hooks/useFormPersistence";

const REGISTER_FORM_STORAGE_KEY = "register_form_data";

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
  const navigate = useNavigate();
  const registerForm = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const { clearPersistedData } = useFormPersistence(
    registerForm,
    REGISTER_FORM_STORAGE_KEY
  );

  const handleRegisterSubmit: SubmitHandler<RegisterFormInputs> = async (
    data
  ) => {
    try {
      await onRegister(data.name, data.email, data.password);
      // Очищаем сохраненные данные формы после успешной регистрации
      clearPersistedData();
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
        <TextInputField
          label="Имя"
          inputId="register-name"
          error={registerForm.formState.errors.name?.message}
          required
          placeholder="Ваше имя"
          disabled={registerForm.formState.isSubmitting}
          className="text-base py-3"
          {...registerForm.register("name")}
        />
        <EmailField
          inputId="register-email"
          placeholder="your@email.com"
          autoComplete="email"
          {...registerForm.register("email")}
          error={registerForm.formState.errors.email?.message}
          disabled={registerForm.formState.isSubmitting}
          className="text-base py-3"
          required
        />
        <PasswordField
          label="Пароль"
          inputId="register-password"
          placeholder="********"
          autoComplete="new-password"
          {...registerForm.register("password")}
          error={registerForm.formState.errors.password?.message}
          disabled={registerForm.formState.isSubmitting}
          className="text-base py-3"
          required
        />
        <PasswordField
          label="Подтвердите пароль"
          inputId="register-confirm-password"
          placeholder="********"
          autoComplete="new-password"
          {...registerForm.register("confirmPassword")}
          error={registerForm.formState.errors.confirmPassword?.message}
          disabled={registerForm.formState.isSubmitting}
          className="text-base py-3"
          required
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
            <Button
              variant="link"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                navigate("/terms");
              }}
            >
              Условия использования
            </Button>{" "}
            и{" "}
            <Button
              variant="link"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                navigate("/privacy");
              }}
            >
              Политику конфиденциальности
            </Button>
          </label>
        </div>

        <Button
          variant="primary"
          size="large"
          className="w-full mt-4 md:w-auto md:min-w-[24em] md:mx-auto"
          type="submit"
          disabled={
            registerForm.formState.isSubmitting ||
            !registerForm.watch("acceptTerms")
          }
          loading={registerForm.formState.isSubmitting}
        >
          Зарегистрироваться
        </Button>
      </form>
    </div>
  );
};

export default RegisterForm;
