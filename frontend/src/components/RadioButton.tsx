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
      <span className="w-4 h-4 rounded-full border border-gray-300 dark:border-white/20 peer-checked:border-indigo-600 peer-checked:border-[5px] dark:peer-checked:border-indigo-500 flex items-center justify-center transition-colors flex-shrink-0" />
      <div className="ml-2.5 text-sm text-gray-800 dark:text-gray-200">
        {label}
      </div>
    </label>
  );
};

export default RadioButton;
