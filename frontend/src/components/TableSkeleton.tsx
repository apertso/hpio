import React from "react";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns, rows = 6 }) => {
  const rowArray = Array.from({ length: rows });
  const colArray = Array.from({ length: columns });
  return (
    <>
      {rowArray.map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`} className="animate-pulse">
          {colArray.map((__, cIdx) => (
            <td
              key={`skeleton-cell-${rIdx}-${cIdx}`}
              className="px-4 h-11 whitespace-nowrap"
            >
              <div className="h-3 bg-gray-100 dark:bg-white/[0.06] rounded-sm w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
