// src/components/PasswordResetForm.tsx
import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "./Input";
import Spinner from "./Spinner";

const passwordResetSchema = z.object({
  email: z.string().email("Неверный формат email."),
});

type PasswordResetFormInputs = z.infer<typeof passwordResetSchema>;

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

  const handleSubmit: SubmitHandler<PasswordResetFormInputs> = async (data) => {
    try {
      await onSubmit(data.email);
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
        <Input
          label="Email"
          id="reset-email"
          type="email"
          placeholder="your@email.com"
          {...form.register("email")}
          error={form.formState.errors.email?.message}
          disabled={form.formState.isSubmitting}
          className="text-base py-3"
        />
        <button
          className="w-full bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            "Отправить инструкции"
          )}
        </button>
      </form>
    </div>
  );
};

export default PasswordResetForm;
