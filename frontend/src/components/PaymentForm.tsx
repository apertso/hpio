import React, { useEffect, useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";
import { seriesApi } from "../api/axiosInstance";

import PaymentDetailsSection from "./PaymentDetailsSection";
import PaymentCategorySelect from "./PaymentCategorySelect";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";
import PaymentFileUploadSection from "./PaymentFileUploadSection";
import IconSelector from "./IconSelector";
import { BuiltinIcon } from "../utils/builtinIcons";
import Spinner from "./Spinner";
import { PaymentData } from "../types/paymentData";

// Schema for a single payment edit
const singlePaymentSchema = z.object({
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
    .optional(),
  completedAt: z.date().nullable().optional(),
});

// Schema for a series edit
const seriesSchema = singlePaymentSchema.extend({
  recurrenceRule: z.string().min(1, "Правило повторения обязательно."),
  // `dueDate` will be re-purposed as `startDate` for the series
});

// A broad schema for the form to accommodate all fields.
// Specific validation will be handled in the submit handler based on scope.
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
    .optional(),
  recurrenceRule: z.string().nullable().optional(),
  completedAt: z.date().nullable().optional(),
});

export type PaymentFormInputs = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  paymentId?: string;
  onSuccess: (newPaymentId?: string) => void;
  onCancel: () => void;
  initialData: PaymentData | null; // Receive initial data as a prop
  editScope: "single" | "series"; // Receive edit scope
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentId,
  onSuccess,
  onCancel,
  initialData,
  editScope,
}) => {
  const isEditMode = !!paymentId;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<PaymentFormInputs>({
    resolver: zodResolver(paymentFormSchema),
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<BuiltinIcon | null>(
    null
  );
  const [attachedFile, setAttachedFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  // Effect to populate the form with initial data
  useEffect(() => {
    if (initialData) {
      const dataToSet = {
        title:
          editScope === "series" && initialData.series
            ? initialData.series.title
            : initialData.title,
        amount: parseFloat(
          (editScope === "series" && initialData.series
            ? initialData.series.amount
            : initialData.amount
          ).toString()
        ),
        dueDate: new Date(initialData.dueDate),
        categoryId: initialData.category?.id || null,
        recurrenceRule:
          editScope === "series" && initialData.series
            ? initialData.series.recurrenceRule
            : null,
        completedAt: initialData.completedAt
          ? new Date(initialData.completedAt)
          : null,
      };
      reset(dataToSet);

      setSelectedIconName(
        (editScope === "series" && initialData.series
          ? initialData.series.builtinIconName
          : initialData.builtinIconName) || null
      );
      setAttachedFile(
        initialData.filePath && initialData.fileName
          ? { filePath: initialData.filePath, fileName: initialData.fileName }
          : null
      );
      setPaymentStatus(initialData.status);
    } else if (!isEditMode) {
      // Reset for "new payment" form
      reset({
        title: "",
        amount: undefined,
        dueDate: new Date(),
        categoryId: null,
        recurrenceRule: null,
      });
      setSelectedIconName(null);
      setAttachedFile(null);
      setPaymentStatus(null);
    }
  }, [initialData, editScope, isEditMode, reset]);

  const handleIconChange = useCallback((iconName: BuiltinIcon | null) => {
    setSelectedIconName(iconName);
  }, []);

  const handleRecurrenceRuleChange = useCallback(
    (rule: string | null) => {
      setValue("recurrenceRule", rule, { shouldValidate: true });
    },
    [setValue]
  );

  const handleFormSubmit: SubmitHandler<PaymentFormInputs> = async (data) => {
    setFormError(null);

    // Manual validation based on scope
    const validationSchema =
      editScope === "series" ? seriesSchema : singlePaymentSchema;
    const validationResult = validationSchema.safeParse(data);

    if (!validationResult.success) {
      // The resolver should catch this, but as a fallback:
      setFormError("Пожалуйста, проверьте правильность заполнения полей.");
      return;
    }

    try {
      if (isEditMode && paymentId) {
        if (editScope === "single") {
          // Update a single payment
          const payload = {
            title: data.title,
            amount: Number(data.amount),
            dueDate: data.dueDate.toISOString().split("T")[0],
            categoryId: data.categoryId || null,
            builtinIconName: selectedIconName,
            completedAt: data.completedAt
              ? data.completedAt.toISOString()
              : null,
          };
          await axiosInstance.put(`/payments/${paymentId}`, payload);
          logger.info(`Payment updated (ID: ${paymentId})`);
          onSuccess(paymentId);
        } else {
          // editScope === 'series'
          const seriesId = initialData?.seriesId;
          if (!seriesId) {
            throw new Error("Series ID not found for editing.");
          }
          const payload = {
            title: data.title,
            amount: Number(data.amount),
            categoryId: data.categoryId || null,
            recurrenceRule: data.recurrenceRule, // This will be set from the recurrence section
            builtinIconName: selectedIconName,
            cutOffPaymentId: paymentId, // The current payment is the cut-off point
            startDate: data.dueDate.toISOString().split("T")[0], // The payment's due date becomes the new series start date
          };
          await seriesApi.updateSeries(seriesId, payload);
          logger.info(`Recurring series updated (ID: ${seriesId})`);
          onSuccess(paymentId);
        }
      } else {
        // Create new payment (can be single or first in a new series)
        const payload = {
          title: data.title,
          amount: Number(data.amount),
          dueDate: data.dueDate.toISOString().split("T")[0],
          categoryId: data.categoryId || null,
          recurrenceRule: data.recurrenceRule || null,
          builtinIconName: selectedIconName,
        };
        const res = await axiosInstance.post("/payments", payload);
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

  const watchDueDate = watch("dueDate");
  const watchCategoryId = watch("categoryId");
  const currentRule = watch("recurrenceRule");

  // Determine if recurrence section should be shown
  const showRecurrence = (isEditMode && editScope === "series") || !isEditMode;

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
          watchDueDate={watchDueDate}
          isSubmitting={isSubmitting}
        />
        {editScope === "series" && (
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-4 ml-1">
            Эта дата станет датой начала для измененной серии.
          </p>
        )}

        <PaymentCategorySelect
          errors={errors}
          setValue={setValue}
          watchCategoryId={watchCategoryId}
          isSubmitting={isSubmitting}
        />

        {showRecurrence && (
          <PaymentRecurrenceSection
            onRuleChange={handleRecurrenceRuleChange}
            isSubmitting={isSubmitting}
            currentRule={currentRule}
            dueDate={watchDueDate}
          />
        )}

        <IconSelector
          selectedIconName={selectedIconName}
          onIconChange={handleIconChange}
          isFormSubmitting={isSubmitting}
        />

        {/* File upload is only available for single payments, not for series editing */}
        {editScope === "single" && (
          <PaymentFileUploadSection
            paymentId={paymentId}
            initialFile={attachedFile}
            isSubmitting={isSubmitting}
            setFormError={setFormError}
          />
        )}

        {paymentStatus === "completed" && editScope === "single" && (
          <div>
            <label
              htmlFor="completedAt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
            >
              Дата выполнения
            </label>
            <DatePicker
              id="completedAt"
              selected={watch("completedAt")}
              onChange={(date: Date | null) => {
                setValue("completedAt", date, { shouldValidate: true });
              }}
              dateFormat="yyyy-MM-dd HH:mm"
              showTimeSelect
              timeFormat="HH:mm"
              className={`block w-full rounded-md border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
                errors.completedAt ? "border-red-500" : ""
              }`}
              wrapperClassName="w-full"
              disabled={isSubmitting}
              placeholderText="Выберите дату и время выполнения"
            />
            {errors.completedAt && (
              <p className="mt-1 text-sm text-red-600">
                {errors.completedAt.message}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500"
            disabled={isSubmitting}
          >
            Отмена
          </button>
          <button
            type="submit"
            className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-w-28"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : "Сохранить"}
          </button>
        </div>
      </form>
    </>
  );
};

export default PaymentForm;
