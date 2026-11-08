import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { Link } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextInputField, EmailField, PasswordField } from "./Input";
import Checkbox from "./Checkbox";
import { Button } from "./Button";
import useFormPersistence from "../hooks/useFormPersistence";
import { getTranslatableErrorMessage } from "../utils/getErrorMessage";
import { localizeHref } from "../i18n/localePath";

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
  const { t, language } = useLanguage();
  const registerForm = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    delayError: 1000,
    defaultValues: { acceptTerms: false },
  });

  const { clearPersistedData } = useFormPersistence(
    registerForm,
    REGISTER_FORM_STORAGE_KEY
  );
  const { register, clearErrors, formState: { errors, isSubmitting } } = registerForm;
  const name = register("name");
  const email = register("email");
  const password = register("password");
  const confirmation = register("confirmPassword");
  const acceptTerms = registerForm.watch("acceptTerms");

  const handleRegisterSubmit: SubmitHandler<RegisterFormInputs> = async (
    data
  ) => {
    try {
      await onRegister(data.name, data.email, data.password);
      // Очищаем сохраненные данные формы после успешной регистрации
      clearPersistedData();
    } catch (err: unknown) {
      const message = getTranslatableErrorMessage(err, "Ошибка регистрации");

      if (message === "Пользователь с таким Email уже существует.") {
        registerForm.setError("email", { type: "server", message });
      } else {
        onShowToast(message, "error");
      }
    }
  };

  return (
    <>
      <h1 id="auth-title" className="public-title">
        {t("Создать аккаунт")}
      </h1>
      <form
        noValidate
        aria-busy={isSubmitting}
        onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
        className="mt-6 space-y-4"
      >
        <TextInputField
          label={t("Имя")}
          inputId="register-name"
          error={errors.name?.message}
          required
          autoComplete="name"
          disabled={isSubmitting}
          {...name}
          onChange={(event) => {
            clearErrors("name");
            void name.onChange(event);
          }}
        />
        <EmailField
          inputId="register-email"
          label={t("Электронная почта")}
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
        <PasswordField
          label={t("Пароль")}
          inputId="register-password"
          autoComplete="new-password"
          hint={t("Не менее 8 символов: заглавная и строчная латинские буквы, цифра и спецсимвол.")}
          {...password}
          onChange={(event) => {
            clearErrors("password");
            void password.onChange(event);
          }}
          error={errors.password?.message}
          disabled={isSubmitting}
          required
        />
        <PasswordField
          label={t("Подтвердите пароль")}
          inputId="register-confirm-password"
          autoComplete="new-password"
          {...confirmation}
          onChange={(event) => {
            clearErrors("confirmPassword");
            void confirmation.onChange(event);
          }}
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
          required
        />

        <div className="flex min-h-11 items-start gap-3 pt-2">
          <Checkbox
            id="accept-terms"
            aria-labelledby="accept-terms-label"
            checked={acceptTerms}
            disabled={isSubmitting}
            {...registerForm.register("acceptTerms")}
          />
          <label
            id="accept-terms-label"
            htmlFor="accept-terms"
            className="cursor-pointer text-sm leading-relaxed text-gray-700 dark:text-gray-300"
          >
            {t("Я принимаю")}{" "}
            <Link to={localizeHref(language, "/terms")} state={{ fromRegister: true }} className="public-link underline underline-offset-2">
              {t("Условия использования")}
            </Link>{" "}
            {t("и")}{" "}
            <Link to={localizeHref(language, "/privacy")} state={{ fromRegister: true }} className="public-link underline underline-offset-2">
              {t("Политику конфиденциальности")}
            </Link>
          </label>
        </div>

        <Button
          size="large"
          className="public-action w-full"
          type="submit"
          disabled={isSubmitting || !acceptTerms}
          loading={isSubmitting}
        >
          {t("Зарегистрироваться")}
        </Button>
      </form>
      <p className="mt-4 border-t border-gray-200 pt-2 text-center text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">
        {t("Уже есть аккаунт?")}{" "}
        <Link to="/login" className="public-link inline-flex min-h-11 items-center">
          {t("Войти")}
        </Link>
      </p>
    </>
  );
};

export default RegisterForm;
