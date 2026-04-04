import { UseFormSetValue, FieldErrors } from "react-hook-form";
import useCategories from "../hooks/useCategories";
import Select, { SelectOption } from "./Select";
import { PaymentFormInputs } from "./PaymentForm";
import { Tooltip } from "./Tooltip";
import { InformationIcon } from "./InformationIcon";

interface PaymentCategorySelectProps {
  errors: FieldErrors<PaymentFormInputs>;
  setValue: UseFormSetValue<PaymentFormInputs>;
  watchCategoryId: string | null | undefined;
  isSubmitting: boolean;
  onUserCategoryChange?: (value: string | null) => void;
  categoryType?: "expense" | "income";
  isLocked?: boolean;
  lockReason?: string;
}

function PaymentCategorySelect({
  errors,
  setValue,
  watchCategoryId,
  isSubmitting,
  onUserCategoryChange,
  categoryType,
  isLocked,
  lockReason,
}: PaymentCategorySelectProps) {
  const { categories, isLoading, error } = useCategories(categoryType);

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

  const resolvedLockReason =
    lockReason ||
    "Категория для автоматически добавленных платежей изменяется через правила автоматизации.";

  const labelContent = isLocked ? (
    <span className="flex items-center gap-2">
      <span>Категория</span>
      <Tooltip content={resolvedLockReason}>
        <button
          type="button"
          className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
          aria-label="Пояснение к полю категории"
        >
          <InformationIcon className="h-[16px] w-[16px]" />
        </button>
      </Tooltip>
    </span>
  ) : (
    "Категория"
  );

  return (
    <Select
      label={labelContent}
      options={options}
      value={watchCategoryId || null}
      onChange={(value) => {
        setValue("categoryId", value, { shouldValidate: true });
        onUserCategoryChange?.(value as string | null);
      }}
      error={errors.categoryId?.message as string}
      disabled={isSubmitting || categories?.length === 0 || isLocked}
      placeholder="-- Без категории --"
    />
  );
}

export default PaymentCategorySelect;
