export type TimeRangeOption = "1d" | "1w" | "1m" | "1y" | "custom";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selected?: T;
  onChange: (option: T) => void;
  className?: string;
  optionClassName?: string;
}

const SegmentedControl = <T extends string>({
  options,
  selected,
  onChange,
  className = "",
  optionClassName = "",
}: SegmentedControlProps<T>) => {
  return (
    <div
      className={`inline-flex rounded-xl bg-gray-100 dark:bg-gray-800/50 p-1 gap-1 ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
            selected === option.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
          } ${optionClassName}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
