import React from "react";
import Table, { TableColumn } from "./Table";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { PaymentData } from "../types/paymentData";
import { getPaymentColorClass } from "../utils/paymentColors";
import { formatRecurrenceRule } from "../utils/formatRecurrence";
import { PaperClipIcon } from "@heroicons/react/24/outline";
import {
  PencilIcon,
  ArrowPathIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface ArchiveTableProps {
  data: PaymentData[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onRestore: (payment: PaymentData) => void;
  onPermanentDelete: (id: string) => void;
  onDownloadFile: (id: string, fileName: string) => void;
  emptyMessage?: string;
}

const ArchiveTable: React.FC<ArchiveTableProps> = ({
  data,
  isLoading,
  onEdit,
  onRestore,
  onPermanentDelete,
  onDownloadFile,
  emptyMessage = "Архив пуст",
}) => {
  const thBaseClassName =
    "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
  const columns: TableColumn<PaymentData>[] = [
    {
      id: "icon",
      header: "Иконка",
      thClassName: `${thBaseClassName} w-20`,
      cell: (payment) => (
        <PaymentIconDisplay payment={payment} sizeClass="h-6 w-6" />
      ),
    },
    {
      id: "status",
      header: "Статус",
      thClassName: `${thBaseClassName} w-28`,
      cell: (payment) => (
        <div className="text-sm text-gray-900 dark:text-gray-100">
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${getPaymentColorClass(
              payment
            )}`}
          ></span>
          {payment.status === "completed" && "Выполнен"}
          {payment.status === "deleted" && "Удален"}
        </div>
      ),
    },
    {
      id: "title",
      header: "Название",
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs",
      cell: (payment) => <>{payment.title}</>,
    },
    {
      id: "recurrence",
      header: "Повторение",
      thClassName: `${thBaseClassName} w-48`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {payment.seriesId && payment.series ? (
            <span className="flex items-center">
              <ArrowPathIcon className="h-4 w-4 mr-1 text-blue-500" />
              {formatRecurrenceRule(payment.series.recurrenceRule)}
              {payment.series.recurrenceEndDate &&
                ` до ${new Date(
                  payment.series.recurrenceEndDate
                ).toLocaleDateString("ru-RU")}`}
            </span>
          ) : (
            "Разовый"
          )}
        </>
      ),
    },
    {
      id: "amount",
      header: "Сумма",
      thClassName: `${thBaseClassName} w-32`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {new Intl.NumberFormat("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(payment.amount)}
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            ₽
          </span>
        </>
      ),
    },
    {
      id: "dueDate",
      header: "Срок оплаты",
      thClassName: `${thBaseClassName} w-36`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>{new Date(payment.dueDate).toLocaleDateString("ru-RU")}</>
      ),
    },
    {
      id: "completedOrDeleted",
      header: "Выполнен/Удален",
      thClassName: `${thBaseClassName} w-48`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {payment.completedAt
            ? new Date(payment.completedAt).toLocaleString("ru-RU")
            : new Date(payment.updatedAt).toLocaleString("ru-RU")}
        </>
      ),
    },
    {
      id: "category",
      header: "Категория",
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate",
      cell: (payment) => <>{payment.category ? payment.category.name : "-"}</>,
    },
    {
      id: "file",
      header: "Файл",
      thClassName: `${thBaseClassName} w-16`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {payment.filePath && payment.fileName ? (
            <button
              onClick={() => onDownloadFile(payment.id, payment.fileName!)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600 cursor-pointer"
              title={`Скачать ${payment.fileName}`}
            >
              <PaperClipIcon className="h-5 w-5 inline-block mr-1" />
            </button>
          ) : (
            "-"
          )}
        </>
      ),
    },
  ];

  return (
    <Table
      data={data}
      columns={columns}
      getRowKey={(p) => p.id}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      rowActions={(payment) => [
        {
          label: "Редактировать",
          onClick: () => onEdit(payment.id),
          icon: <PencilIcon className="h-4 w-4" />,
        },
        {
          label: "Восстановить",
          onClick: () => onRestore(payment),
          icon: <ArrowPathIcon className="h-4 w-4" />,
        },
        {
          label: "Удалить полностью",
          onClick: () => onPermanentDelete(payment.id),
          icon: <TrashIcon className="h-4 w-4" />,
        },
      ]}
    />
  );
};

export default ArchiveTable;
