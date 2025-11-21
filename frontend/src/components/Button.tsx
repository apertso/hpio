import React from "react";
import Spinner from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "link" | "ghost";
  size?: "default" | "small" | "large";
  layout?: "default" | "icon-only" | "text-only";
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  icon,
  variant = "primary",
  size = "default",
  layout = "default",
  loading = false,
  className = "",
  children,
  type = "button",
  ...rest
}) => {
  // Base styles that apply to all buttons
  const base =
    "transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium rounded-xl active:scale-[0.98]";

  // Size styles
  const sizes: Record<string, string> = {
    default: "text-sm",
    small: "text-xs",
    large: "text-base",
  };

  const paddingSizes: Record<string, string> = {
    small: "py-1.5 px-3",
    default: "py-2 px-4",
    large: "py-3 px-6",
  };

  // Layout styles
  const layouts: Record<string, string> = {
    default: "",
    "icon-only": "p-2 aspect-square justify-center",
    "text-only": "",
  };

  // Variant (color) styles
  const variants: Record<string, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 border border-transparent",
    secondary:
      "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-800 dark:hover:bg-gray-800 dark:hover:border-gray-700 dark:focus:ring-offset-gray-900 shadow-sm",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 focus:ring-2 focus:ring-offset-1 focus:ring-red-500 dark:focus:ring-offset-gray-900 border border-transparent",
    link: "text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline shadow-none bg-transparent px-0 hover:bg-transparent",
    ghost:
      "bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-offset-gray-900 border border-transparent",
  };

  const paddings =
    variant !== "link"
      ? `flex items-center justify-center ${paddingSizes[size]}`
      : "";

  const classes =
    `${base} ${sizes[size]} ${paddings} ${layouts[layout]} ${variants[variant]} ${className}`.trim();

  const renderContent = () => {
    if (layout === "icon-only") {
      return loading ? <Spinner size="sm" /> : icon;
    }

    const spinnerClassName =
      layout === "text-only" || !icon ? "mr-2" : "mr-2 -ml-1";

    const baseContent =
      layout === "text-only" ? (
        label || children
      ) : (
        <>
          {icon && !loading && <span className="mr-2 -ml-1">{icon}</span>}
          {label || children}
        </>
      );

    if (loading) {
      return (
        <>
          <Spinner size="sm" className={spinnerClassName} />
          {baseContent}
        </>
      );
    }

    return baseContent;
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {renderContent()}
    </button>
  );
};
