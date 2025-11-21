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
  showSeriesStartHint?: boolean;
}

const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  register,
  errors,
  setValue,
  watchDueDate,
  isSubmitting,
  showSeriesStartHint,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NumberField
          label="Сумма"
          inputId="amount"
          step="0.01"
          {...register("amount", { valueAsNumber: true })}
          disabled={isSubmitting}
          error={errors.amount?.message}
          required
        />
        <div className="space-y-1">
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
          {showSeriesStartHint && (
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
              Эта дата станет датой начала для измененной серии.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentDetailsSection;
