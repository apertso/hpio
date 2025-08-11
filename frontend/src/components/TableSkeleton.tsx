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
              className="px-6 py-4 whitespace-nowrap"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default TableSkeleton;
