import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

const Icon: React.FC<IconProps> = ({ className = "", ...props }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 4 H9 A3 3 0 0 0 6 7 V27.6667 A3 3 0 0 0 9 30.6667 H21 A3 3 0 0 1 24 33.6667 V41 A3 3 0 0 0 27 44 H39 A3 3 0 0 0 42 41 V20.3333 A3 3 0 0 0 39 17.3333 H27 A3 3 0 0 1 24 14.3333 V7 A3 3 0 0 0 21 4 Z" />
    </svg>
  );
};

export default Icon;
