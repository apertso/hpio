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

// Пункт выпадающего меню — общий вид для всех меню приложения
const MENU_ITEM_CLASS =
  "w-full text-left px-2 h-8 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer [&_svg]:size-4 [&_svg]:text-gray-400";

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  icon,
  options,
  className = "h-8 min-w-20 rounded-md bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 shadow-sm pl-3 pr-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors",
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
          className={`transition-transform ml-1 flex items-center text-gray-400 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 20 20">
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
          className="relative max-h-60 overflow-y-auto p-1"
          style={{ position: "relative" }}
        >
          {options.map((option, idx) => (
            <button
              key={option.label + idx}
              className={`whitespace-nowrap ${MENU_ITEM_CLASS} ${
                option.value !== undefined && option.value === selectedValue
                  ? "bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-gray-50 font-medium"
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
