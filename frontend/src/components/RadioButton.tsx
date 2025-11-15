import React from "react";
import { Input } from "./Input";

interface RadioButtonProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

const RadioButton = ({ label, id, ref, ...rest }: RadioButtonProps) => {
  return (
    <label htmlFor={id} className="flex items-center cursor-pointer group">
      <Input
        id={id}
        type="radio"
        ref={ref}
        className="sr-only peer"
        {...rest}
        unstyled
      />
      <span className="w-4 h-4 rounded-full border-2 border-gray-400 dark:border-gray-500 peer-checked:border-blue-600 dark:peer-checked:border-blue-500 flex items-center justify-center transition-colors flex-shrink-0">
        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-500 scale-0 peer-checked:scale-100 transition-transform" />
      </span>
      <div className="ml-3 text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </div>
    </label>
  );
};

export default RadioButton;
