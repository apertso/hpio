import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  variant?: "default" | "small" | "icon";
}

export const Button: React.FC<ButtonProps> = ({
  label,
  icon,
  variant = "default",
  className = "",
  children,
  ...rest
}) => {
  const base =
    "flex items-center justify-center rounded-full text-white cursor-pointer overflow-hidden";

  const variants: Record<string, string> = {
    default: "h-10 px-4 text-sm font-bold tracking-[0.015em]",
    small: "h-8 px-4 text-sm font-medium",
    icon: "h-10 w-10 p-2",
  };

  const classes = `${base} ${variants[variant] || ""} ${className}`.trim();

  return (
    <button
      className={classes}
      style={{ backgroundColor: "var(--color-dark-gray)" }}
      {...rest}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label || children}
    </button>
  );
};
