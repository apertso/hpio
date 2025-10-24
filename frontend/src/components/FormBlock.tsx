import React from "react";

interface FormBlockProps {
  children: React.ReactNode;
  className?: string;
}

const FormBlock: React.FC<FormBlockProps> = ({ children, className = "" }) => {
  const baseClasses =
    "md:bg-white md:dark:bg-gray-900 md:p-6 md:rounded-lg md:shadow-md";

  return <div className={`${baseClasses} ${className}`}>{children}</div>;
};

export default FormBlock;
