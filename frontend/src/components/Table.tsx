import { useLanguage } from "../context/LanguageContext";
import React from "react";
import Overlay from "./Overlay";
import { useDropdown } from "../hooks/useDropdown";
import { DropdownOption } from "./DropdownButton";
import TableSkeleton from "../components/TableSkeleton";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

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

export function RowActions({ options }: { options: DropdownOption[] }) {
  const { t } = useLanguage();
  const { isOpen, setIsOpen, containerRef } = useDropdown();

  if (!options || options.length === 0) {
    return null;
  }
  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        className="flex size-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 cursor-pointer"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={t("Открыть меню действий")}
      >
        <EllipsisHorizontalIcon className="size-4" />
      </button>
      <Overlay
        isOpen={isOpen}
        widthClass="w-56"
        anchorRef={containerRef}
      >
        <div className="max-h-60 overflow-y-auto p-1">
          {options.map((option, idx) => (
            <button
              key={option.label + idx}
              className="w-full text-left px-2 h-8 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center gap-2 cursor-pointer [&_svg]:size-4 [&_svg]:text-gray-400"
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
  const { t } = useLanguage();
  const {
    data,
    columns,
    getRowKey,
    rowActions,
    emptyMessage = t("Список пуст"),
    isLoading = false,
    skeletonRows = 6,
  } = props;

  const totalColumns = columns.length + (rowActions ? 1 : 0);

  return (
    <table className="w-full table-fixed">
      <thead className="border-b border-[var(--ui-border)]">
        <tr>
          {columns.map((col) => (
            <th
              key={col.id}
              scope="col"
              className={
                col.thClassName ||
                "px-4 h-9 text-left text-xs font-medium text-gray-500 dark:text-gray-400"
              }
            >
              {col.header}
            </th>
          ))}
          {rowActions && (
            <th scope="col" className="relative pr-3 w-12">
              <span className="sr-only">{t("Действия")}</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--ui-border)]">
        {isLoading ? (
          <TableSkeleton columns={totalColumns} rows={skeletonRows} />
        ) : data.length === 0 ? (
          <tr>
            <td
              className="px-4 py-10 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center"
              colSpan={totalColumns}
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row) => (
            <tr
              key={getRowKey(row)}
              className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-100 group"
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={
                    col.tdClassName ||
                    "px-4 h-11 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                  }
                >
                  {col.cell(row)}
                </td>
              ))}
              {rowActions && (
                <td className="pr-3 whitespace-nowrap text-right text-sm font-medium">
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
