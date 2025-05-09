import React, { useEffect, useState, useCallback } from "react";
import { SubmitHandler, DefaultValues } from "react-hook-form"; // Import necessary types
import { z } from "zod";
import axiosInstance from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import "react-datepicker/dist/react-datepicker.css";
import IconPicker, { PaymentIconInfo } from "./IconPicker"; // Import IconPicker and its types/values
import SeriesEditModal from "./SeriesEditModal";

import PaymentDetailsSection from "./PaymentDetailsSection";

import PaymentCategorySelect from "./PaymentCategorySelect";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";
import PaymentFileUploadSection from "./PaymentFileUploadSection";
import UseFormModal from "./UseFormModal"; // Import the new UseFormModal

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
  isOpen?: boolean; // Add isOpen prop
  onClose: () => void; // Add onClose prop
  paymentId?: string;
  onSuccess: (newPaymentId?: string) => void; // Добавили опциональный newPaymentId в onSuccess для создания
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  isOpen = true, // Destructure isOpen
  onClose, // Destructure onClose
  paymentId,
  onSuccess,
}) => {
  const isEditMode = !!paymentId;

  // State to hold the series ID if the payment being edited is part of a series
  const [currentSeriesId, setCurrentSeriesId] = useState<string | null>(null);
  // State to control the visibility of the SeriesEditModal
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);

  // State for default values to pass to UseFormModal
  const [defaultValues, setDefaultValues] = useState<
    DefaultValues<PaymentFormInputs> | undefined
  >(undefined);
  // State for API errors not handled by react-hook-form validation
  const [formError, setFormError] = useState<string | null>(null);
  // State for loading data in edit mode
  const [isLoading, setIsLoading] = useState(isEditMode);

  const [attachedFile, setAttachedFile] = useState<{
    filePath: string;
    fileName: string;
  } | null>(null);

  // !!! Состояние для хранения выбранной/загруженной иконки
  const [selectedIcon, setSelectedIcon] = useState<PaymentIconInfo | null>(
    null
  );

  // !!! Состояние для опции "Создать как завершенный" (только для создания)
  const [createAsCompleted, setCreateAsCompleted] = useState(false);

  // Effect to fetch payment data for editing
  useEffect(() => {
    if (isEditMode && paymentId) {
      const fetchPayment = async () => {
        setIsLoading(true);
        setFormError(null); // Clear API errors on load
        try {
          const res = await axiosInstance.get(`/payments/${paymentId}`);
          const paymentData = res.data;

          // Set default values for react-hook-form
          setDefaultValues({
            title: paymentData.title,
            amount: parseFloat(paymentData.amount),
            dueDate: new Date(paymentData.dueDate),
            categoryId: paymentData.category?.id || "",
            // Recurrence fields are not set here as they are part of the series
            recurrencePattern: null, // Ensure these are null for edit mode form
            recurrenceEndDate: null,
          });

          // Store the seriesId if it exists
          if (paymentData.seriesId) {
            setCurrentSeriesId(paymentData.seriesId);
          } else {
            setCurrentSeriesId(null);
          }

          // Set the state of the attached file
          if (paymentData.filePath && paymentData.fileName) {
            setAttachedFile({
              filePath: paymentData.filePath,
              fileName: paymentData.fileName,
            });
          } else {
            setAttachedFile(null);
          }

          // Set the state of the selected/uploaded icon
          if (paymentData.iconType) {
            setSelectedIcon({
              iconType: paymentData.iconType,
              builtinIconName: paymentData.builtinIconName,
              iconPath: paymentData.iconPath,
            });
          } else {
            setSelectedIcon(null);
          }

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
          setFormError(errorMessage); // Set API error
          setIsLoading(false);
        }
      };
      fetchPayment();
    } else {
      // Create mode - set initial default values, clear states
      setDefaultValues({
        title: "",
        amount: undefined,
        dueDate: new Date(),
        categoryId: null,
        recurrencePattern: null,
        recurrenceEndDate: null,
      });
      setCurrentSeriesId(null);
      setAttachedFile(null);
      setSelectedIcon(null);
      setCreateAsCompleted(false);
      setFormError(null); // Clear API errors
      setIsLoading(false); // Not loading in create mode initially
    }
  }, [paymentId, isEditMode]); // Dependencies: paymentId, isEditMode

  // Handler for icon changes from IconPicker
  const handleIconChange = useCallback((iconInfo: PaymentIconInfo | null) => {
    setSelectedIcon(iconInfo);
    // setFormError(null); // Reset form error if it came from IconPicker - UseFormModal handles this
  }, []);

  // Handler for errors from IconPicker
  const handleIconError = useCallback((message: string) => {
    setFormError(`Ошибка иконки: ${message}`);
  }, []);

  // Adapted onSubmit function to be passed to UseFormModal
  const onSubmit: SubmitHandler<PaymentFormInputs> = async (data) => {
    setFormError(null); // Clear previous API errors

    // Validation on Frontend should also consider dependencies:
    // If isRecurrent is true, pattern must be selected. Zod schema already handles this with nullable().optional() and enum.
    // If isRecurrent is true and pattern is selected, endDate can be null or Date.

    // Construct the payload based on whether it's create or edit mode
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
      iconType: selectedIcon?.iconType || null,
      builtinIconName: selectedIcon?.builtinIconName || null,
      iconPath: selectedIcon?.iconPath || null,
    };

    let finalPayload: any = { ...basePayloadData }; // Start with base payload

    if (isEditMode) {
      // If editing a one-time payment and a recurrence pattern is now selected by the user,
      // include recurrence fields to trigger conversion to a new series on the backend.
      if (!currentSeriesId && data.recurrencePattern) {
        finalPayload.recurrencePattern = data.recurrencePattern;
        finalPayload.recurrenceEndDate = data.recurrenceEndDate
          ? data.recurrenceEndDate.toISOString().split("T")[0]
          : null;
      }
      // Note: If currentSeriesId exists, recurrence pattern changes are handled by SeriesEditModal.
    } else {
      // Create mode: include recurrence fields if provided, and createAsCompleted option
      if (data.recurrencePattern) {
        finalPayload = {
          ...basePayloadData,
          recurrencePattern: data.recurrencePattern || null, // Send pattern if selected
          recurrenceEndDate:
            data.recurrencePattern && data.recurrenceEndDate // Only send endDate if pattern exists
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
        onSuccess(paymentId); // Call onSuccess, passing the ID
      } else {
        const res = await axiosInstance.post("/payments", finalPayload);
        const newPaymentId = res.data.id; // Get the ID of the new payment
        logger.info("Payment created", res.data);
        onSuccess(newPaymentId); // Call onSuccess, passing the ID of the new payment
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "An error occurred while saving.";
      logger.error("Failed to save payment:", errorMessage, error);
      setFormError(errorMessage); // Set API error
      // Do NOT re-throw the error here, let useApi handle it if it were used for the save operation.
      // Since we are not using useApi for the save operation in this refactor step,
      // we handle the error and set the formError state locally.
    }
  };

  return (
    <>
      {/* UseFormModal wraps the form content */}
      <UseFormModal<PaymentFormInputs>
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "Редактировать платеж" : "Добавить платеж"}
        schema={paymentFormSchema}
        onSubmit={onSubmit} // Pass the adapted onSubmit function
        defaultValues={defaultValues}
        isSubmitting={isLoading} // Pass loading state for fetching data
        formError={formError} // Pass API error
      >
        {(
          methods // Render prop provides useForm methods
        ) => (
          <>
            {/* Form fields using methods.register, methods.formState.errors, etc. */}
            {/* Removed h2 and formError display as they are in UseFormModal */}

            {/* Поля: Название, Сумма, Срок оплаты */}
            <PaymentDetailsSection
              register={methods.register}
              errors={methods.formState.errors}
              setValue={methods.setValue}
              watchDueDate={methods.watch("dueDate")}
              isSubmitting={methods.formState.isSubmitting || isLoading} // Pass combined submitting state
            />
            {/* Поле: Категория */}
            <PaymentCategorySelect
              register={methods.register}
              errors={methods.formState.errors}
              setValue={methods.setValue}
              watchCategoryId={methods.watch("categoryId")}
              isSubmitting={methods.formState.isSubmitting || isLoading}
            />

            {/* !!! Recurrence Section !!! */}
            {/* Показываем секцию для создания нового платежа ИЛИ для редактирования разового платежа (когда нет currentSeriesId) */}
            {/* Если платеж уже часть серии (currentSeriesId есть), настройки повторения меняются через SeriesEditModal */}
            {!currentSeriesId ? (
              <PaymentRecurrenceSection
                register={methods.register}
                errors={methods.formState.errors}
                setValue={methods.setValue}
                watchRecurrencePattern={methods.watch("recurrencePattern")}
                watchRecurrenceEndDate={methods.watch("recurrenceEndDate")}
                isSubmitting={methods.formState.isSubmitting || isLoading}
                clearErrors={methods.clearErrors}
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

            {/* !!! "Edit Recurrence Settings" Button (show in edit mode if seriesId exists) !!! */}
            {isEditMode && currentSeriesId && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    // Open SeriesEditModal, passing currentSeriesId
                    if (currentSeriesId) {
                      setIsSeriesModalOpen(true);
                    } else {
                      logger.warn(
                        "Attempted to open series edit modal but currentSeriesId is null."
                      );
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 dark:hover:bg-gray-500 transition-colors duration-200"
                  disabled={methods.formState.isSubmitting || isLoading}
                >
                  Изменить шаблон повторения
                </button>
              </div>
            )}

            {/* IconPicker Component */}
            <IconPicker
              paymentId={paymentId} // Payment ID (undefined in create mode)
              initialIcon={selectedIcon} // Current icon
              onIconChange={handleIconChange} // Icon change handler
              onError={handleIconError} // Use handleIconError
              isFormSubmitting={methods.formState.isSubmitting || isLoading} // Form submission status
            />

            {/* Компонент FileUpload */}
            <PaymentFileUploadSection
              paymentId={paymentId} // ID платежа (undefined при создании)
              initialFile={attachedFile} // Начальное состояние файла (null при создании)
              isSubmitting={methods.formState.isSubmitting || isLoading} // Pass combined submitting state
              setFormError={setFormError} // Pass the local setFormError
            />

            {/* !!! "Create as Completed" Option (show only in create mode) !!! */}
            {!isEditMode && (
              <div className="flex items-center">
                <input
                  id="createAsCompleted"
                  type="checkbox"
                  checked={createAsCompleted} // Managed by local state
                  onChange={(e) => setCreateAsCompleted(e.target.checked)}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                  disabled={methods.formState.isSubmitting || isLoading}
                />
                <label
                  htmlFor="createAsCompleted"
                  className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
                >
                  Создать как выполненный
                </label>
              </div>
            )}

            {/* Removed form buttons as they are handled by UseFormModal */}
          </>
        )}
      </UseFormModal>
      {/* Series Edit Modal remains outside UseFormModal */}
      {currentSeriesId && ( // Only render if there's a seriesId
        <SeriesEditModal
          seriesId={currentSeriesId}
          isOpen={isSeriesModalOpen}
          onClose={() => setIsSeriesModalOpen(false)}
          onSuccess={() => {
            // TODO: Maybe refresh payment data after series update?
            // For now, just close the modal.
            setIsSeriesModalOpen(false);
            // Optionally, call onSuccess of the parent PaymentForm to trigger a list refresh
            // onSuccess(paymentId); // Pass paymentId to refresh the specific payment in the list
          }}
        />
      )}
    </>
  );
};

export default PaymentForm;
