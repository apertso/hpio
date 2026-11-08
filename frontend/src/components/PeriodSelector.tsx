import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { enUS, ru } from "date-fns/locale";
import "./PeriodSelector.css";


interface PeriodSelectorProps {
  initialDateRange: [Date | null, Date | null];
  onApply: (dateRange: [Date, Date]) => void;
  onCancel: () => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  initialDateRange,
  onApply,
  onCancel,
}) => {
  const { t, language } = useLanguage();
  const [dateRange, setDateRange] =
    useState<[Date | null, Date | null]>(initialDateRange);
  const [startDate, endDate] = dateRange;

  const handleApply = () => {
    if (startDate && endDate) {
      onApply([startDate, endDate]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <DatePicker
          selected={startDate}
          onChange={(dates) => {
            const [start, end] = dates as [Date | null, Date | null];
            setDateRange([start, end]);
          }}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          inline
          calendarClassName="w-full"
          className="w-full"
          dateFormat="P"
          locale={language === "en" ? enUS : ru}
        />
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
        <button
          type="button"
          className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={onCancel}
        >
          {t("Отмена")}
        </button>
        <button
          type="button"
          disabled={!startDate || !endDate}
          className="primary-action cursor-pointer w-full sm:w-auto inline-flex justify-center rounded-md shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleApply}
        >
          {t("Применить")}
        </button>
      </div>
    </div>
  );
};

export default PeriodSelector;
