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
import { getUpcomingBadgeClasses } from "../utils/paymentColors";
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
      className={
        "w-full text-left flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow space-y-3 cursor-pointer " +
        (className || "")
      }
    >
      <div className="mb-1 relative">
        <p className="font-medium text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis">
          <span className="inline-flex align-middle flex-shrink-0 mr-2">
            <PaymentIconDisplay payment={payment} sizeClass="h-6 w-6" />
          </span>
          <span
            className="float-right font-bold text-lg text-gray-900 dark:text-gray-100 ml-2"
            style={{
              lineHeight: "21px",
            }}
          >
            {amount}
            <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              ₽
            </span>
          </span>
          {payment.title}
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2 flex-wrap">
          {payment.category?.name && (
            <p className="text-gray-600 dark:text-gray-400">
              {payment.category.name}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center text-xs gap-2 flex-wrap">
          {!hideDate && <p>{displayDate}</p>}
          {showRecurring && payment.series?.recurrenceRule && (
            <span className="inline-flex items-center">
              <ArrowPathIcon className="h-6 w-3.5 mr-1" />
              {formatRecurrenceRule(payment.series.recurrenceRule)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showUpcomingBadge &&
            (() => {
              const { badgeClass, iconClass } = getUpcomingBadgeClasses(
                payment.dueDate
              );
              return (
                <span
                  className={`inline-flex items-center px-2 py-1 h-6 rounded-full text-xs font-medium ${badgeClass}`}
                >
                  <ClockIcon className={`h-3.5 w-3.5 mr-1 ${iconClass}`} />
                  Предстоящий
                </span>
              );
            })()}
          {showTodayBadge && (
            <span className="inline-flex items-center px-2 py-1 h-6 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CalendarDaysIcon className="h-3.5 w-3.5 mr-1 text-green-600" />
              Сегодня
            </span>
          )}
          {showOverdueBadge && (
            <span className="inline-flex items-center px-2 py-1 h-6 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1 text-red-600" />
              Просрочен
            </span>
          )}
          {showCompletedBadge && (
            <span className="inline-flex items-center px-2 py-1 h-6 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="h-3.5 w-3.5 mr-1 text-green-600" />
              Выполнен
            </span>
          )}
          {showDeletedBadge && (
            <span className="inline-flex items-center px-2 py-1 h-6 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <TrashIcon className="h-3.5 w-3.5 mr-1 text-red-600" />
              Удален
            </span>
          )}
          {payment.isVirtual && (
            <button
              type="button"
              title="Платеж виртуальный, его нельзя редактировать или удалять, он будет создан, как только предыдущий платеж из серии не будет предстоящим"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500"
            >
              <SparklesIcon className="h-6 w-6" />
            </button>
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
                <PaperClipIcon className="h-6 w-4" />
              </button>
            ) : (
              <PaperClipIcon className="h-6 w-4" />
            ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentListCard;
