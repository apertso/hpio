export type TimeRangeOption = "1d" | "1w" | "1m" | "1y" | "custom";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Внешний вид переключателя:
 * - `segmented` — компактный переключатель-«таблетка» (фильтры, периоды, формы);
 * - `tabs` — вкладки с подчёркиванием для панели инструментов страницы.
 */
export type SegmentedControlVariant = "segmented" | "tabs";

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selected?: T;
  onChange: (option: T) => void;
  variant?: SegmentedControlVariant;
  /** Доступное название группы (например, «Статус») */
  ariaLabel?: string;
  className?: string;
  optionClassName?: string;
}

const containerClasses: Record<SegmentedControlVariant, string> = {
  segmented:
    "inline-flex rounded-md border border-[var(--ui-border)] bg-gray-100/70 dark:bg-white/[0.03] p-0.5 gap-0.5",
  // Подчёркивание активной вкладки ложится на нижнюю границу панели инструментов,
  // поэтому контейнер растягивается на всю её высоту.
  tabs: "flex self-stretch gap-3 md:gap-5",
};

const optionBaseClasses: Record<SegmentedControlVariant, string> = {
  segmented:
    "px-3 h-7 inline-flex items-center whitespace-nowrap text-sm font-medium rounded-[5px] transition-colors duration-150",
  tabs: "relative inline-flex cursor-pointer items-center whitespace-nowrap text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500",
};

const optionStateClasses: Record<
  SegmentedControlVariant,
  { active: string; inactive: string }
> = {
  segmented: {
    active:
      "bg-white dark:bg-white/[0.09] text-gray-900 dark:text-gray-50 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.06]",
    inactive:
      "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer",
  },
  tabs: {
    active:
      "font-semibold text-gray-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-current dark:text-gray-50",
    inactive:
      "font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer",
  },
};

const SegmentedControl = <T extends string>({
  options,
  selected,
  onChange,
  variant = "segmented",
  ariaLabel,
  className = "",
  optionClassName = "",
}: SegmentedControlProps<T>) => {
  const stateClasses = optionStateClasses[variant];

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`${containerClasses[variant]} ${className}`}
    >
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(option.value)}
            className={`${optionBaseClasses[variant]} ${
              isSelected ? stateClasses.active : stateClasses.inactive
            } ${optionClassName}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
