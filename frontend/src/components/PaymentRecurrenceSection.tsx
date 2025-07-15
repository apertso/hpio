import React, { useEffect } from "react";
import {
  UseFormSetValue,
  FieldErrors,
  UseFormClearErrors,
} from "react-hook-form";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PaymentFormInputs } from "./PaymentForm"; // Assuming PaymentFormInputs is exported
import Select, { SelectOption } from "./Select";

interface PaymentRecurrenceSectionProps {
  errors: FieldErrors<PaymentFormInputs>;
  setValue: UseFormSetValue<PaymentFormInputs>;
  watchRecurrencePattern: PaymentFormInputs["recurrencePattern"];
  watchRecurrenceEndDate: PaymentFormInputs["recurrenceEndDate"];
  isSubmitting: boolean;
  clearErrors: UseFormClearErrors<PaymentFormInputs>;
}

const recurrenceOptions: SelectOption[] = [
  { value: null, label: "-- Не повторять --" },
  { value: "daily", label: "Ежедневно" },
  { value: "weekly", label: "Еженедельно" },
  { value: "monthly", label: "Ежемесячно" },
  { value: "yearly", label: "Ежегодно" },
];

const PaymentRecurrenceSection: React.FC<PaymentRecurrenceSectionProps> = ({
  errors,
  setValue,
  watchRecurrencePattern,
  watchRecurrenceEndDate,
  isSubmitting,
  clearErrors,
}) => {
  useEffect(() => {
    if (!watchRecurrencePattern) {
      setValue("recurrenceEndDate", null);
      clearErrors(["recurrenceEndDate"]);
    }
  }, [watchRecurrencePattern, setValue, clearErrors]);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
        Настройка повторения
      </label>
      <div className="space-y-4">
        <div>
          <Select
            label="Повторять"
            options={recurrenceOptions}
            value={watchRecurrencePattern || null}
            onChange={(value) =>
              setValue(
                "recurrencePattern",
                value as PaymentFormInputs["recurrencePattern"],
                { shouldValidate: true }
              )
            }
            disabled={isSubmitting}
            error={errors.recurrencePattern?.message}
            placeholder="-- Не повторять --"
          />
        </div>
        {watchRecurrencePattern && (
          <div>
            <label
              htmlFor="recurrenceEndDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Дата окончания (опционально)
            </label>
            <DatePicker
              id="recurrenceEndDate"
              selected={watchRecurrenceEndDate || null}
              onChange={(date: Date | null) =>
                setValue("recurrenceEndDate", date, {
                  shouldValidate: true,
                })
              }
              dateFormat="yyyy-MM-dd"
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 ${
                errors.recurrenceEndDate ? "border-red-500" : ""
              }`}
              wrapperClassName="w-full"
              disabled={isSubmitting}
              isClearable
              placeholderText="Выберите дату окончания"
            />
            {errors.recurrenceEndDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.recurrenceEndDate.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentRecurrenceSection;
