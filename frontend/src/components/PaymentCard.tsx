// src/components/PaymentCard.tsx (фрагмент)
import React from "react";
import PaymentIconDisplay from "./PaymentIconDisplay"; // !!! Импорт компонента отображения иконки

import { ArrowPathIcon } from "@heroicons/react/24/outline"; // Recurrence icon
import { getPaymentColorClass } from "../utils/paymentColors";
import { BuiltinIcon } from "../utils/builtinIcons"; // Import BuiltinIcon type

interface PaymentCardProps {
  payment: {
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    status: "upcoming" | "overdue" | "completed" | "deleted";
    seriesId?: string | null; // Link to RecurringSeries
    series?: {
      // Include series data for checking isActive
      id: string;
      isActive: boolean;
    } | null;
    // !!! Icon fields
    iconType?: "builtin" | "custom" | null;
    builtinIconName?: BuiltinIcon | null; // Use BuiltinIcon type
    iconPath?: string | null;
    // Add other fields as needed (category, file)
    // filePath?: string | null; // Added field for file path
    // fileName?: string | null; // Added field for file name
  };
  onClick?: () => void;
  colorClass?: string; // Add colorClass prop
}

const PaymentCard: React.FC<PaymentCardProps> = ({ payment, onClick }) => {
  const cardColorClass = getPaymentColorClass(payment);
  const formattedDueDate = new Date(payment.dueDate).toLocaleDateString();
  const formattedAmount = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(payment.amount);

  // Check if the payment is part of an ACTIVE recurring series
  const isEffectivelyRecurring =
    payment.seriesId !== null && payment.series?.isActive !== false; // Считаем активным, если series.isActive не false (true или undefined)

  return (
    <div
      className={`flex-none w-64 h-40 rounded-xl shadow-lg p-4 m-2 cursor-pointer
             flex flex-col justify-between transition-all duration-200
             ${cardColorClass} hover:opacity-90`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-shrink-0">
          <PaymentIconDisplay
            payment={payment}
            sizeClass="h-8 w-8"
            colorClass={"text-white/60"}
          />
        </div>
        <div className="flex-1 ml-3">
          <div className="text-base font-semibold" title={payment.title}>
            {payment.title}
          </div>
          <div className="text-xs mt-1">
            {isEffectivelyRecurring ? (
              <div className="flex items-center text-white/60">
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Повторяющийся
              </div>
            ) : payment.seriesId && !payment.series?.isActive ? ( // Если серия есть, но неактивна
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
      <div className="text-right">
        <div className="text-xl font-bold">{formattedAmount}</div>
        <div className="text-xs mt-1 opacity-80">Срок: {formattedDueDate}</div>
      </div>
    </div>
  );
};

export default PaymentCard;
