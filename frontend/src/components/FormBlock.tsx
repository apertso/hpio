import React from "react";

interface FormBlockProps {
  children: React.ReactNode;
  className?: string;
}

const FormBlock: React.FC<FormBlockProps> = ({ children, className = "" }) => {
  const baseClasses = "bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md";

  return <div className={`${baseClasses} ${className}`}>{children}</div>;
};

export default FormBlock;
