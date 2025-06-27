import React from "react";
import {
  ArrowPathIcon,
  LightBulbIcon,
  ExclamationCircleIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";
import {
  TrashIcon,
  CheckCircleIcon,
  PencilIcon,
} from "@heroicons/react/24/solid";

import PaymentIconDisplay from "./PaymentIconDisplay";
import { BuiltinIcon } from "../utils/builtinIcons";

interface PaymentCardProps {
  payment: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    status: "upcoming" | "overdue" | "completed" | "deleted";
    seriesId?: string | null;
    series?: { id: string; isActive: boolean } | null;
    iconType?: "builtin" | "custom" | null;
    builtinIconName?: BuiltinIcon | null;
    iconPath?: string | null;
  };
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  payment,
  onEdit,
  onComplete,
  onDelete,
}) => {
  const formattedDueDate = new Date(payment.dueDate).toLocaleDateString();
  const formattedAmount = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(payment.amount);

  const isEffectivelyRecurring =
    payment.seriesId !== null && payment.series?.isActive !== false;

  // Helper function to check if a date is today
  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div
      className="bg-gray-800 rounded-2xl p-5 duration-300 shadow-lg hover:shadow-2xl flex flex-col justify-between h-44 w-72"
      style={{ fontFamily: "Roboto, sans-serif" }}
    >
      {/* Header: Icon, Title, Status Badge, Menu */}
      <div className="flex justify-between items-start mb-3 relative">
        <div className="flex items-center">
          <PaymentIconDisplay
            payment={payment}
            sizeClass="h-7 w-7 mr-3"
            colorClass="text-white/80"
          />
          <h2 className="text-lg font-medium truncate" title={payment.title}>
            {payment.title}
          </h2>
        </div>
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {payment.status === "upcoming" && isToday(payment.dueDate) && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <LightBulbIcon className="h-4 w-4 mr-1 text-yellow-600" />
              Сегодня
            </span>
          )}
          {payment.status === "overdue" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <ExclamationCircleIcon className="h-4 w-4 mr-1 text-red-600" />
              Просрочен
            </span>
          )}
          {payment.status === "completed" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="h-4 w-4 mr-1 text-green-600" />
              Выполнен
            </span>
          )}
          {payment.status === "deleted" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              <TrashIcon className="h-4 w-4 mr-1 text-gray-500" />
              Удалён
            </span>
          )}
          {/* 3-dots menu button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Действия"
            >
              <EllipsisVerticalIcon className="h-6 w-6" />
            </button>
            {menuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 mt-2 z-20 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-200 dark:border-gray-700 animate-fade-in"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <PencilIcon className="h-5 w-5" /> Редактировать
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onComplete();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" /> Выполнить
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <TrashIcon className="h-5 w-5" /> Удалить
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recurring Label */}
      <div className="flex items-center text-sm text-muted mb-4 text-gray-400">
        {isEffectivelyRecurring ? (
          <>
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span>Повторяющийся</span>
          </>
        ) : payment.seriesId && !payment.series?.isActive ? (
          <>
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span>Шаблон неактивен</span>
          </>
        ) : (
          <span>Разовый</span>
        )}
      </div>

      {/* Amount, Due Date, Actions */}
      <div className="flex items-end justify-between mt-auto">
        <div>
          <p className="text-3xl font-bold mb-1">{formattedAmount}</p>
          <p className="text-sm text-gray-400 mb-0">Срок: {formattedDueDate}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
