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
    "flex items-center justify-center rounded-lg shadow-md hover:shadow-lg transition duration-150 cursor-pointer";

  const variants: Record<string, string> = {
    default: "py-2 px-4",
    small: "py-1 px-3 text-sm",
    icon: "p-2",
  };

  const colorScheme = "bg-indigo-500 text-white hover:bg-[#4036e2]";

  const classes = `${base} ${
    variants[variant] || ""
  } ${colorScheme} ${className}`.trim();

  return (
    <button className={classes} {...rest}>
      {icon && <span className="material-icons mr-2">{icon}</span>}
      {label || children}
    </button>
  );
};
