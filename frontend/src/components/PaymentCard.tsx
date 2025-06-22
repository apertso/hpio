import React from "react";
import {
  ArrowPathIcon,
  PencilIcon,
  CheckCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import PaymentIconDisplay from "./PaymentIconDisplay";
import { getPaymentColorClass } from "../utils/paymentColors";
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
  const cardColorClass = getPaymentColorClass(payment);
  const formattedDueDate = new Date(payment.dueDate).toLocaleDateString();
  const formattedAmount = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(payment.amount);

  const isEffectivelyRecurring =
    payment.seriesId !== null && payment.series?.isActive !== false;

  return (
    <div
      className={`relative flex-none w-64 h-40 rounded-xl shadow-lg p-4 m-2 flex flex-col justify-between transition-all duration-200 ${cardColorClass} hover:opacity-90`}
    >
      {/* Верхняя часть: иконка и название */}
      <div className="flex items-start gap-3">
        <PaymentIconDisplay
          payment={payment}
          sizeClass="h-8 w-8"
          colorClass="text-white/60"
        />
        <div className="flex-1 overflow-hidden">
          <div
            className="text-base font-semibold truncate"
            title={payment.title}
          >
            {payment.title}
          </div>
          <div className="text-xs mt-1">
            {isEffectivelyRecurring ? (
              <div className="flex items-center text-white/60">
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Повторяющийся
              </div>
            ) : payment.seriesId && !payment.series?.isActive ? (
              <div className="flex items-center text-gray-300 italic">
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Шаблон неактивен
              </div>
            ) : (
              <div className="text-gray-300">Разовый</div>
            )}
          </div>
        </div>
      </div>

      {/* Нижняя часть: сумма, срок и иконки */}
      <div className="flex items-end justify-between mt-4">
        <div>
          <div className="text-xl font-bold">{formattedAmount}</div>
          <div className="text-xs opacity-80 mt-1">
            Срок: {formattedDueDate}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Редактировать"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className="text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Отметить как выполненный"
          >
            <CheckCircleIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Удалить"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCard;
