import React, { useEffect, useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form"; // Import necessary types
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import "react-datepicker/dist/react-datepicker.css";
import SeriesEditModal from "./SeriesEditModal";

import PaymentDetailsSection from "./PaymentDetailsSection";

import PaymentCategorySelect from "./PaymentCategorySelect";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";
import PaymentFileUploadSection from "./PaymentFileUploadSection";
import IconSelector from "./IconSelector"; // Import IconSelector
import { BuiltinIcon } from "../utils/builtinIcons"; // Import BuiltinIcon type
import Spinner from "./Spinner";

// PaymentIconInfo interface is now imported from IconPicker.tsx

// Схема валидации формы платежа
// НЕ добавляем здесь поля iconType, builtinIconName, iconPath - они управляются IconPicker и передаются через callback
const paymentFormSchema = z.object({
  title: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
  amount: z
    .number({ invalid_type_error: "Сумма должна быть числом" })
    .min(0.01, "Сумма должна быть больше 0"),
  dueDate: z.date({
    required_error: "Дата срока оплаты обязательна",
    invalid_type_error: "Неверный формат даты",
  }),
  categoryId: z
    .string()
    .uuid("Неверный формат ID категории")
    .nullable()
    .optional()
    .or(z.literal("")), // Allow empty string for "Без категории"
  // !!! Поля рекуррентности
  // Шаблон повторения - обязателен, если isRecurrent true
  recurrencePattern: z
    .enum(["daily", "weekly", "monthly", "yearly"])
    .nullable()
    .optional(), // Может быть null, если isRecurrent false
  // Дата окончания - опциональна, если isRecurrent true
  recurrenceEndDate: z
    .date({ invalid_type_error: "Неверный формат даты окончания" })
    .nullable()
    .optional(),

  // TODO: Добавить опцию "Создать как завершенный" (только для создания)
  // createAsCompleted: z.boolean().optional(),
});

// Определяем тип данных формы, включая опциональные поля из формы
export type PaymentFormInputs = z.infer<typeof paymentFormSchema> & {
  // createAsCompleted?: boolean; // Добавляем опцию, если она будет в форме
};

interface PaymentFormProps {
  paymentId?: string;
  onSuccess: (newPaymentId?: string) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentId,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = !!paymentId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: rhfIsSubmitting },
    setValue,
    watch,
    clearErrors,
    reset,
  } = useForm<PaymentFormInputs>({
    resolver: zodResolver(paymentFormSchema),
  });

  const [currentSeriesId, setCurrentSeriesId] = useState<string | null>(null);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [attachedFile, setAttachedFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<BuiltinIcon | null>(
    null
  );
  const [createAsCompleted, setCreateAsCompleted] = useState(false);

  useEffect(() => {
    if (isEditMode && paymentId) {
      const fetchPayment = async () => {
        setIsLoading(true);
        setFormError(null);
        try {
          const res = await axiosInstance.get(`/payments/${paymentId}`);
          const paymentData = res.data;

          reset({
            title: paymentData.title,
            amount: parseFloat(paymentData.amount),
            dueDate: new Date(paymentData.dueDate),
            categoryId: paymentData.category?.id || "",
            recurrencePattern: null,
            recurrenceEndDate: null,
          });

          if (paymentData.seriesId) {
            setCurrentSeriesId(paymentData.seriesId);
          } else {
            setCurrentSeriesId(null);
          }

          if (paymentData.filePath && paymentData.fileName) {
            setAttachedFile({
              filePath: paymentData.filePath,
              fileName: paymentData.fileName,
            });
          } else {
            setAttachedFile(null);
          }

          setSelectedIconName(paymentData.builtinIconName || null);
          setIsLoading(false);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof AxiosError && error.response?.data?.message
              ? error.response.data.message
              : error instanceof Error
              ? error.message
              : "Failed to load payment data.";
          logger.error(
            `Failed to fetch payment ${paymentId}:`,
            errorMessage,
            error
          );
          setFormError(errorMessage);
          setIsLoading(false);
        }
      };
      fetchPayment();
    } else {
      reset({
        title: "",
        amount: undefined,
        dueDate: new Date(),
        categoryId: null,
        recurrencePattern: null,
        recurrenceEndDate: null,
      });
      setCurrentSeriesId(null);
      setAttachedFile(null);
      setSelectedIconName(null);
      setCreateAsCompleted(false);
      setFormError(null);
      setIsLoading(false);
    }
  }, [paymentId, isEditMode, reset]);

  const handleIconChange = useCallback((iconName: BuiltinIcon | null) => {
    setSelectedIconName(iconName);
  }, []);

  const handleFormSubmit: SubmitHandler<PaymentFormInputs> = async (data) => {
    setFormError(null);

    const basePayloadData = {
      title: data.title,
      amount: Number(data.amount),
      dueDate: data.dueDate
        ? `${data.dueDate.getFullYear()}-${String(
            data.dueDate.getMonth() + 1
          ).padStart(2, "0")}-${String(data.dueDate.getDate()).padStart(
            2,
            "0"
          )}`
        : null,
      categoryId: data.categoryId === "" ? null : data.categoryId,
      builtinIconName: selectedIconName,
    };

    let finalPayload: any = { ...basePayloadData };

    if (isEditMode) {
      if (!currentSeriesId && data.recurrencePattern) {
        finalPayload.recurrencePattern = data.recurrencePattern;
        finalPayload.recurrenceEndDate = data.recurrenceEndDate
          ? data.recurrenceEndDate.toISOString().split("T")[0]
          : null;
      }
    } else {
      if (data.recurrencePattern) {
        finalPayload = {
          ...basePayloadData,
          recurrencePattern: data.recurrencePattern || null,
          recurrenceEndDate:
            data.recurrencePattern && data.recurrenceEndDate
              ? data.recurrenceEndDate.toISOString().split("T")[0]
              : null,
          createAsCompleted: createAsCompleted,
        };
      } else {
        finalPayload.recurrencePattern = null;
        finalPayload.recurrenceEndDate = null;
      }
      finalPayload.createAsCompleted = createAsCompleted;
    }

    try {
      if (isEditMode && paymentId) {
        await axiosInstance.put(`/payments/${paymentId}`, finalPayload);
        logger.info(`Payment updated (ID: ${paymentId})`);
        onSuccess(paymentId);
      } else {
        const res = await axiosInstance.post("/payments", finalPayload);
        const newPaymentId = res.data.id;
        logger.info("Payment created", res.data);
        onSuccess(newPaymentId);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "An error occurred while saving.";
      logger.error("Failed to save payment:", errorMessage, error);
      setFormError(errorMessage);
    }
  };

  const combinedIsSubmitting = rhfIsSubmitting || isLoading;

  if (isLoading && isEditMode) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="space-y-6"
        noValidate
      >
        {formError && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg"
            role="alert"
          >
            {formError}
          </div>
        )}

        <PaymentDetailsSection
          register={register}
          errors={errors}
          setValue={setValue}
          watchDueDate={watch("dueDate")}
          isSubmitting={combinedIsSubmitting}
        />
        <PaymentCategorySelect
          register={register}
          errors={errors}
          setValue={setValue}
          watchCategoryId={watch("categoryId")}
          isSubmitting={combinedIsSubmitting}
        />
        {!currentSeriesId ? (
          <PaymentRecurrenceSection
            register={register}
            errors={errors}
            setValue={setValue}
            watchRecurrencePattern={watch("recurrencePattern")}
            watchRecurrenceEndDate={watch("recurrenceEndDate")}
            isSubmitting={combinedIsSubmitting}
            clearErrors={clearErrors}
          />
        ) : (
          <div className="my-4 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Этот платеж является частью регулярной серии. Для изменения
              шаблона повторения, используйте кнопку "Изменить шаблон
              повторения".
            </p>
          </div>
        )}
        {isEditMode && currentSeriesId && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                setIsSeriesModalOpen(true);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500 transition-colors duration-200 cursor-pointer"
              disabled={combinedIsSubmitting}
            >
              Изменить шаблон повторения
            </button>
          </div>
        )}
        <IconSelector
          selectedIconName={selectedIconName}
          onIconChange={handleIconChange}
          isFormSubmitting={combinedIsSubmitting}
        />
        <PaymentFileUploadSection
          paymentId={paymentId}
          initialFile={attachedFile}
          isSubmitting={combinedIsSubmitting}
          setFormError={setFormError}
        />
        {!isEditMode && (
          <div className="flex items-center">
            <input
              id="createAsCompleted"
              type="checkbox"
              checked={createAsCompleted}
              onChange={(e) => setCreateAsCompleted(e.target.checked)}
              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
              disabled={combinedIsSubmitting}
            />
            <label
              htmlFor="createAsCompleted"
              className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
            >
              Создать как выполненный
            </label>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500"
            disabled={combinedIsSubmitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-w-28"
            disabled={combinedIsSubmitting}
          >
            {combinedIsSubmitting ? <Spinner size="sm" /> : "Сохранить"}
          </button>
        </div>
      </form>
      {currentSeriesId && (
        <SeriesEditModal
          seriesId={currentSeriesId}
          isOpen={isSeriesModalOpen}
          onClose={() => setIsSeriesModalOpen(false)}
          onSuccess={() => {
            setIsSeriesModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default PaymentForm;
