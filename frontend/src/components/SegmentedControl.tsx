import React from "react";

export type TimeRangeOption = "1d" | "1w" | "1m" | "1y" | "custom";

interface SegmentedControlProps {
  selected: TimeRangeOption;
  onChange: (option: TimeRangeOption) => void;
  className?: string;
  optionClassName?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  selected,
  onChange,
  className = "",
  optionClassName = "",
}) => {
  const timeRangeOptions = [
    { value: "1d" as TimeRangeOption, label: "День" },
    { value: "1w" as TimeRangeOption, label: "Неделя" },
    { value: "1m" as TimeRangeOption, label: "Месяц" },
    { value: "1y" as TimeRangeOption, label: "Год" },
  ];
  return (
    <div
      className={`inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1 ${className}`}
    >
      {timeRangeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            selected === option.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
          } ${optionClassName}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
