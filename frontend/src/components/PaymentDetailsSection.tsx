import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PaymentFormInputs } from "./PaymentForm"; // Assuming PaymentFormInputs is exported from PaymentForm

interface PaymentDetailsSectionProps {
  register: UseFormRegister<PaymentFormInputs>;
  errors: FieldErrors<PaymentFormInputs>;
  setValue: UseFormSetValue<PaymentFormInputs>;
  watchDueDate: PaymentFormInputs["dueDate"];
  isSubmitting: boolean;
}

const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  register,
  errors,
  setValue,
  watchDueDate,
  isSubmitting,
}) => {
  return (
    <>
      {/* Поля: Название, Сумма, Срок оплаты */}
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
          {...register("title")}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 ${
            errors.title ? "border-red-500" : ""
          }`}
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
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
          {...register("amount", { valueAsNumber: true })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 ${
            errors.amount ? "border-red-500" : ""
          }`}
          disabled={isSubmitting}
        />
        {errors.amount && (
          <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
        )}
      </div>
      <div>
        <label
          htmlFor="dueDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          Срок оплаты
        </label>
        <DatePicker
          id="dueDate"
          selected={watchDueDate || null}
          autoComplete="off"
          onChange={(date: Date | null) => {
            if (date !== null) {
              setValue("dueDate", date, { shouldValidate: true });
            }
            // If date is null, react-hook-form validation will handle the required field check
          }}
          dateFormat="yyyy-MM-dd"
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 ${
            errors.dueDate ? "border-red-500" : ""
          }`}
          wrapperClassName="w-full"
          disabled={isSubmitting}
          placeholderText="Выберите дату"
        />
        {errors.dueDate && (
          <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
        )}
      </div>
    </>
  );
};

export default PaymentDetailsSection;
