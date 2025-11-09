import React, { useRef } from "react";

export type TimeRangeOption = "1d" | "1w" | "1m" | "1y" | "custom";

interface SegmentedControlProps {
  selected: TimeRangeOption;
  onChange: (option: TimeRangeOption) => void;
  className?: string;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  selected,
  onChange,
  className = "",
}) => {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const timeRangeOptions = [
    { value: "1d" as TimeRangeOption, label: "День" },
    { value: "1w" as TimeRangeOption, label: "Неделя" },
    { value: "1m" as TimeRangeOption, label: "Месяц" },
    { value: "1y" as TimeRangeOption, label: "Год" },
    { value: "custom" as TimeRangeOption, label: "Другой" },
  ];

  const currentIndex = timeRangeOptions.findIndex(
    (option) => option.value === selected
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === 0 || touchStartY.current === 0) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Обрабатываем только горизонтальные свайпы (игнорируем вертикальные)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Свайп вправо - переходим к следующему варианту (вправо)
        if (currentIndex < timeRangeOptions.length - 1) {
          onChange(timeRangeOptions[currentIndex + 1].value);
        }
      } else {
        // Свайп влево - переходим к предыдущему варианту (влево)
        if (currentIndex > 0) {
          onChange(timeRangeOptions[currentIndex - 1].value);
        }
      }
    }

    // Сбрасываем координаты касания
    touchStartX.current = 0;
    touchStartY.current = 0;
  };
  return (
    <div
      className={`inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1 ${className}`}
    >
      {timeRangeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          onTouchStart={
            selected === option.value ? handleTouchStart : undefined
          }
          onTouchEnd={selected === option.value ? handleTouchEnd : undefined}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            selected === option.value
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default SegmentedControl;
