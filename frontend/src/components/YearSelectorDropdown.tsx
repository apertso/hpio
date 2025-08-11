import React from "react";
import { useDropdown } from "../hooks/useDropdown";
import DropdownOverlay from "./DropdownOverlay";

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
        className="flex h-9 min-w-20 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#111316] text-gray-800 dark:text-white border border-gray-300 dark:border-transparent pl-4 pr-3 focus:outline-none cursor-pointer"
        style={{ boxShadow: "none", border: "none" }}
        type="button"
      >
        <span className="text-sm flex-1 text-center">{selectedYear}</span>
        <span
          className={`transition-transform ml-2 flex items-center ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
            <path
              d="M6 8l4 4 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <DropdownOverlay
        isOpen={isOpen}
        align="left"
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
                  className={`px-2 py-1 rounded text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
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
      </DropdownOverlay>
    </div>
  );
};
