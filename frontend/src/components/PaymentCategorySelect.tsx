import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { PaymentFormInputs } from "./PaymentForm";
import useCategories from "../hooks/useCategories";

interface PaymentCategorySelectProps {
  register: UseFormRegister<PaymentFormInputs>;
  errors: FieldErrors<PaymentFormInputs>;
  setValue: UseFormSetValue<PaymentFormInputs>;
  watchCategoryId: PaymentFormInputs["categoryId"];
  isSubmitting: boolean;
}

const PaymentCategorySelect: React.FC<PaymentCategorySelectProps> = ({
  register,
  errors,
  setValue,
  watchCategoryId,
  isSubmitting,
}) => {
  const { categories, isLoading, error } = useCategories();

  return (
    <div>
      <label
        htmlFor="categoryId"
        className="block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        Категория
      </label>
      {isLoading && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Загрузка категорий...
        </p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
      {!isLoading && !error && (
        <select
          id="categoryId"
          {...register("categoryId")}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 ${
            errors.categoryId ? "border-red-500" : ""
          }`}
          disabled={isSubmitting || categories?.length === 0}
          value={watchCategoryId === null ? "" : watchCategoryId}
          onChange={(e) =>
            setValue(
              "categoryId",
              e.target.value === "" ? null : e.target.value,
              { shouldValidate: true }
            )
          }
        >
          <option value="">-- Без категории --</option>
          {categories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      )}
      {errors.categoryId && (
        <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
      )}
    </div>
  );
};

export default PaymentCategorySelect;
