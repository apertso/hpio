import type { PaymentData } from "../types/paymentData";
import { convertCurrency, groupCurrencyTotals, type CurrencyTotal } from "./currencies";

/** Подпись о курсах для пересчитанных сумм аналитики. */
export function ratesNoteKey(stats: { usedCurrentRatesFallback?: boolean }): string {
  return stats.usedCurrentRatesFallback
    ? "Оценка в {1}; где нет исторического курса, использован текущий"
    : "Оценка в {1} по курсу на дату операции";
}
import { parseCalendarDate, formatDateToLocal } from "./dateUtils";

// rateDate — дата курса пересчёта; null означает текущий курс.
export type AnalyticsPayment = PaymentData & { convertedAmount: number | null; rateDate?: string | null };

export interface DashboardStats {
  month: string;
  currency: string;
  usedCurrentRatesFallback: boolean;
  conversionUnavailable: boolean;
  missingCurrencies: string[];
  originalTotals: { completed: CurrencyTotal[]; upcoming: CurrencyTotal[]; income: CurrencyTotal[] };
  totalUpcomingAmount: string | null;
  totalCompletedAmount: string | null;
  totalIncomeAmount: string | null;
  categoriesDistribution: { id?: string; name: string; nameEn?: string | null; amount: number }[];
  incomeCategoriesDistribution: { id?: string; name: string; nameEn?: string | null; amount: number }[];
  dailyPaymentLoad: { date: string; amount: number }[];
  allPaymentsInMonth: AnalyticsPayment[];
}

/**
 * Итог выполненных платежей прошлого периода для сравнения. Берётся готовая сумма сервера,
 * уже пересчитанная по курсам на даты оплат; при другой валюте или без пересчёта сравнения нет.
 */
export function previousCompletedTotal(
  previous: Pick<DashboardStats, "currency" | "totalCompletedAmount" | "conversionUnavailable">,
  currency: string
): number | null {
  if (previous.conversionUnavailable || previous.totalCompletedAmount === null) return null;
  if (previous.currency.toUpperCase() !== currency.toUpperCase()) return null;
  const total = Number(previous.totalCompletedAmount);
  return Number.isFinite(total) ? total : null;
}

export function calculateStatsFromPayments(
  payments: PaymentData[], startDate: Date, endDate: Date, currency: string
): DashboardStats {
  const rangeEnd = new Date(endDate);
  rangeEnd.setHours(23, 59, 59, 999);
  const filtered = payments.filter((payment) => {
    const date = payment.status === "completed" && payment.completedAt
      ? new Date(payment.completedAt) : parseCalendarDate(payment.dueDate);
    return payment.status !== "deleted" && date >= startDate && date <= rangeEnd;
  }).map((payment) => ({
    ...payment,
    // В офлайне без курсов можно безопасно использовать только исходную валюту.
    convertedAmount: convertCurrency(Number(payment.amount), payment.currency, currency, {}),
  }));
  const missing = filtered.filter((p) => p.convertedAmount === null);
  const completed = filtered.filter((p) => p.status === "completed");
  const upcoming = filtered.filter((p) => p.status === "upcoming" || p.status === "overdue");
  const categories = new Map<string, DashboardStats["categoriesDistribution"][number]>();
  const daily = new Map<string, number>();
  for (const payment of filtered) {
    const category = payment.transactionCategory || { name: "Без категории" };
    const key = "id" in category ? category.id : "no-category";
    categories.set(key, { ...category, amount: (categories.get(key)?.amount || 0) + (payment.convertedAmount ?? 0) });
    const date = payment.status === "completed" && payment.completedAt
      ? formatDateToLocal(new Date(payment.completedAt)) : payment.dueDate;
    daily.set(date, (daily.get(date) || 0) + (payment.convertedAmount ?? 0));
  }
  const sum = (items: AnalyticsPayment[]): string | null => missing.length ? null :
    items.reduce((total, p) => total + (p.convertedAmount ?? 0), 0).toFixed(2);
  return {
    month: formatDateToLocal(startDate).slice(0, 7), currency, usedCurrentRatesFallback: false,
    conversionUnavailable: missing.length > 0,
    missingCurrencies: [...new Set(missing.map((p) => p.currency || "RUB"))],
    originalTotals: { completed: groupCurrencyTotals(completed), upcoming: groupCurrencyTotals(upcoming), income: [] },
    totalCompletedAmount: sum(completed), totalUpcomingAmount: sum(upcoming), totalIncomeAmount: null,
    categoriesDistribution: missing.length ? [] : [...categories.values()], incomeCategoriesDistribution: [],
    dailyPaymentLoad: missing.length ? [] : Array.from(daily, ([date, amount]) => ({ date, amount })),
    allPaymentsInMonth: filtered,
  };
}
