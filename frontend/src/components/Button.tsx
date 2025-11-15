import React from "react";
import Spinner from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "destructive" | "link";
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
    "transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  // Size styles
  const sizes: Record<string, string> = {
    default: "",
    small: "text-sm",
    large: "font-bold text-base",
  };

  const paddingSizes: Record<string, string> = {
    small: "py-2 px-3",
    default: "py-2 px-4",
    large: "py-3 px-4",
  };

  // Layout styles
  const layouts: Record<string, string> = {
    default: "",
    "icon-only": "p-2",
    "text-only": "",
  };

  // Variant (color) styles
  const variants: Record<string, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg",
    secondary:
      "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
    destructive:
      "bg-red-600 text-base font-medium text-white hover:bg-red-700 shadow-md hover:shadow-lg",
    link: "text-blue-500 hover:text-blue-600",
  };

  const paddings =
    variant !== "link"
      ? `flex items-center justify-center rounded-lg ${paddingSizes[size]}`
      : "";

  const classes =
    `${base} ${sizes[size]} ${paddings} ${layouts[layout]} ${variants[variant]} ${className}`.trim();

  const renderContent = () => {
    if (loading) {
      return <Spinner size="sm" />;
    }

    switch (layout) {
      case "icon-only":
        return icon;
      case "text-only":
        return label || children;
      default:
        return (
          <>
            {icon && <span className="mr-2">{icon}</span>}
            {label || children}
          </>
        );
    }
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
