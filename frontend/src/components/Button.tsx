import React from "react";
import { useGradientStroke } from "../hooks/useGradientStroke";
import { useUiSurface } from "../context/UiSurfaceContext";
import Spinner from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "link" | "ghost";
  size?: "default" | "small" | "large";
  layout?: "default" | "icon-only" | "text-only";
  loading?: boolean;
  animatedStroke?: boolean;
}

type StyleMap = Record<string, string>;

// Стили рабочего интерфейса: компактные, плоские, единый радиус
const APP_STYLES: {
  base: string;
  sizes: StyleMap;
  paddings: StyleMap;
  iconOnly: StyleMap;
  variants: StyleMap;
} = {
  base: "items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500/60 [&_svg]:size-4 [&_svg]:shrink-0",
  sizes: {
    small: "text-xs",
    default: "text-sm",
    large: "text-sm",
  },
  paddings: {
    small: "h-7 px-2.5",
    default: "h-9 md:h-8 px-3",
    large: "h-10 px-4",
  },
  iconOnly: {
    small: "size-7",
    default: "size-9 md:size-8",
    large: "size-10",
  },
  variants: {
    primary: "primary-action",
    secondary:
      "border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-100 dark:hover:bg-white/[0.08] dark:hover:border-white/15",
    destructive:
      "border border-red-700/20 bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-600/90 dark:hover:bg-red-600",
    link: "h-auto px-0 text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline bg-transparent dark:text-indigo-400",
    ghost:
      "border border-transparent bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/[0.06]",
  },
};

// Прежние стили для индексируемых публичных страниц
const LEGACY_STYLES = {
  base: "transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-xl active:scale-[0.98]",
  sizes: {
    default: "text-sm",
    small: "text-xs",
    large: "text-base",
  } as StyleMap,
  paddings: {
    small: "py-1.5 px-3",
    default: "py-2 px-4",
    large: "py-3 px-6",
  } as StyleMap,
  variants: {
    primary: "primary-action",
    secondary:
      "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800 dark:hover:bg-gray-800 dark:hover:border-gray-700 dark:focus:ring-offset-gray-900 shadow-sm",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 focus:ring-2 focus:ring-offset-1 focus:ring-red-500 dark:focus:ring-offset-gray-900 border border-transparent",
    link: "text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline shadow-none bg-transparent px-0 hover:bg-transparent",
    ghost:
      "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-offset-gray-900 border border-transparent",
  } as StyleMap,
};

export const Button: React.FC<ButtonProps> = ({
  label,
  icon,
  variant = "primary",
  size = "default",
  layout = "default",
  loading = false,
  animatedStroke = false,
  className = "",
  children,
  type = "button",
  ...rest
}) => {
  const strokeRef = useGradientStroke();
  const isLegacy = useUiSurface() === "public";

  const buildClasses = (): string => {
    if (isLegacy) {
      const paddings =
        variant !== "link"
          ? `flex items-center justify-center ${LEGACY_STYLES.paddings[size]}`
          : "";
      const layouts: StyleMap = {
        default: "",
        "icon-only": "p-2 aspect-square justify-center",
        "text-only": "",
      };
      return `${LEGACY_STYLES.base} ${LEGACY_STYLES.sizes[size]} ${paddings} ${layouts[layout]} ${LEGACY_STYLES.variants[variant]}`;
    }

    const dimensions =
      variant === "link"
        ? ""
        : layout === "icon-only"
          ? APP_STYLES.iconOnly[size]
          : APP_STYLES.paddings[size];
    // Если вызывающий код сам задаёт display (например, "hidden md:inline-flex"),
    // базовый inline-flex не добавляем, иначе он перебьёт hidden
    const hasCustomDisplay =
      /(^|\s)(hidden|flex|inline-flex|block|inline-block|grid)(\s|$)/.test(className);
    const display = hasCustomDisplay ? "" : "inline-flex";
    return `${display} ${APP_STYLES.base} ${APP_STYLES.sizes[size]} ${dimensions} ${APP_STYLES.variants[variant]}`;
  };

  const classes =
    `${buildClasses()} ${animatedStroke ? "gradient-stroke" : ""} ${className}`.trim();

  const renderContent = () => {
    if (layout === "icon-only") {
      return loading ? <Spinner size="sm" /> : icon;
    }

    // В рабочем интерфейсе отступы задаются через gap, в публичном — через margin
    const iconSpacing = isLegacy ? "mr-2 -ml-1" : "-ml-0.5";
    const spinnerClassName = isLegacy
      ? layout === "text-only" || !icon
        ? "mr-2"
        : "mr-2 -ml-1"
      : "-ml-0.5";

    const baseContent =
      layout === "text-only" ? (
        label || children
      ) : (
        <>
          {icon && !loading && (
            <span className={`inline-flex ${iconSpacing}`}>{icon}</span>
          )}
          {label || children}
        </>
      );

    if (loading) {
      return (
        <>
          <Spinner
            size="sm"
            className={`${spinnerClassName} ${isLegacy ? "" : "text-current! opacity-80"}`}
          />
          {baseContent}
        </>
      );
    }

    return baseContent;
  };

  return (
    <button
      ref={animatedStroke ? strokeRef : undefined}
      type={type}
      className={classes}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {renderContent()}
      {animatedStroke && (
        <span className="gradient-stroke-edge" aria-hidden="true" />
      )}
    </button>
  );
};
