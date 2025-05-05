// src/utils/paymentColors.ts

// Утилита для определения класса цвета платежа на основе статуса и даты
export function getPaymentColorClass(payment: {
  status: string;
  dueDate: string;
  isRecurrent?: boolean;
}): string {
  if (payment.status === "overdue") return "bg-[#f02626] text-white"; // ярко-красный
  if (payment.status === "completed") return "bg-gray-700 text-gray-300"; // более тёмный серый
  if (payment.status === "deleted") return "bg-gray-800 text-gray-400";

  const now = new Date();
  const dueDateTime = new Date(payment.dueDate);
  now.setHours(0, 0, 0, 0);
  dueDateTime.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil(
    (dueDateTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft <= 1) return "bg-green-700 text-white"; // Срочно
  if (daysLeft <= 3) return "bg-green-600 text-white"; // Скоро
  if (daysLeft <= 7) return "bg-green-500 text-white"; // На горизонте
  return "bg-gray-600 text-gray-200"; // Спокойный цвет
}
