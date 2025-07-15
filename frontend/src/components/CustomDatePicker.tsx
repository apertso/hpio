import React from "react";
import DatePicker, { DatePickerProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface CustomDatePickerProps extends Omit<DatePickerProps, "onChange"> {
  label?: string;
  error?: string;
  onChange: (
    date: Date | Date[] | null,
    event:
      | React.MouseEvent<HTMLElement>
      | React.KeyboardEvent<HTMLElement>
      | undefined
  ) => void;
}

const CustomDatePicker = React.forwardRef<any, CustomDatePickerProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const baseClasses =
      "block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";
    const errorClasses = error ? "border-red-500 dark:border-red-500" : "";

    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
          >
            {label}
          </label>
        )}
        <DatePicker
          id={id}
          ref={ref}
          className={`${baseClasses} ${errorClasses} ${className}`}
          wrapperClassName="w-full"
          autoComplete="off"
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

CustomDatePicker.displayName = "CustomDatePicker";

export default CustomDatePicker;
