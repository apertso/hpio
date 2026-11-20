import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { useUiSurface } from "../context/UiSurfaceContext";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Размеры для рабочего интерфейса
const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

// Размеры для публичных страниц (прежние)
const legacySizeClasses = {
  sm: "w-6 h-6",
  md: "w-10 h-10",
  lg: "w-16 h-16",
};

const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  const { t } = useLanguage();
  const isLegacy = useUiSurface() === "public";

  if (isLegacy) {
    return (
      <div
        className={`relative ${legacySizeClasses[size]} ${className}`}
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
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
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
        <span className="sr-only">{t("Загрузка...")}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 text-gray-400 dark:text-gray-500 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Трек и дуга в цвете текста — без декоративных градиентов */}
      <svg
        className="w-full h-full animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.5"
        />
        <path
          d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{t("Загрузка...")}</span>
    </div>
  );
};

export default Spinner;
