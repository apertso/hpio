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
  const cardClasses =
    "p-4 rounded-lg transition-shadow duration-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-white/10 flex flex-col justify-between";

  return (
    <div
      className={`${cardClasses} text-gray-900 dark:text-gray-100 h-40 py-4 px-4 rounded-xl`}
    >
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center mb-1">
            <div className="text-indigo-400 mr-1">
              <PaymentIconDisplay payment={payment} sizeClass="h-6 w-6" />
            </div>
            <h3 className="text-base font-medium">{payment.title}</h3>
          </div>
          {!payment.isVirtual && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!isMenuOpen);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 cursor-pointer"
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
          <p className="text-xs text-[#3F51B5] dark:text-indigo-400 mb-1 flex items-center font-normal">
            {isEffectivelyRecurring && (
              <>
                <ArrowPathIcon className="h-3 w-3 mr-1" />{" "}
                {formatRecurrenceRule(payment.series?.recurrenceRule)}
              </>
            )}
            {isEffectivelyRecurring && payment.isVirtual && " • "}
            {payment.isVirtual && "Виртуальный"}
          </p>
        )}
      </div>

      {/* Footer */}
      <div>
        <p className="text-xl font-bold my-1">
          {formattedAmount}{" "}
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            ₽
          </span>
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-600 dark:text-gray-500">
            Срок: {formattedDueDate}
          </p>
          <div className="flex items-center gap-2">
            {payment.status === "upcoming" && isToday(payment.dueDate) && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CalendarDaysIcon className="h-4 w-4 mr-1 text-green-600" />
                Сегодня
              </span>
            )}
            {payment.status === "overdue" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <ExclamationCircleIcon className="h-4 w-4 mr-1 text-red-600" />
                Просрочен
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
