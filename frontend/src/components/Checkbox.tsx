import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Input } from "./Input";

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
        <Input
          id={id}
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          {...rest}
          checked={checked}
          onChange={handleChange}
          unstyled
        />
        <span
          className={`size-5 md:size-4 border rounded-[4px] flex items-center justify-center transition-all flex-shrink-0 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500 ${
            checked
              ? "border-indigo-600 bg-indigo-600 dark:border-indigo-500 dark:bg-indigo-500"
              : "border-gray-300 bg-white group-hover:border-gray-400 dark:border-white/20 dark:bg-transparent"
          }`}
        >
          <CheckIcon
            strokeWidth={3}
            className={`size-3.5 md:size-3 text-white transition-transform ${
              checked ? "scale-100" : "scale-0"
            }`}
          />
        </span>
        {label && (
          <div className="ml-2.5 text-sm text-gray-800 dark:text-gray-200">
            {label}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
