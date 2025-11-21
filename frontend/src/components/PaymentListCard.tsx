import React from "react";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { PaymentData } from "../types/paymentData";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
  PaperClipIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, TrashIcon } from "@heroicons/react/24/solid";
import { formatRecurrenceRule } from "../utils/formatRecurrence";

type PaymentListCardContext = "home" | "payments" | "archive";

export interface PaymentListCardProps {
  payment: PaymentData;
  context?: PaymentListCardContext;
  onDownloadFile?: (id: string, fileName: string) => void;
  className?: string;
  hideDate?: boolean;
}

const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const PaymentListCard: React.FC<PaymentListCardProps> = ({
  payment,
  context = "payments",
  onDownloadFile,
  className,
  hideDate = false,
}) => {
  const amount = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(payment.amount);

  const isHome = context === "home";
  const dueDateStr = new Date(payment.dueDate).toLocaleDateString("ru-RU");
  const completedOrDeletedDateStr = new Date(
    payment.completedAt || payment.updatedAt
  ).toLocaleDateString("ru-RU");

  const showRecurring =
    !!payment.seriesId && (payment.series?.isActive ?? true);

  const showTodayBadge =
    payment.status === "upcoming" && isToday(payment.dueDate);
  const showUpcomingBadge =
    payment.status === "upcoming" && !isToday(payment.dueDate) && !isHome;
  const showOverdueBadge = payment.status === "overdue";
  const showCompletedBadge = payment.status === "completed";
  const showDeletedBadge = payment.status === "deleted";

  const handleFileClick = (e: React.MouseEvent) => {
    if (!payment.filePath || !payment.fileName || !onDownloadFile) return;
    e.stopPropagation();
    onDownloadFile(payment.id, payment.fileName);
  };

  const displayDate =
    payment.status === "completed" || payment.status === "deleted"
      ? completedOrDeletedDateStr
      : dueDateStr;

  return (
    <div
      data-mobile-list-item-id={payment.id}
      className={`card-base card-hover w-full text-left flex flex-col p-4 cursor-pointer space-y-3 group ${
        className || ""
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1 flex-shrink-0 text-gray-500 dark:text-gray-400 group-hover:text-indigo-500 transition-colors duration-200">
            <PaymentIconDisplay payment={payment} sizeClass="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-medium text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 break-words"
              title={payment.title}
            >
              {payment.title}
            </p>
            {payment.category?.name && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                {payment.category.name}
              </p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="block font-semibold text-lg text-gray-900 dark:text-gray-100">
            {amount}
            <span className="ml-1 text-sm font-normal text-gray-600 dark:text-gray-400">
              ₽
            </span>
          </span>
          {!hideDate && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {displayDate}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          {showRecurring && payment.series?.recurrenceRule && (
            <span
              className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400"
              title="Повторяющийся платеж"
            >
              <ArrowPathIcon className="h-3.5 w-3.5 mr-1.5" />
              {formatRecurrenceRule(payment.series.recurrenceRule)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showUpcomingBadge && (
            <span className="badge bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
              <ClockIcon className="h-3 w-3 mr-1" />
              Предстоящий
            </span>
          )}
          {showTodayBadge && (
            <span className="badge bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800/30">
              <CalendarDaysIcon className="h-3 w-3 mr-1" />
              Сегодня
            </span>
          )}
          {showOverdueBadge && (
            <span className="badge bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30">
              <ExclamationCircleIcon className="h-3 w-3 mr-1" />
              Просрочен
            </span>
          )}
          {showCompletedBadge && (
            <span className="badge bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
              <CheckCircleIcon className="h-3 w-3 mr-1 text-green-500 dark:text-green-600/80" />
              Выполнен
            </span>
          )}
          {showDeletedBadge && (
            <span className="badge bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
              <TrashIcon className="h-3 w-3 mr-1 text-gray-400" />
              Удален
            </span>
          )}

          {payment.isVirtual && (
            <span
              className="text-blue-400 dark:text-blue-500/80"
              title="Виртуальный платеж"
            >
              <SparklesIcon className="h-4 w-4" />
            </span>
          )}

          {payment.filePath && payment.fileName && (
            <button
              type="button"
              onClick={handleFileClick}
              title={payment.fileName}
              className="text-gray-400 hover:text-indigo-500 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors"
            >
              <PaperClipIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentListCard;
