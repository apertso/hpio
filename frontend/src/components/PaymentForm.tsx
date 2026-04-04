import React, { useEffect, useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import DatePicker from "./DatePicker";
import { seriesApi } from "../api/axiosInstance";

import PaymentDetailsSection from "./PaymentDetailsSection";
import PaymentCategorySelect from "./PaymentCategorySelect";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";
import PaymentFileUploadSection from "./PaymentFileUploadSection";
import IconSelector from "./IconSelector";
import { BuiltinIcon } from "../utils/builtinIcons";
import useCategories from "../hooks/useCategories";
import useTags from "../hooks/useTags";
import ToggleSwitch from "./ToggleSwitch";
import { PaymentData } from "../types/paymentData";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "../context/ToastContext";
import { formatDateToLocal } from "../utils/dateUtils";
import { Button } from "./Button";
import {
  isIncomeAndCardsEnabled,
  isTagsAndCategoriesEnabled,
} from "../utils/featureFlags";

// moved ToggleSwitch to a standalone component

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
  tagIds: z.array(z.string().uuid()).optional(),
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
  tagIds: z.array(z.string().uuid()).optional(),
  recurrenceRule: z.string().nullable().optional(),
  remind: z.boolean().optional(),
  completedAt: z.date().nullable().optional(),
  method: z.enum(["cash", "card", "transfer", "other"]).optional(),
});

export type PaymentFormInputs = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  paymentId?: string;
  onSuccess: (newPaymentId?: string) => void;
  onCancel: () => void;
  initialData: PaymentData | null; // Receive initial data as a prop
  editScope: "single" | "series"; // Receive edit scope
  isSeriesInactive?: boolean;
  markAsCompletedInitial?: boolean; // For archive page use case
  onRepeatChange?: (shouldRepeat: boolean) => void; // Callback when repeat toggle changes
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  paymentId,
  onSuccess,
  onCancel,
  initialData,
  editScope,
  isSeriesInactive,
  markAsCompletedInitial = false,
  onRepeatChange,
}) => {
  const isEditMode = !!paymentId;
  const { showToast } = useToast();
  const isAutoCreated = Boolean(initialData?.autoCreated);
  const isCategoryLocked = isEditMode && isAutoCreated;
  const categoryLockReason =
    "Категория для автоматически добавленных платежей изменяется через правила автоматизации.";

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
  const [manualIconName, setManualIconName] = useState<BuiltinIcon | null>(
    null
  );
  const [attachedFile, setAttachedFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const { categories } = useCategories("expense");
  const tagsAndCategoriesEnabled = isTagsAndCategoriesEnabled();
  const tagsEnabled = tagsAndCategoriesEnabled;
  const { tags, isLoading: isLoadingTags } = useTags(tagsEnabled);

  const [markAsCompleted, setMarkAsCompleted] = useState(
    markAsCompletedInitial
  );
  const [shouldRepeat, setShouldRepeat] = useState<boolean>(
    !!initialData?.seriesId
  );
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });

  const disableForInactiveSeries =
    isEditMode && editScope === "series" && !!isSeriesInactive;

  // Effect to populate the form with initial data
  useEffect(() => {
    if (initialData) {
      // В режиме редактирования серии «Срок оплаты» берём из series.generatedUntil (или даты последнего платежа)
      let dueDateForForm = new Date(initialData.dueDate);
      if (Number.isNaN(dueDateForForm.getTime())) {
        dueDateForForm = new Date();
      }
      if (editScope === "series") {
        const rawSeriesDate =
          (initialData.series
            ? (
                initialData.series as {
                  generatedUntil?: string | null;
                }
              ).generatedUntil
            : null) || initialData.dueDate;
        if (rawSeriesDate) {
          const parsedSeriesDate = new Date(rawSeriesDate);
          if (!Number.isNaN(parsedSeriesDate.getTime())) {
            dueDateForForm = parsedSeriesDate;
          }
        }
      }
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
        dueDate: dueDateForForm,
        categoryId: initialData.transactionCategory?.id || null,
        tagIds: initialData.tags ? initialData.tags.map((tag) => tag.id) : [],
        recurrenceRule:
          editScope === "series" && initialData.series
            ? initialData.series.recurrenceRule
            : null,
        completedAt: initialData.completedAt
          ? new Date(initialData.completedAt)
          : null,
        remind: initialData.remind || false,
        method:
          (initialData as { method?: PaymentFormInputs["method"] }).method ||
          "cash",
      };
      reset(dataToSet);

      setManualIconName(
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
      setShouldRepeat(!!initialData.seriesId);
    } else if (!isEditMode) {
      // Reset for "new payment" form
      reset({
        title: "",
        amount: undefined,
        dueDate: new Date(),
        categoryId: null,
        tagIds: [],
        recurrenceRule: null,
        remind: true,
        method: "cash",
      });
      setManualIconName(null);
      setAttachedFile(null);
      setPaymentStatus(null);
      setShouldRepeat(false);
    }
  }, [initialData, editScope, isEditMode, reset]);

  const handleIconChange = useCallback((iconName: BuiltinIcon | null) => {
    setManualIconName(iconName);
  }, []);

  const handleRecurrenceRuleChange = useCallback(
    (rule: string | null) => {
      setValue("recurrenceRule", rule, { shouldValidate: true });
    },
    [setValue]
  );

  const handleTagToggle = (tagId: string): void => {
    const nextTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    setValue("tagIds", nextTagIds, { shouldValidate: true });
  };

  const actualSubmit = async (data: PaymentFormInputs) => {
    // Determine if we're dealing with series based on shouldRepeat toggle
    const wasSeriesPayment = !!initialData?.seriesId;
    const builtinIconForPayload = data.categoryId ? null : manualIconName;
    const shouldSendTags = tagsEnabled && editScope === "single";
    const tagIdsForPayload = shouldSendTags ? selectedTagIds : undefined;

    try {
      if (isEditMode && paymentId) {
        if (editScope === "single") {
          // Update a single payment
          const payload: Record<string, unknown> = {
            title: data.title,
            amount: Number(data.amount),
            dueDate: formatDateToLocal(data.dueDate),
            categoryId: data.categoryId || null,
            builtinIconName: builtinIconForPayload,
            remind: data.remind || false,
            completedAt: data.completedAt
              ? data.completedAt.toISOString()
              : null,
            method: data.method || "cash",
          };

          if (shouldSendTags) {
            payload.tagIds = tagIdsForPayload;
          }

          if (shouldRepeat && !wasSeriesPayment) {
            // Only set recurrenceRule when creating a new series or converting one-time to series
            payload.recurrenceRule = data.recurrenceRule;
          } else if (!shouldRepeat && wasSeriesPayment) {
            // Explicitly set to null to detach from series
            payload.recurrenceRule = null;
          }

          await axiosInstance.put(`/payments/${paymentId}`, payload);
          logger.info(`Payment updated (ID: ${paymentId})`);

          // Show appropriate success message
          if (shouldRepeat && !wasSeriesPayment) {
            showToast("Серия платежей успешно создана.", "success");
          } else if (!shouldRepeat && wasSeriesPayment) {
            showToast("Повторение отключено.", "success");
          } else {
            showToast("Платеж успешно обновлен.", "success");
          }

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
            recurrenceRule: data.recurrenceRule,
            builtinIconName: builtinIconForPayload,
            cutOffPaymentId: paymentId,
            startDate: formatDateToLocal(data.dueDate),
            remind: data.remind ?? false,
          };
          await seriesApi.updateSeries(seriesId, payload);
          logger.info(`Recurring series updated (ID: ${seriesId})`);
          showToast("Серия платежей обновлена.", "success");
          onSuccess(paymentId);
        }
      } else {
        // Create new payment (can be single or first in a new series)
        const payload: Record<string, unknown> = {
          title: data.title,
          amount: Number(data.amount),
          dueDate: formatDateToLocal(data.dueDate),
          categoryId: data.categoryId || null,
          recurrenceRule: shouldRepeat ? data.recurrenceRule : null,
          builtinIconName: builtinIconForPayload,
          remind: data.remind || false,
          method: data.method || "cash",
        };

        if (shouldSendTags) {
          payload.tagIds = tagIdsForPayload;
        }

        if (markAsCompleted) {
          payload.createAsCompleted = true;
          if (data.completedAt) {
            payload.completedAt = data.completedAt.toISOString();
          }
        }

        const res = await axiosInstance.post("/payments", payload);
        const newPaymentId = res.data.id;
        logger.info("Payment created", res.data);

        if (pendingFile) {
          try {
            const formData = new FormData();
            formData.append("paymentFile", pendingFile);
            await axiosInstance.post(
              `/files/upload/payment/${newPaymentId}`,
              formData
            );
          } catch {
            setFormError(
              "Платеж создан, но файл не удалось загрузить. Попробуйте прикрепить файл в режиме редактирования."
            );
          } finally {
            setPendingFile(null);
          }
        }

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

  const handleFormSubmit: SubmitHandler<PaymentFormInputs> = async (data) => {
    setFormError(null);

    // Determine if we're dealing with series based on shouldRepeat toggle
    const wasSeriesPayment = !!initialData?.seriesId;

    // Manual validation based on scope
    const validationSchema =
      editScope === "series" || (shouldRepeat && !isEditMode)
        ? seriesSchema
        : singlePaymentSchema;
    const validationResult = validationSchema.safeParse(data);

    if (!validationResult.success) {
      setFormError("Пожалуйста, проверьте правильность заполнения полей.");
      return;
    }

    // Check if we need confirmation for series conversion
    if (isEditMode && editScope === "single") {
      if (shouldRepeat && !wasSeriesPayment) {
        // Converting one-time payment to series - show confirmation
        setConfirmModalState({
          isOpen: true,
          action: () => {
            actualSubmit(data);
          },
          title: "Создать серию платежей",
          message:
            "Вы уверены, что хотите создать серию повторяющихся платежей на основе этого платежа?",
        });
        return;
      } else if (!shouldRepeat && wasSeriesPayment) {
        // Converting series payment to one-time - show confirmation
        setConfirmModalState({
          isOpen: true,
          action: () => {
            actualSubmit(data);
          },
          title: "Отключить повторение",
          message:
            "Вы уверены, что хотите отключить повторение для этого платежа? Он станет разовым платежом.",
        });
        return;
      }
    }

    // No confirmation needed, proceed directly
    await actualSubmit(data);
  };

  const findCategoryIcon = useCallback(
    (categoryId: string | null | undefined) => {
      if (!categoryId) return null;
      const category = categories?.find((c) => c.id === categoryId);
      return category?.builtinIconName || null;
    },
    [categories]
  );

  const watchDueDate = watch("dueDate");
  const watchCategoryId = watch("categoryId");
  const watchTagIds = watch("tagIds");
  const currentRule = watch("recurrenceRule");
  const watchCompletedAt = watch("completedAt");
  const selectedTagIds = Array.isArray(watchTagIds) ? watchTagIds : [];
  const categoryIconName = findCategoryIcon(watchCategoryId);
  const iconSelectorReadOnly = !!watchCategoryId;
  const iconSelectorDisplayIcon = iconSelectorReadOnly
    ? categoryIconName || null
    : manualIconName;
  const showTags = tagsEnabled && editScope === "single";

  useEffect(() => {
    if (initialData) {
      setManualIconName(initialData.builtinIconName || null);
    }
  }, [initialData]);

  const handleShouldRepeatChange = (newValue: boolean) => {
    setShouldRepeat(newValue);
    if (!newValue) {
      setValue("recurrenceRule", null);
    }
    // Notify parent component of the change
    if (onRepeatChange) {
      onRepeatChange(newValue);
    }
  };

  // Определяем, показывать ли блок повторения
  useEffect(() => {
    const shouldSyncCompletion =
      paymentStatus === "completed" || (markAsCompleted && !isEditMode);

    if (!shouldSyncCompletion || !watchDueDate || watchCompletedAt) {
      return;
    }

    const completionDate = new Date(watchDueDate);
    if (Number.isNaN(completionDate.getTime())) {
      return;
    }

    completionDate.setHours(12, 0, 0, 0);
    setValue("completedAt", completionDate, { shouldValidate: true });
  }, [
    paymentStatus,
    markAsCompleted,
    isEditMode,
    watchDueDate,
    watchCompletedAt,
    setValue,
  ]);

  const wasSeriesPayment = !!initialData?.seriesId;
  const showRecurrence =
    (isEditMode && editScope === "series") || // Editing the series itself
    (!isEditMode && shouldRepeat) || // Creating new payment with repeat on
    (isEditMode && editScope === "single" && shouldRepeat && !wasSeriesPayment); // Converting one-time payment to series

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

        <fieldset disabled={disableForInactiveSeries}>
          <div className="space-y-6">
            <PaymentDetailsSection
              register={register}
              errors={errors}
              setValue={setValue}
              watchDueDate={watchDueDate}
              isSubmitting={isSubmitting}
              showSeriesStartHint={editScope === "series"}
            />

            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <IconSelector
                  selectedIconName={iconSelectorDisplayIcon}
                  onIconChange={handleIconChange}
                  isFormSubmitting={isSubmitting}
                  isReadOnly={iconSelectorReadOnly}
                />
              </div>
              <div className="md:flex-1">
                <PaymentCategorySelect
                  errors={errors}
                  setValue={setValue}
                  watchCategoryId={watchCategoryId}
                  isSubmitting={isSubmitting}
                  categoryType="expense"
                  isLocked={isCategoryLocked}
                  lockReason={categoryLockReason}
                />
              </div>
            </div>

            {showTags && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Теги
                </label>
                {isLoadingTags ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Загрузка тегов...
                  </p>
                ) : tags && tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`px-3 py-1 rounded-full text-sm border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                          }`}
                          aria-pressed={isSelected}
                          disabled={isSubmitting}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Теги не добавлены.
                  </p>
                )}
              </div>
            )}

            {editScope === "single" && (
              <label className="flex items-center gap-3 cursor-pointer">
                <ToggleSwitch
                  checked={shouldRepeat}
                  onChange={(checked) => handleShouldRepeatChange(checked)}
                  disabled={isSubmitting}
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  Повторять
                </span>
              </label>
            )}

            {showRecurrence && (
              <PaymentRecurrenceSection
                onRuleChange={handleRecurrenceRuleChange}
                isSubmitting={isSubmitting}
                currentRule={currentRule}
                dueDate={watchDueDate}
              />
            )}

            {isIncomeAndCardsEnabled() && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Способ оплаты
                </label>
                <select
                  {...register("method")}
                  className="input-base w-full"
                  disabled={isSubmitting}
                >
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="transfer">Перевод</option>
                  <option value="other">Другое</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <ToggleSwitch
                checked={watch("remind") || false}
                onChange={(checked) => setValue("remind", checked)}
                disabled={isSubmitting}
              />
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                Напоминать
              </span>
            </label>

            {!isEditMode && (
              <label className="flex items-center gap-3 cursor-pointer">
                <ToggleSwitch
                  checked={markAsCompleted}
                  onChange={setMarkAsCompleted}
                  disabled={isSubmitting}
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  Отметить как выполненный
                </span>
              </label>
            )}

            {/* File upload is only available for single payments, not for series editing */}
            {editScope === "single" && (
              <PaymentFileUploadSection
                paymentId={paymentId}
                initialFile={attachedFile}
                isSubmitting={isSubmitting}
                setFormError={setFormError}
                onPendingFileChange={setPendingFile}
              />
            )}

            {((paymentStatus === "completed" && editScope === "single") ||
              (markAsCompleted && !isEditMode)) && (
              <DatePicker
                id="completedAt"
                mode="datetime"
                selected={watch("completedAt")}
                onSingleChange={(date: Date | null) => {
                  setValue("completedAt", date, { shouldValidate: true });
                }}
                label="Дата выполнения"
                error={errors.completedAt?.message}
                disabled={isSubmitting}
                placeholder="Выберите дату и время выполнения"
                showTimeSelect
                timeFormat="HH:mm"
                dateFormat="dd.MM.yyyy"
              />
            )}
          </div>
        </fieldset>

        <div className="hidden md:flex justify-end space-x-4 pt-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            label="Отмена"
            disabled={isSubmitting}
          />
          <Button
            variant="primary"
            type="submit"
            label="Сохранить"
            disabled={disableForInactiveSeries}
            loading={isSubmitting}
            onClick={handleSubmit(handleFormSubmit)}
          />
        </div>
        <div className="flex flex-col md:hidden px-6 pb-6 space-y-3">
          <Button
            variant="primary"
            size="large"
            type="submit"
            label="Сохранить"
            disabled={disableForInactiveSeries}
            loading={isSubmitting}
            className="w-full"
            onClick={handleSubmit(handleFormSubmit)}
          />
          <Button
            variant="ghost"
            label="Отмена"
            disabled={isSubmitting}
            className="w-full"
            onClick={onCancel}
          />
        </div>
      </form>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() =>
          setConfirmModalState({
            isOpen: false,
            action: null,
            title: "",
            message: "",
          })
        }
        onConfirm={() => {
          if (confirmModalState.action) {
            confirmModalState.action();
          }
        }}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText="Да, подтвердить"
        isConfirming={false}
      />
    </>
  );
};

export default PaymentForm;
