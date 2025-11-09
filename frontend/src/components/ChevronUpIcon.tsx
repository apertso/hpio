import React from "react";

interface ChevronUpIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const ChevronUpIcon: React.FC<ChevronUpIconProps> = ({
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
        d="M6 12l4-4 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
