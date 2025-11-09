import React from "react";

interface FormBlockProps {
  children: React.ReactNode;
  className?: string;
}

const FormBlock: React.FC<FormBlockProps> = ({ children, className = "" }) => {
  return <div className={`${className}`}>{children}</div>;
};

export default FormBlock;
