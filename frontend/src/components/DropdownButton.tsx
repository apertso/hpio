import React, { useState, useRef, useEffect } from "react";

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
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const classes =
    `flex h-[35px] min-w-[80px] items-center justify-center rounded-xl bg-[#111316] text-white pl-4 pr-3 focus:outline-none transition-colors duration-150 ${className}`.trim();

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        className={classes}
        style={{ boxShadow: "none", border: "none" }}
        type="button"
        onClick={() => setOpen((o) => !o)}
        {...rest}
      >
        <span className="text-sm flex-1 text-center">{label}</span>
        {icon && <span>{icon}</span>}
        <span
          className={`transition-transform ml-2 flex items-center ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
            <path
              d="M6 8l4 4 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-2 z-20 min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-200 dark:border-gray-700"
        >
          {options.map((option, idx) => (
            <button
              key={option.label + idx}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                setOpen(false);
                option.onClick();
              }}
              type="button"
            >
              {option.icon && <span>{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownButton;
