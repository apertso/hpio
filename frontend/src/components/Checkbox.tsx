import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, ...rest }, ref) => {
    const [isChecked, setIsChecked] = React.useState(rest.checked || false);
    const checked = rest.checked !== undefined ? rest.checked : isChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (rest.checked === undefined) {
        setIsChecked(e.target.checked);
      }
      rest.onChange?.(e);
    };

    return (
      <label htmlFor={id} className="flex items-center cursor-pointer group">
        <input
          id={id}
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          {...rest}
          checked={checked}
          onChange={handleChange}
        />
        <span
          className={`w-7 h-7 md:w-5 md:h-5 border-2 rounded flex items-center justify-center transition-all flex-shrink-0 focus-within:ring-2 focus-within:ring-blue-400 dark:focus-within:ring-blue-600 ${
            checked
              ? "border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500"
              : "border-gray-400 dark:border-gray-500"
          }`}
        >
          <CheckIcon
            className={`w-5 h-5 md:w-3.5 md:h-3.5 text-white transition-transform ${
              checked ? "scale-100" : "scale-0"
            }`}
          />
        </span>
        {label && (
          <div className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
            {label}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
