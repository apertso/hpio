import { useLanguage } from "../context/LanguageContext";
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
import { parseCalendarDate, formatDateForDisplay } from "../utils/dateUtils";
import { formatMoney } from "../utils/currencies";
import { localizedCategoryName } from "../utils/categoryLabel";

type PaymentListCardContext = "home" | "payments" | "archive";

export interface PaymentListCardProps {
  payment: PaymentData;
  context?: PaymentListCardContext;
  onDownloadFile?: (id: string, fileName: string) => void;
  className?: string;
  hideDate?: boolean;
  formatDate?: (date: Date) => string;
}

const isToday = (date: Date): boolean => {
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
  formatDate,
}) => {
  const { t, locale, language } = useLanguage();
  const amount = formatMoney(payment.amount, locale, payment.currency);

  const isHome = context === "home";
  const dueDate = parseCalendarDate(payment.dueDate);

  const showRecurring =
    !!payment.seriesId && (payment.series?.isActive ?? true);

  const showTodayBadge =
    payment.status === "upcoming" && isToday(dueDate);
  const showUpcomingBadge =
    payment.status === "upcoming" && !showTodayBadge && !isHome;
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
      ? new Date(payment.completedAt || payment.updatedAt)
      : dueDate;

  return (
    <div
      data-mobile-list-item-id={payment.id}
      className={`card-base card-hover w-full text-left flex flex-col p-3.5 cursor-pointer space-y-2.5 group ${
        className || ""
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400">
            <PaymentIconDisplay payment={payment} sizeClass="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-gray-900 dark:text-gray-50 leading-snug line-clamp-2 break-words"
              title={payment.title}
            >
              {payment.title}
            </p>
            {payment.transactionCategory?.name && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {localizedCategoryName(payment.transactionCategory, language)}
              </p>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="block text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-50">
            {amount}
          </span>
          {!hideDate && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDate
                ? formatDate(displayDate)
                : formatDateForDisplay(displayDate, locale)}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showRecurring && payment.series?.recurrenceRule && (
            <span
              className="inline-flex items-center text-xs text-gray-500 dark:text-gray-400"
              title={t("Повторяющийся платеж")}
            >
              <ArrowPathIcon className="size-3 mr-1" />
              {t(formatRecurrenceRule(payment.series.recurrenceRule))}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showUpcomingBadge && (
            <span className="badge border border-[var(--ui-border)] text-gray-600 dark:text-gray-400">
              <ClockIcon className="size-3 mr-1 text-gray-400" />
              {t("Предстоящий")}
            </span>
          )}
          {showTodayBadge && (
            <span className="badge border border-[var(--ui-border)] text-gray-600 dark:text-gray-400">
              <CalendarDaysIcon className="size-3 mr-1 text-green-600 dark:text-green-400" />
              {t("Сегодня")}
            </span>
          )}
          {showOverdueBadge && (
            <span className="badge border border-red-200 text-red-700 dark:border-red-500/25 dark:text-red-400">
              <ExclamationCircleIcon className="size-3 mr-1" />
              {t("Просрочен")}
            </span>
          )}
          {showCompletedBadge && (
            <span className="badge border border-[var(--ui-border)] text-gray-600 dark:text-gray-400">
              <CheckCircleIcon className="size-3 mr-1 text-green-600 dark:text-green-400" />
              {t("Выполнен")}
            </span>
          )}
          {showDeletedBadge && (
            <span className="badge border border-[var(--ui-border)] text-gray-600 dark:text-gray-400">
              <TrashIcon className="size-3 mr-1 text-gray-400" />
              {t("Удален")}
            </span>
          )}

          {payment.isVirtual && (
            <span
              className="text-indigo-500 dark:text-indigo-400"
              title={t("Виртуальный платеж")}
            >
              <SparklesIcon className="size-3.5" />
            </span>
          )}

          {payment.filePath && payment.fileName && (
            <button
              type="button"
              onClick={handleFileClick}
              title={payment.fileName}
              className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <PaperClipIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentListCard;
