import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import CustomDatePicker from "./CustomDatePicker";
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
      <CustomDatePicker
        id="dueDate"
        label="Срок оплаты"
        selected={watchDueDate || null}
        onChange={(date: Date | null) => {
          if (date !== null) {
            setValue("dueDate", date, { shouldValidate: true });
          }
          // If date is null, react-hook-form validation will handle the required field check
        }}
        dateFormat="yyyy-MM-dd"
        disabled={isSubmitting}
        placeholderText="Выберите дату"
        error={errors.dueDate?.message}
      />
    </>
  );
};

export default PaymentDetailsSection;
