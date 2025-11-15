import React, { useRef } from "react";
import { useDropdown } from "../hooks/useDropdown";
import Overlay from "./Overlay";

export interface DropdownOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  value?: string | number;
}

export interface DropdownButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  options: DropdownOption[];
  selectedValue?: string | number;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  icon,
  options,
  className = "h-9 min-w-20 rounded-xl bg-gray-100 dark:bg-[#111316] pl-4 pr-3 text-sm text-gray-800 dark:text-white",
  selectedValue,
  ...rest
}) => {
  const { isOpen, setIsOpen, containerRef } = useDropdown();
  const optionsRef = useRef<HTMLDivElement>(null);

  const classes =
    `flex items-center justify-center focus:outline-none cursor-pointer ${className}`.trim();

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        className={classes}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        {...rest}
      >
        <span className="flex-1 text-center">{label}</span>
        {icon && <span>{icon}</span>}
        <span
          className={`transition-transform ml-2 flex items-center ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <Overlay
        isOpen={isOpen}
        widthClass="min-w-24"
        anchorRef={containerRef}
      >
        <div
          ref={optionsRef}
          className="relative max-h-60 overflow-y-auto"
          style={{ position: "relative" }}
        >
          {options.map((option, idx) => (
            <button
              key={option.label + idx}
              className={`w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer ${
                option.value !== undefined && option.value === selectedValue
                  ? "bg-gray-200 dark:bg-gray-700 font-bold"
                  : ""
              }`}
              onClick={() => {
                option.onClick();
                setIsOpen(false);
              }}
              type="button"
            >
              {option.icon && <span>{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>
      </Overlay>
    </div>
  );
};

export default DropdownButton;
