import React, { InputHTMLAttributes, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ref?: React.Ref<HTMLInputElement>;
}

const Input = ({
  label,
  error,
  className = "",
  id,
  type,
  ref,
  ...rest
}: InputProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === "password";

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((prev) => !prev);
  };

  const inputType = isPasswordField
    ? isPasswordVisible
      ? "text"
      : "password"
    : type;

  const baseClasses =
    "block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500";
  const errorClasses = error ? "border-red-500 dark:border-red-500" : "";
  const passwordFieldClasses = isPasswordField ? "pr-10" : ""; // Add padding for the icon

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
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={inputType}
          className={`${baseClasses} ${errorClasses} ${passwordFieldClasses} ${className}`}
          autoComplete={rest.autoComplete || "off"}
          {...rest}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
            aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
          >
            {isPasswordVisible ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export { Input };
