import React from "react";

interface ChevronDownIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const ChevronDownIcon: React.FC<ChevronDownIconProps> = ({
  className = "",
  ...props
}) => {
  return (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 20 20"
      className={className}
      {...props}
    >
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

