/**
 * Проверяет, содержит ли строка даты информацию о времени
 */
export const isHourlyDateString = (dateString: string): boolean => {
  return dateString.includes(" ");
};

/**
 * Форматирует дату в локальном часовом поясе (YYYY-MM-DD)
 */
export const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Форматирует дату и час (YYYY-MM-DD HH:00)
 */
export const formatDateHour = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:00`;
};

/**
 * Получает ключ часа для платежа на основе его статуса и данных
 * Используется для группировки платежей по часам в графиках
 */
export const getPaymentHourKey = (payment: any): string => {
  if (payment.status === "completed" && payment.completedAt) {
    return formatDateHour(new Date(payment.completedAt));
  } else {
    // Для предстоящих платежей, по умолчанию полдень
    return `${payment.dueDate} 12:00`;
  }
};

/**
 * Проверяет, относится ли платеж к конкретному ключу даты/часа
 * Обрабатывает как ежедневные, так и ежечасные форматы данных
 */
export const paymentMatchesDateKey = (
  payment: any,
  dateKey: string
): boolean => {
  const isHourlyKey = isHourlyDateString(dateKey);

  if (payment.status === "completed" && payment.completedAt) {
    // Для выполненных платежей используем время выполнения
    const completedDate = new Date(payment.completedAt);
    if (isHourlyKey) {
      return formatDateHour(completedDate) === dateKey;
    } else {
      return completedDate.toISOString().split("T")[0] === dateKey;
    }
  } else {
    // Для предстоящих/просроченных платежей используем дату срока
    if (isHourlyKey) {
      return getPaymentHourKey(payment) === dateKey;
    } else {
      return payment.dueDate === dateKey;
    }
  }
};

export const normalizeNotificationTimestamp = (
  timestamp?: number | null
): string | null => {
  if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
    return null;
  }

  const normalized =
    timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};
