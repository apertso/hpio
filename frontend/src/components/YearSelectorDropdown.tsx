import React, { useState, useRef, useEffect } from "react";

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Split years into 4 columns (vertical lists)
  const columns = 4;
  const yearsPerColumn = Math.ceil(years.length / columns);
  const yearColumns: number[][] = Array.from({ length: columns }, (_, colIdx) =>
    years.slice(colIdx * yearsPerColumn, (colIdx + 1) * yearsPerColumn)
  );

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        onClick={() => setOpen(!open)}
        className={
          "flex h-[35px] min-w-[80px] items-center justify-center rounded-xl bg-[#111316] text-white pl-4 pr-3 focus:outline-none transition-colors duration-150"
        }
        style={{ boxShadow: "none", border: "none" }}
        type="button"
      >
        <span className="text-sm flex-1 text-center">{selectedYear}</span>
        <span
          className={`transition-transform ml-2 flex items-center ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
            <path
              d="M6 8l4 4 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute mt-1 w-full min-w-[240px] rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 z-10 p-2 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {yearColumns.map((col, colIdx) => (
              <div key={colIdx} className="flex flex-col">
                {col.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      onChange(year);
                      setOpen(false);
                    }}
                    className={`px-2 py-1 rounded text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
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
        </div>
      )}
    </div>
  );
};
