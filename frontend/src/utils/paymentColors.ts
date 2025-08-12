// src/utils/paymentColors.ts
import { BuiltinIcon } from "./builtinIcons";

// Утилита для определения класса цвета платежа на основе статуса и даты
export function getPaymentColorClass(payment: {
  status: string;
  dueDate: string;
  isRecurrent?: boolean;
}): string {
  if (payment.status === "overdue") return "bg-[#f02626] text-white"; // ярко-красный
  if (payment.status === "completed") return "bg-green-500 dark:bg-green-700";
  if (payment.status === "deleted") return "bg-red-500 dark:bg-red-600";

  const now = new Date();
  const dueDateTime = new Date(payment.dueDate);
  now.setHours(0, 0, 0, 0);
  dueDateTime.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil(
    (dueDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 1) return "bg-green-700 text-white"; // Срочно
  if (daysLeft <= 3) return "bg-green-600 text-white"; // Скоро
  if (daysLeft <= 7) return "bg-[#35605a] text-white"; // На горизонте
  return "bg-gray-500 dark:bg-gray-600"; // Спокойный цвет
}

// Классы для бейджа "Предстоящий" с той же логикой градаций зелёного
export function getUpcomingBadgeClasses(dueDate: string): {
  badgeClass: string;
  iconClass: string;
} {
  const now = new Date();
  const dueDateTime = new Date(dueDate);
  now.setHours(0, 0, 0, 0);
  dueDateTime.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil(
    (dueDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 1)
    return { badgeClass: "bg-green-700 text-white", iconClass: "text-white" };
  if (daysLeft <= 3)
    return { badgeClass: "bg-green-600 text-white", iconClass: "text-white" };
  if (daysLeft <= 7)
    return {
      badgeClass: "bg-[#35605a] text-white",
      iconClass: "text-white",
    };
  return {
    badgeClass: "bg-green-100 text-green-800",
    iconClass: "text-green-600",
  };
}

const iconColorMap: Record<BuiltinIcon, string> = {
  "credit-card": "#3b82f6", // blue-500
  home: "#f97316", // orange-500
  truck: "#ef4444", // red-500
  "shopping-cart": "#10b981", // emerald-500
  phone: "#06b6d4", // cyan-500
  wifi: "#0ea5e9", // sky-500
  heart: "#ec4899", // pink-500
  wrench: "#eab308", // yellow-500
  "book-open": "#7c3aed", // deep-violet
  film: "#8b5cf6", // violet-500
  gift: "#e11d48", // rose-600
  plane: "#14b8a6", // teal-500
  sparkles: "#84cc16", // lime-500
  bolt: "#a16207", // amber-700
  cloud: "#16a34a", // green-600
  fire: "#991b1b", // dark-red-800
};

export const getIconColorByName = (name: string): string => {
  if (name && name in iconColorMap) {
    return iconColorMap[name as BuiltinIcon];
  }
  return "#6b7280"; // gray-500 for fallback
};
