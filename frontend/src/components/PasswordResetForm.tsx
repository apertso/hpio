import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailField } from "./Input";
import { Button } from "./Button";
import useFormPersistence from "../hooks/useFormPersistence";

const passwordResetSchema = z.object({
  email: z.string().email("Неверный формат email."),
});

type PasswordResetFormInputs = z.infer<typeof passwordResetSchema>;
const PASSWORD_RESET_FORM_STORAGE_KEY = "password_reset_form_data";

interface PasswordResetFormProps {
  onSubmit: (email: string) => Promise<void>;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSubmit,
}) => {
  const { t } = useLanguage();
  const [requested, setRequested] = useState(false);
  const form = useForm<PasswordResetFormInputs>({
    resolver: zodResolver(passwordResetSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const { clearPersistedData } = useFormPersistence(
    form,
    PASSWORD_RESET_FORM_STORAGE_KEY
  );
  const { register, clearErrors, formState: { errors, isSubmitting } } = form;
  const email = register("email");

  const handleSubmit: SubmitHandler<PasswordResetFormInputs> = async (data) => {
    try {
      await onSubmit(data.email);
      clearPersistedData();
    } catch {
      // Не раскрываем, зарегистрирован ли адрес.
    }
    setRequested(true);
  };

  return (
    <>
      <h1 id="auth-title" className="public-title">
        {t("Сброс пароля")}
      </h1>
      <p className="mt-3 text-pretty text-base text-gray-700 dark:text-gray-300">
        {t("Введите ваш Email для получения инструкций по сбросу пароля.")}
      </p>
      <form noValidate aria-busy={isSubmitting} onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-4">
        <EmailField
          label={t("Электронная почта")}
          inputId="reset-email"
          placeholder="example@example.com"
          autoComplete="email"
          {...email}
          onChange={(event) => {
            setRequested(false);
            clearErrors("email");
            void email.onChange(event);
          }}
          error={errors.email?.message}
          disabled={isSubmitting}
          required
        />
        <Button
          size="large"
          type="submit"
          loading={isSubmitting}
          className="public-action w-full"
          label={t("Отправить инструкции")}
        />
      </form>
      <div role="status">
        {requested && (
          <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950 dark:bg-indigo-400/10 dark:text-indigo-100">
            {t("Если для этого адреса есть аккаунт, вы получите письмо со ссылкой для сброса пароля. Проверьте также папку «Спам».")}
          </p>
        )}
      </div>
      <Link to="/login" className="public-link mt-4 inline-flex min-h-11 items-center text-sm">
        {t("Вернуться ко входу")}
      </Link>
    </>
  );
};

export default PasswordResetForm;
