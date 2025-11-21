import React from "react";
import {
  ArrowPathIcon,
  EllipsisVerticalIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import {
  TrashIcon,
  CheckCircleIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";
import { useDropdown } from "../hooks/useDropdown";
import Overlay from "./Overlay";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { formatRecurrenceRule } from "../utils/formatRecurrence";

interface PaymentCardProps {
  payment: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    status: "upcoming" | "overdue" | "completed" | "deleted";
    seriesId?: string | null;
    series?: { id: string; isActive: boolean; recurrenceRule?: string } | null;
    isVirtual?: boolean;
  };
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
  hideDate?: boolean;
}

// Helper to check if a date is today
function isToday(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  payment,
  onEdit,
  onComplete,
  onDelete,
  hideDate,
}) => {
  const formattedDueDate = new Date(payment.dueDate).toLocaleDateString(
    "ru-RU",
    { day: "2-digit", month: "2-digit", year: "numeric" }
  );
  const formattedAmount = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(payment.amount);

  const isEffectivelyRecurring =
    payment.seriesId !== null && payment.series?.isActive !== false;

  const {
    isOpen: isMenuOpen,
    setIsOpen: setMenuOpen,
    containerRef: menuRef,
  } = useDropdown();

  // Стили из класса subtle-card
  const cardClasses = "card-base card-hover p-5 flex flex-col justify-between";

  return (
    <div className={`${cardClasses} text-gray-900 dark:text-gray-100 h-40`}>
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start gap-2 mb-1">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-indigo-400 flex-shrink-0 mt-0.5">
              <PaymentIconDisplay payment={payment} sizeClass="h-6 w-6" />
            </div>
            <h3
              className="text-base font-medium leading-snug line-clamp-2 break-words"
              title={payment.title}
            >
              {payment.title}
            </h3>
          </div>
          {!payment.isVirtual && (
            <div className="relative flex-shrink-0 -mr-2 -mt-1" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!isMenuOpen);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
              >
                <EllipsisVerticalIcon className="h-5 w-5" />
              </button>
              <Overlay
                isOpen={isMenuOpen}
                widthClass="w-48"
                anchorRef={menuRef}
              >
                <div className="py-1">
                  <button
                    onClick={() => {
                      onEdit();
                      setMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    <PencilIcon className="w-4 h-4 mr-2" /> Редактировать
                  </button>
                  <button
                    onClick={() => {
                      onComplete();
                      setMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-2" /> Выполнить
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4 mr-2" /> Удалить
                  </button>
                </div>
              </Overlay>
            </div>
          )}
        </div>

        {/* Recurring and virtual status */}
        {(isEffectivelyRecurring || payment.isVirtual) && (
          <div className="mt-auto pt-1">
            <p className="text-xs text-[#3F51B5] dark:text-indigo-400 flex items-center font-normal">
              {isEffectivelyRecurring && (
                <>
                  <ArrowPathIcon className="h-3 w-3 mr-1 flex-shrink-0" />{" "}
                  <span className="truncate">
                    {formatRecurrenceRule(payment.series?.recurrenceRule)}
                  </span>
                </>
              )}
              {isEffectivelyRecurring && payment.isVirtual && (
                <span className="mx-1">•</span>
              )}
              {payment.isVirtual && "Виртуальный"}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2">
        <div className="flex items-end justify-between">
          <p className="text-xl font-bold leading-none">
            {formattedAmount}{" "}
            <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
              ₽
            </span>
          </p>
          <div className="flex items-center gap-2">
            {payment.status === "overdue" ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <ExclamationCircleIcon className="h-3.5 w-3.5 mr-1" />
                Просрочен
              </span>
            ) : !hideDate ? (
              payment.status === "upcoming" && isToday(payment.dueDate) ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CalendarDaysIcon className="h-3.5 w-3.5 mr-1" />
                  Сегодня
                </span>
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-500">
                  {formattedDueDate}
                </p>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
