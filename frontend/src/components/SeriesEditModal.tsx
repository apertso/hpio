import React, { useEffect, useState, useCallback } from "react"; // Import ReactNode
import {
  SubmitHandler,
  DefaultValues, // Import DefaultValues
  UseFormReturn, // Import UseFormReturn
} from "react-hook-form"; // Import necessary types
import { z } from "zod";
import UseFormModal from "./UseFormModal"; // Import UseFormModal
import { seriesApi } from "../api/axiosInstance";
import { AxiosError } from "axios";
import logger from "../utils/logger";
import PaymentCategorySelect from "./PaymentCategorySelect";
import PaymentRecurrenceSection from "./PaymentRecurrenceSection";
import IconPicker, { PaymentIconInfo } from "./IconPicker"; // Import IconPicker and its types/values

// Schema for validating recurring series form
const seriesFormSchema = z.object({
  title: z
    .string()
    .min(1, "Название обязательно")
    .max(255, "Название слишком длинное"),
  amount: z
    .number({ invalid_type_error: "Сумма должна быть числом" })
    .min(0.01, "Сумма должна быть больше 0"),
  categoryId: z
    .string()
    .uuid("Неверный формат ID категории")
    .nullable()
    .optional()
    .or(z.literal("")), // Allow empty string for "Без категории"
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"], {
    required_error: "Шаблон повторения обязателен",
    invalid_type_error: "Неверный шаблон повторения",
  }),
  recurrenceEndDate: z
    .date({ invalid_type_error: "Неверный формат даты окончания" })
    .nullable()
    .optional(),
  isActive: z.boolean().optional(), // For pausing the series
});

type SeriesFormInputs = z.infer<typeof seriesFormSchema>;

interface SeriesEditModalProps {
  seriesId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback after successful update
}

const SeriesEditModal: React.FC<SeriesEditModalProps> = ({
  seriesId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // State for default values to pass to UseFormModal
  const [defaultValues, setDefaultValues] = useState<
    DefaultValues<SeriesFormInputs> | undefined
  >(undefined);
  // State for API errors not handled by react-hook-form validation
  const [formError, setFormError] = useState<string | null>(null);
  // State for loading data
  const [isLoading, setIsLoading] = useState(true);

  // State for storing the selected/uploaded icon for the series
  const [selectedIcon, setSelectedIcon] = useState<PaymentIconInfo | null>(
    null
  );

  // Fetch series data when the modal opens
  useEffect(() => {
    if (isOpen && seriesId) {
      const fetchSeries = async () => {
        setIsLoading(true);
        setFormError(null); // Clear API errors on load
        try {
          const seriesData = await seriesApi.getSeriesById(seriesId);
          // Set default values for react-hook-form
          setDefaultValues({
            title: seriesData.title,
            amount: parseFloat(seriesData.amount),
            categoryId: seriesData.category?.id || "",
            recurrencePattern: seriesData.recurrencePattern,
            recurrenceEndDate: seriesData.recurrenceEndDate
              ? new Date(seriesData.recurrenceEndDate)
              : null,
            isActive: seriesData.isActive,
          });

          // Set the state of the selected/uploaded icon
          if (seriesData.iconType) {
            setSelectedIcon({
              iconType: seriesData.iconType,
              builtinIconName: seriesData.builtinIconName,
              iconPath: seriesData.iconPath,
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
              : "Не удалось загрузить данные шаблона.";
          logger.error(
            `Failed to fetch series ${seriesId}:`,
            errorMessage,
            error
          );
          setFormError(errorMessage); // Set API error
          setIsLoading(false);
        }
      };
      fetchSeries();
    } else if (!isOpen) {
      // Reset state when modal closes
      setDefaultValues(undefined); // Reset default values
      setFormError(null); // Clear API errors
      setIsLoading(true); // Set loading to true for next open
      setSelectedIcon(null); // Reset icon state
    }
  }, [isOpen, seriesId]); // Dependencies: isOpen, seriesId

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
  const onSubmit: SubmitHandler<SeriesFormInputs> = async (data) => {
    setFormError(null); // Clear previous API errors

    const payload = {
      title: data.title,
      amount: Number(data.amount),
      categoryId: data.categoryId === "" ? null : data.categoryId,
      recurrencePattern: data.recurrencePattern,
      recurrenceEndDate: data.recurrenceEndDate
        ? data.recurrenceEndDate.toISOString().split("T")[0]
        : null,
      isActive: data.isActive,
      iconType: selectedIcon?.iconType || null,
      builtinIconName: selectedIcon?.builtinIconName || null,
      iconPath: selectedIcon?.iconPath || null,
    };

    try {
      await seriesApi.updateSeries(seriesId, payload);
      logger.info(`Recurring series updated (ID: ${seriesId})`);
      onSuccess(); // Call success callback
      // onClose(); // UseFormModal handles closing on success
    } catch (error: unknown) {
      const errorMessage =
        error instanceof AxiosError && error.response?.data?.message
          ? error.response.data.message
          : error instanceof Error
          ? error.message
          : "Произошла ошибка при сохранении шаблона.";
      logger.error(`Failed to update series ${seriesId}:`, errorMessage, error);
      setFormError(errorMessage); // Set API error
      // Do NOT re-throw the error here, let useApi handle it if it were used for the save operation.
      // Since we are not using useApi for the save operation in this refactor step,
      // we handle the error and set the formError state locally.
    }
  };

  return (
    // UseFormModal wraps the form content
    <UseFormModal<SeriesFormInputs>
      isOpen={isOpen}
      onClose={onClose}
      title="Изменить шаблон повторения"
      schema={seriesFormSchema}
      onSubmit={onSubmit} // Pass the adapted onSubmit function
      defaultValues={defaultValues}
      isSubmitting={isLoading} // Pass loading state for fetching data
      formError={formError} // Pass API error
    >
      {(
        methods: UseFormReturn<SeriesFormInputs> // Render prop provides useForm methods, explicitly type methods
      ) => (
        <>
          {/* Form fields using methods.register, methods.formState.errors, etc. */}
          {/* Removed loading and error display as they are in UseFormModal */}
          {/* Removed form tag as it's in UseFormModal */}
          {/* Removed formError display as it's in UseFormModal */}

          {/* Fields: Title, Amount */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Название
            </label>
            <input
              id="title"
              type="text"
              {...methods.register("title")} // Use methods.register
              className={`mt-1 block w-full rounded-md border ${
                methods.formState.errors.title // Use methods.formState.errors
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100`}
              disabled={methods.formState.isSubmitting || isLoading} // Use combined submitting state
            />
            {methods.formState.errors.title && ( // Use methods.formState.errors
              <p className="mt-1 text-sm text-red-500">
                {methods.formState.errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Сумма
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              {...methods.register("amount", { valueAsNumber: true })} // Use methods.register
              className={`mt-1 block w-full rounded-md border ${
                methods.formState.errors.amount // Use methods.formState.errors
                  ? "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              } shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100`}
              disabled={methods.formState.isSubmitting || isLoading} // Use combined submitting state
            />
            {methods.formState.errors.amount && ( // Use methods.formState.errors
              <p className="mt-1 text-sm text-red-500">
                {methods.formState.errors.amount.message}
              </p>
            )}
          </div>

          {/* Field: Category */}
          <PaymentCategorySelect
            register={methods.register as any} // Use methods.register, cast to any
            errors={methods.formState.errors as any} // Use methods.formState.errors, cast to any
            setValue={methods.setValue as any} // Use methods.setValue, cast to any
            watchCategoryId={methods.watch("categoryId")} // Use methods.watch
            isSubmitting={methods.formState.isSubmitting || isLoading} // Use combined submitting state
          />

          {/* Recurrence Pattern and End Date */}
          <PaymentRecurrenceSection
            register={methods.register as any} // Use methods.register, cast to any
            errors={methods.formState.errors as any} // Use methods.formState.errors, cast to any
            setValue={methods.setValue as any} // Use methods.setValue, cast to any
            watchRecurrencePattern={methods.watch("recurrencePattern")} // Use methods.watch
            watchRecurrenceEndDate={methods.watch("recurrenceEndDate")} // Use methods.watch
            isSubmitting={methods.formState.isSubmitting || isLoading} // Use combined submitting state
            clearErrors={methods.clearErrors as any} // Use methods.clearErrors, cast to any
            // Note: isRecurrent checkbox is not shown in series edit
          />

          {/* Icon Picker */}
          <IconPicker
            paymentId={seriesId} // Use seriesId for icon uploads related to the series
            initialIcon={selectedIcon}
            onIconChange={handleIconChange}
            onError={handleIconError}
            isFormSubmitting={methods.formState.isSubmitting || isLoading} // Use combined submitting state
          />

          {/* Is Active checkbox */}
          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              {...methods.register("isActive")} // Use methods.register
              checked={methods.watch("isActive")} // Use methods.watch
              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
              disabled={methods.formState.isSubmitting || isLoading} // Use combined submitting state
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
            >
              Серия активна (генерировать новые платежи)
            </label>
          </div>

          {/* Removed form buttons as they are handled by UseFormModal */}
        </>
      )}
    </UseFormModal>
  );
};

export default SeriesEditModal;
