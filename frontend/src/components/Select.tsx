// frontend/src/components/Select.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

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
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    "relative block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 text-left flex items-center justify-between cursor-pointer";
  const errorClasses = error ? "border-red-500 dark:border-red-500" : "";
  const disabledClasses = disabled
    ? "opacity-50 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
    : "";

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={`${baseClasses} ${errorClasses} ${disabledClasses}`}
        onClick={handleToggle}
        disabled={disabled}
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

      {isOpen &&
        dropdownPosition &&
        ReactDOM.createPortal(
          <div
            data-select-dropdown
            className="fixed z-[9999] rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-300 dark:border-gray-600 max-h-60 overflow-y-auto"
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
                      ? "bg-gray-200 dark:bg-gray-700 font-bold"
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

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Select;
