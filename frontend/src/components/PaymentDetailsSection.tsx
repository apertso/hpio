import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import DatePicker from "./DatePicker";
import { PaymentFormInputs } from "./PaymentForm"; // Assuming PaymentFormInputs is exported from PaymentForm
import { TextInputField, NumberField } from "./Input";
import Select from "./Select";
import { CURRENCY_OPTIONS } from "../utils/currencies";

interface PaymentDetailsSectionProps {
  register: UseFormRegister<PaymentFormInputs>;
  errors: FieldErrors<PaymentFormInputs>;
  setValue: UseFormSetValue<PaymentFormInputs>;
  watchDueDate: PaymentFormInputs["dueDate"];
  isSubmitting: boolean;
  showSeriesStartHint?: boolean;
  currency: string;
  onCurrencyChange: (value: string) => void;
}

const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  register,
  errors,
  setValue,
  watchDueDate,
  isSubmitting,
  showSeriesStartHint,
  currency,
  onCurrencyChange,
}) => {
  const { t } = useLanguage();
  return (
    <>
      {/* Поля: Название, Сумма, Срок оплаты */}
      <TextInputField
        label={t("Название")}
        inputId="title"
        error={errors.title?.message}
        required
        disabled={isSubmitting}
        {...register("title")}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t("Сумма")}
            inputId="amount"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            disabled={isSubmitting}
            error={errors.amount?.message}
            required
          />
          <Select
            id="currency"
            label={t("Валюта")}
            options={CURRENCY_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            }))}
            value={currency}
            onChange={(value) => onCurrencyChange(value || currency)}
            disabled={isSubmitting}
            error={errors.currency?.message}
            required
          />
        </div>
        <div className="space-y-1">
          <DatePicker
            id="dueDate"
            mode="single"
            label={t("Срок оплаты")}
            selected={watchDueDate || null}
            onSingleChange={(date: Date | null) => {
              setValue("dueDate", date as Date, { shouldValidate: true });
            }}
            disabled={isSubmitting}
            placeholder={t("Выберите дату")}
            error={errors.dueDate?.message}
          />
          {showSeriesStartHint && (
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
              {t("Эта дата станет датой начала для измененной серии.")}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentDetailsSection;
