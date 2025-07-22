import { UseFormSetValue, FieldErrors } from "react-hook-form";
import useCategories from "../hooks/useCategories";
import Select, { SelectOption } from "./Select"; // Import new component
import { PaymentFormInputs } from "./PaymentForm";

interface PaymentCategorySelectProps {
  errors: FieldErrors<PaymentFormInputs>;
  setValue: UseFormSetValue<PaymentFormInputs>;
  watchCategoryId: string | null | undefined;
  isSubmitting: boolean;
}

function PaymentCategorySelect({
  errors,
  setValue,
  watchCategoryId,
  isSubmitting,
}: PaymentCategorySelectProps) {
  const { categories, isLoading, error } = useCategories();

  const options: SelectOption[] = [
    { value: null, label: "-- Без категории --" },
    ...(categories?.map((cat) => ({ value: cat.id, label: cat.name })) || []),
  ];

  if (isLoading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Категория
        </label>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Загрузка категорий...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Категория
        </label>
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <Select
      label="Категория"
      options={options}
      value={watchCategoryId || null}
      onChange={(value) =>
        setValue("categoryId", value, { shouldValidate: true })
      }
      error={errors.categoryId?.message as string}
      disabled={isSubmitting || categories?.length === 0}
      placeholder="-- Без категории --"
    />
  );
}

export default PaymentCategorySelect;
