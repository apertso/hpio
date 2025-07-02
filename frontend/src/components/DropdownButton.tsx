import React, { useRef, useState, useEffect } from "react";
import { useDropdown } from "../hooks/useDropdown";
import DropdownOverlay from "./DropdownOverlay";
import Scrollbar from "./Scrollbar";

export interface DropdownOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface DropdownButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
  options: DropdownOption[];
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  icon,
  options,
  className = "",
  ...rest
}) => {
  const { isOpen, setIsOpen, containerRef } = useDropdown();
  const optionsRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const el = optionsRef.current;
    if (el) {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  }, [isOpen, options]);

  const classes =
    `flex h-9 min-w-20 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#111316] text-gray-800 dark:text-white border border-gray-300 dark:border-transparent pl-4 pr-3 focus:outline-none cursor-pointer ${className}`.trim();

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        className={classes}
        style={{ boxShadow: "none", border: "none" }}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        {...rest}
      >
        <span className="text-sm flex-1 text-center">{label}</span>
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

      <DropdownOverlay isOpen={isOpen} align="left" widthClass="min-w-full">
        <Scrollbar containerRef={optionsRef} />
        <div
          ref={optionsRef}
          className={`relative max-h-60 overflow-y-auto${
            isOverflowing ? " pr-4" : ""
          }`}
          style={{ position: "relative" }}
        >
          {options.map((option, idx) => (
            <button
              key={option.label + idx}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
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
      </DropdownOverlay>
    </div>
  );
};

export default DropdownButton;
