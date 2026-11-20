import React from "react";
import { useDropdown } from "../hooks/useDropdown";
import Overlay from "./Overlay";
import { ChevronDownIcon } from "./ChevronDownIcon";

export interface YearSelectorDropdownProps {
  years: number[];
  selectedYear: number;
  onChange: (year: number) => void;
}

export const YearSelectorDropdown: React.FC<YearSelectorDropdownProps> = ({
  years,
  selectedYear,
  onChange,
}) => {
  const { isOpen, setIsOpen, containerRef } = useDropdown();

  // Split years into 4 columns (vertical lists)
  const columns = 4;
  const yearsPerColumn = Math.ceil(years.length / columns);
  const yearColumns: number[][] = Array.from({ length: columns }, (_, colIdx) =>
    years.slice(colIdx * yearsPerColumn, (colIdx + 1) * yearsPerColumn)
  );

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 min-w-20 items-center justify-center rounded-md bg-white dark:bg-white/[0.04] text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-white/10 shadow-sm pl-3 pr-2 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition-colors focus:outline-none cursor-pointer"
        style={{ boxShadow: "none", border: "none" }}
        type="button"
      >
        <span className="text-sm flex-1 text-center">{selectedYear}</span>
        <span
          className={`transition-transform ml-2 flex items-center ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      <Overlay
        isOpen={isOpen}
        widthClass="min-w-60"
        anchorRef={containerRef}
      >
        <div className="flex gap-2 p-2">
          {yearColumns.map((col, colIdx) => (
            <div key={colIdx} className="flex flex-col">
              {col.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    onChange(year);
                    setIsOpen(false);
                  }}
                  className={`px-2 h-7 rounded-md text-sm tabular-nums text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer ${
                    year === selectedYear
                      ? "bg-gray-200 dark:bg-gray-700 font-bold"
                      : ""
                  }`}
                  type="button"
                >
                  {year}
                </button>
              ))}
            </div>
          ))}
        </div>
      </Overlay>
    </div>
  );
};
