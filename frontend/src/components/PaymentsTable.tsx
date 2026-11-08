import { useLanguage } from "../context/LanguageContext";
import React from "react";
import Table, { TableColumn } from "./Table";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { PaymentData } from "../types/paymentData";
import { getPaymentColorClass } from "../utils/paymentColors";
import { formatRecurrenceRule } from "../utils/formatRecurrence";
import { createDateDisplayFormatter, parseCalendarDate } from "../utils/dateUtils";
import { formatMoney } from "../utils/currencies";
import { ArrowPathIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { localizedCategoryName } from "../utils/categoryLabel";
import {
  PencilIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface PaymentsTableProps {
  data: PaymentData[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onComplete: (payment: PaymentData) => void;
  onDelete: (payment: PaymentData) => void;
  onDownloadFile: (id: string, fileName: string) => void;
  emptyMessage?: string;
}

const PaymentsTable: React.FC<PaymentsTableProps> = ({
  data,
  isLoading,
  onEdit,
  onComplete,
  onDelete,
  onDownloadFile,
  emptyMessage = "Нет платежей",
}) => {
  const { t, locale, language } = useLanguage();
  const formatDate = createDateDisplayFormatter(locale);
  const thBaseClassName =
    "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";

  const columns: TableColumn<PaymentData>[] = [
    {
      id: "icon",
      header: t("Иконка"),
      thClassName: `${thBaseClassName} w-20`,
      cell: (payment) => (
        <PaymentIconDisplay payment={payment} sizeClass="h-6 w-6" />
      ),
    },
    {
      id: "status",
      header: t("Статус"),
      thClassName: `${thBaseClassName} w-40`,
      cell: (payment) => (
        <div className="text-sm text-gray-900 dark:text-gray-100">
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${getPaymentColorClass(
              payment
            )}`}
          ></span>
          {payment.status === "upcoming" && t("Предстоящий")}
          {payment.status === "overdue" && t("Просрочен")}
          {payment.status === "completed" && t("Выполнен")}
          {payment.status === "deleted" && t("Удален")}
        </div>
      ),
    },
    {
      id: "title",
      header: t("Название"),
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs",
      cell: (payment) => <>{payment.title}</>,
    },
    {
      id: "recurrence",
      header: t("Повторение"),
      thClassName: `${thBaseClassName} w-48`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {payment.seriesId && payment.series?.isActive ? (
            <span className="flex items-center">
              <ArrowPathIcon className="h-4 w-4 mr-1 text-blue-500" />
              {t(formatRecurrenceRule(payment.series?.recurrenceRule))}
              {payment.series.recurrenceEndDate &&
                t(
                  " до {1}",
                  formatDate(parseCalendarDate(payment.series.recurrenceEndDate))
                )}
            </span>
          ) : payment.seriesId && !payment.series?.isActive ? (
            <span className="flex items-center text-gray-400 italic">
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              {t("Шаблон неактивен")}
            </span>
          ) : (
            t("Разовый")
          )}
        </>
      ),
    },
    {
      id: "amount",
      header: t("Сумма"),
      thClassName: `${thBaseClassName} w-32`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {formatMoney(payment.amount, locale, payment.currency)}
        </>
      ),
    },
    {
      id: "dueDate",
      header: t("Срок оплаты"),
      thClassName: `${thBaseClassName} w-36`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>{formatDate(parseCalendarDate(payment.dueDate))}</>
      ),
    },
    {
      id: "category",
      header: t("Категория"),
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 truncate",
      cell: (payment) => (
        <>
          {payment.transactionCategory
            ? localizedCategoryName(payment.transactionCategory, language)
            : "-"}
        </>
      ),
    },
    {
      id: "file",
      header: t("Файл"),
      thClassName: `${thBaseClassName} w-16`,
      tdClassName:
        "px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300",
      cell: (payment) => (
        <>
          {payment.filePath && payment.fileName ? (
            <button
              onClick={() => onDownloadFile(payment.id, payment.fileName!)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600 disabled:opacity-50 cursor-pointer"
              title={payment.fileName}
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
      emptyMessage={t(emptyMessage)}
      rowActions={(payment) => {
        const options: {
          label: string;
          onClick: () => void;
          icon?: React.ReactNode;
        }[] = [];
        if (payment.status !== "deleted") {
          options.push({
            label: t("Редактировать"),
            onClick: () => onEdit(payment.id),
            icon: <PencilIcon className="h-4 w-4" />,
          });
        }
        if (payment.status === "upcoming" || payment.status === "overdue") {
          options.push(
            {
              label: t("Выполнить"),
              onClick: () => onComplete(payment),
              icon: <CheckCircleIcon className="h-4 w-4" />,
            },
            {
              label: t("Удалить"),
              onClick: () => onDelete(payment),
              icon: <TrashIcon className="h-4 w-4" />,
            }
          );
        }
        return options;
      }}
    />
  );
};

export default PaymentsTable;
