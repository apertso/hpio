// src/components/PasswordResetForm.tsx
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EmailField } from "./Input";
import { Button } from "./Button";
import Spinner from "./Spinner";
import useFormPersistence from "../hooks/useFormPersistence";

const passwordResetSchema = z.object({
  email: z.string().email("Неверный формат email."),
});

type PasswordResetFormInputs = z.infer<typeof passwordResetSchema>;
const PASSWORD_RESET_FORM_STORAGE_KEY = "password_reset_form_data";

interface PasswordResetFormProps {
  onSubmit: (email: string) => Promise<void>;
  onShowToast: (message: string, type: "success" | "error") => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSubmit,
  onShowToast,
}) => {
  const form = useForm<PasswordResetFormInputs>({
    resolver: zodResolver(passwordResetSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const { clearPersistedData } = useFormPersistence(
    form,
    PASSWORD_RESET_FORM_STORAGE_KEY
  );

  const handleSubmit: SubmitHandler<PasswordResetFormInputs> = async (data) => {
    try {
      await onSubmit(data.email);
      clearPersistedData();
      onShowToast("Инструкции по сбросу пароля отправлены.", "success");
    } catch {
      // Для безопасности показываем универсальное сообщение даже при ошибке
      onShowToast(
        "Если пользователь с таким Email существует, инструкции по сбросу пароля будут отправлены на указанный адрес.",
        "success"
      );
    }
  };

  return (
    <div className="flex flex-col flex-1 justify-center self-center min-w-90 w-full max-w-140">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
        Сброс пароля
      </h2>
      <p className="text-center text-gray-700 dark:text-gray-200 mb-6 text-sm">
        Введите ваш Email для получения инструкций по сбросу пароля.
      </p>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <EmailField
          inputId="reset-email"
          placeholder="your@email.com"
          autoComplete="email"
          {...form.register("email")}
          error={form.formState.errors.email?.message}
          disabled={form.formState.isSubmitting}
          className="text-base py-3"
          required
        />
        <Button
          variant="primary"
          size="large"
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full md:w-auto md:min-w-[24em] md:mx-auto"
        >
          {form.formState.isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            "Отправить инструкции"
          )}
        </Button>
      </form>
    </div>
  );
};

export default PasswordResetForm;
