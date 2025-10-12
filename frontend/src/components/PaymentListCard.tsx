import React from "react";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { PaymentData } from "../types/paymentData";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon,
  PaperClipIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon, TrashIcon } from "@heroicons/react/24/solid";
import { getUpcomingBadgeClasses } from "../utils/paymentColors";
import { formatRecurrenceRule } from "../utils/formatRecurrence";

type PaymentListCardContext = "home" | "payments" | "archive";

export interface PaymentListCardProps {
  payment: PaymentData;
  context?: PaymentListCardContext;
  onClick?: () => void;
  onDownloadFile?: (id: string, fileName: string) => void;
  className?: string;
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
  onClick,
  onDownloadFile,
  className,
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

  return (
    <div
      onClick={onClick}
      className={
        "w-full text-left flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow space-y-3 cursor-pointer " +
        (className || "")
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <PaymentIconDisplay payment={payment} sizeClass="h-8 w-8" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {payment.title}
            </p>
            {payment.category?.name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {payment.category.name}
              </p>
            )}
            {payment.isVirtual && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mt-1">
                Виртуальный
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {amount}
            <span className="ml-1 text-base font-normal text-gray-500 dark:text-gray-400">
              ₽
            </span>
          </p>
        </div>
      </div>

      <div className="flex justify-between items-start text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="flex items-center self-center gap-3 flex-wrap">
          <p>Срок: {dueDateStr}</p>
          {showRecurring && payment.series?.recurrenceRule && (
            <span className="inline-flex items-center">
              <ArrowPathIcon className="h-4 w-4 mr-1 text-blue-500" />
              {formatRecurrenceRule(payment.series.recurrenceRule)}
            </span>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            {showUpcomingBadge &&
              (() => {
                const { badgeClass, iconClass } = getUpcomingBadgeClasses(
                  payment.dueDate
                );
                return (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                  >
                    <ClockIcon className={`h-4 w-4 mr-1 ${iconClass}`} />
                    Предстоящий
                  </span>
                );
              })()}
            {showTodayBadge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CalendarDaysIcon className="h-4 w-4 mr-1 text-green-600" />
                Сегодня
              </span>
            )}
            {showOverdueBadge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <ExclamationCircleIcon className="h-4 w-4 mr-1 text-red-600" />
                Просрочен
              </span>
            )}
            {showCompletedBadge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
                Выполнен
              </span>
            )}
            {showDeletedBadge && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <TrashIcon className="h-4 w-4 mr-1 text-red-600" />
                Удален
              </span>
            )}
            {payment.filePath &&
              payment.fileName &&
              (onDownloadFile ? (
                <button
                  type="button"
                  onClick={handleFileClick}
                  title={payment.fileName}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
              ) : (
                <PaperClipIcon className="h-5 w-5" />
              ))}
          </div>
          {(showCompletedBadge || showDeletedBadge) && (
            <p className="text-[0.7rem] text-left text-gray-500 dark:text-gray-400">
              {completedOrDeletedDateStr}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentListCard;
