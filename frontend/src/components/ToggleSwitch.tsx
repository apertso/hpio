import React from "react";
import { Input } from "./Input";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  ariaLabel,
  disabled,
}) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <Input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        disabled={disabled}
        unstyled
      />
      <div className="relative w-[32px] h-[18px] shrink-0 rounded-full bg-gray-300 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-500 peer-disabled:opacity-50 dark:bg-white/15 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 after:content-[''] after:absolute after:left-[2px] after:top-[2px] after:size-[14px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform motion-reduce:after:transition-none peer-checked:after:translate-x-[14px]"></div>
    </label>
  );
};

export default ToggleSwitch;
