// frontend/src/components/Select.tsx
import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import ReactDOM from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { TextField } from "./Input";

export interface SelectOption {
  value: string | null;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  required?: boolean;
  hint?: React.ReactNode;
  description?: React.ReactNode;
  wrapperClassName?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  disabled,
  placeholder,
  id,
  required,
  hint,
  description,
  wrapperClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy =
    [descriptionId, hintId, errorId].filter(Boolean).join(" ") || undefined;

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        // Calculate position when opening
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
          });
        }
      }
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string | null) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Don't close if clicking on the dropdown (which is now a portal)
    const target = event.target as Element;
    const isClickOnDropdown = target.closest("[data-select-dropdown]") !== null;

    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node) &&
      !isClickOnDropdown
    ) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  const selectedOption = options.find((opt) => opt.value === value);

  const baseClasses =
    "relative block w-full min-w-[12em] max-w-[64em] rounded-xl bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-500 shadow-sm border border-gray-200 focus:outline-none focus:ring-3 focus:ring-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 text-left flex items-center justify-between cursor-pointer transition-colors";
  const errorClasses = error ? "focus:ring-3 focus:ring-red-500" : "";
  const disabledClasses = disabled
    ? "cursor-not-allowed opacity-70 bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-500"
    : "";

  return (
    <div
      className={`relative ${wrapperClassName ?? ""}`.trim()}
      ref={containerRef}
    >
      <TextField
        label={label}
        hint={hint}
        description={description}
        error={error}
        required={required}
        inputId={fieldId}
        className="w-full"
      >
        <button
          ref={buttonRef}
          id={fieldId}
          type="button"
          className={`${baseClasses} ${errorClasses} ${disabledClasses}`}
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
        >
          <span
            className={selectedOption ? "" : "text-gray-400 dark:text-gray-500"}
          >
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </TextField>

      {isOpen &&
        dropdownPosition &&
        ReactDOM.createPortal(
          <div
            data-select-dropdown
            className="fixed z-[9999] rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 max-h-60 overflow-y-auto"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
            }}
          >
            <ul className="py-1">
              {options.map((option) => (
                <li
                  key={option.value || "null-option"}
                  className={`px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                    value === option.value
                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                      : ""
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Select;
