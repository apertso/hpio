import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PaymentFormInputs } from "./PaymentForm"; // Assuming PaymentFormInputs is exported from PaymentForm
import { Input } from "./Input";

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
      <Input
        id="title"
        label="Название"
        type="text"
        {...register("title")}
        disabled={isSubmitting}
        error={errors.title?.message}
      />
      <Input
        id="amount"
        label="Сумма"
        type="number"
        step="0.01"
        {...register("amount", { valueAsNumber: true })}
        disabled={isSubmitting}
        error={errors.amount?.message}
      />
      <div>
        <label
          htmlFor="dueDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
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
          className={`block w-full rounded-md border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 ${
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
