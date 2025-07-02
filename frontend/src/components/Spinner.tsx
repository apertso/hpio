import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  return (
    <div
      className={`relative ${sizeClasses[size]} ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg
        className="w-full h-full animate-spin"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="spinner-gradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#6366f1" /> {/* indigo-500 */}
            <stop offset="50%" stopColor="#8b5cf6" /> {/* violet-500 */}
            <stop offset="100%" stopColor="#ec4899" /> {/* pink-500 */}
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="url(#spinner-gradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="282.74"
          strokeDashoffset="141.37"
        />
      </svg>
      <span className="sr-only">Загрузка...</span>
    </div>
  );
};

export default Spinner;
