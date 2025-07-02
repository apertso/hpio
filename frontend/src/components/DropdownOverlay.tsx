import React from "react";

interface DropdownOverlayProps {
  isOpen: boolean;
  children: React.ReactNode;
  align?: "left" | "right";
  widthClass?: string;
}

const DropdownOverlay: React.FC<DropdownOverlayProps> = ({
  isOpen,
  children,
  align = "left",
  widthClass = "w-56",
}) => {
  if (!isOpen) {
    return null;
  }

  const alignmentClass =
    align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left";

  const baseClasses = `absolute mt-2 z-20 ${widthClass} rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-300 dark:border-gray-700`;

  return (
    <div
      className={`${baseClasses} ${alignmentClass}`}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );
};

export default DropdownOverlay;
