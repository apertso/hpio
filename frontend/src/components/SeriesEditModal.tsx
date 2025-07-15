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
import IconSelector from "./IconSelector"; // Import IconSelector
import { BuiltinIcon } from "../utils/builtinIcons"; // Import BuiltinIcon type
import { Input } from "./Input";

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
    .optional(),
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

  // State for storing the selected icon for the series
  const [selectedIconName, setSelectedIconName] = useState<BuiltinIcon | null>(
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

          // Set the state of the selected icon
          setSelectedIconName(seriesData.builtinIconName || null);

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
      setSelectedIconName(null); // Reset icon state
    }
  }, [isOpen, seriesId]); // Dependencies: isOpen, seriesId

  // Handler for icon changes from IconPicker
  const handleIconChange = useCallback((iconName: BuiltinIcon | null) => {
    setSelectedIconName(iconName);
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
      builtinIconName: selectedIconName,
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
          <Input
            id="title"
            label="Название"
            type="text"
            {...methods.register("title")}
            disabled={methods.formState.isSubmitting || isLoading}
            error={methods.formState.errors.title?.message}
          />

          <Input
            id="amount"
            label="Сумма"
            type="number"
            step="0.01"
            {...methods.register("amount", { valueAsNumber: true })}
            disabled={methods.formState.isSubmitting || isLoading}
            error={methods.formState.errors.amount?.message}
          />

          {/* Field: Category */}
          <PaymentCategorySelect
            errors={methods.formState.errors}
            setValue={methods.setValue as any}
            watchCategoryId={methods.watch("categoryId")}
            isSubmitting={methods.formState.isSubmitting || isLoading}
          />

          {/* Recurrence Pattern and End Date */}
          <PaymentRecurrenceSection
            errors={methods.formState.errors}
            setValue={methods.setValue as any}
            watchRecurrencePattern={methods.watch("recurrencePattern")}
            watchRecurrenceEndDate={methods.watch("recurrenceEndDate")}
            isSubmitting={methods.formState.isSubmitting || isLoading}
            clearErrors={methods.clearErrors as any}
            // Note: isRecurrent checkbox is not shown in series edit
          />

          {/* Icon Selector */}
          <IconSelector
            selectedIconName={selectedIconName}
            onIconChange={handleIconChange}
            isFormSubmitting={methods.formState.isSubmitting || isLoading}
          />

          {/* Is Active checkbox */}
          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              {...methods.register("isActive")}
              checked={methods.watch("isActive")}
              className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
              disabled={methods.formState.isSubmitting || isLoading}
            />
            <label
              htmlFor="isActive"
              className="ml-2 block text-sm text-gray-900 dark:text-gray-100"
            >
              Серия активна (генерировать новые платежи)
            </label>
          </div>
        </>
      )}
    </UseFormModal>
  );
};

export default SeriesEditModal;
