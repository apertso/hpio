import React from "react";
import Overlay from "./Overlay";
import { useDropdown } from "../hooks/useDropdown";
import { DropdownOption } from "./DropdownButton";
import TableSkeleton from "../components/TableSkeleton";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

export interface TableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  thClassName?: string;
  tdClassName?: string;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  getRowKey: (row: T) => string;
  rowActions?: (row: T) => DropdownOption[];
  emptyMessage?: string;
  isLoading?: boolean;
  skeletonRows?: number;
}

function RowActions({ options }: { options: DropdownOption[] }) {
  const { isOpen, setIsOpen, containerRef } = useDropdown();

  if (!options || options.length === 0) {
    return null;
  }
  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Открыть меню действий"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      <Overlay
        isOpen={isOpen}
        widthClass="w-56"
        anchorRef={containerRef}
      >
        <div className="max-h-60 overflow-y-auto">
          {options.map((option, idx) => (
            <button
              key={option.label + idx}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
              onClick={() => {
                option.onClick();
                setIsOpen(false);
              }}
              type="button"
            >
              {option.icon && <span>{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>
      </Overlay>
    </div>
  );
}

function Table<T>(props: TableProps<T>) {
  const {
    data,
    columns,
    getRowKey,
    rowActions,
    emptyMessage = "Список пуст",
    isLoading = false,
    skeletonRows = 6,
  } = props;

  const totalColumns = columns.length + (rowActions ? 1 : 0);

  return (
    <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
          {columns.map((col) => (
            <th
              key={col.id}
              scope="col"
              className={
                col.thClassName ||
                "px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
              }
            >
              {col.header}
            </th>
          ))}
          {rowActions && (
            <th scope="col" className="relative pr-6 py-4 w-8">
              <span className="sr-only">Действия</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {isLoading ? (
          <TableSkeleton columns={totalColumns} rows={skeletonRows} />
        ) : data.length === 0 ? (
          <tr>
            <td
              className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center"
              colSpan={totalColumns}
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row) => (
            <tr
              key={getRowKey(row)}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-100 group"
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={
                    col.tdClassName ||
                    "px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  }
                >
                  {col.cell(row)}
                </td>
              ))}
              {rowActions && (
                <td className="pr-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <RowActions options={rowActions(row)} />
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export default Table;
