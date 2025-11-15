import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import DatePicker from "./DatePicker";
import { PaymentFormInputs } from "./PaymentForm"; // Assuming PaymentFormInputs is exported from PaymentForm
import { TextInputField, NumberField } from "./Input";

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
      <TextInputField
        label="Название"
        inputId="title"
        error={errors.title?.message}
        required
        disabled={isSubmitting}
        {...register("title")}
      />
      <NumberField
        label="Сумма"
        inputId="amount"
        step="0.01"
        {...register("amount", { valueAsNumber: true })}
        disabled={isSubmitting}
        error={errors.amount?.message}
        required
      />
      <DatePicker
        id="dueDate"
        mode="single"
        label="Срок оплаты"
        selected={watchDueDate || null}
        onSingleChange={(date: Date | null) => {
          setValue("dueDate", date as Date, { shouldValidate: true });
        }}
        dateFormat="yyyy-MM-dd"
        disabled={isSubmitting}
        placeholder="Выберите дату"
        error={errors.dueDate?.message}
      />
    </>
  );
};

export default PaymentDetailsSection;
