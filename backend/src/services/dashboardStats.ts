import { formatInTimeZone } from "date-fns-tz";
import { convertCurrency, ExchangeRates } from "./exchangeRateService";

interface Category {
  id?: string;
  name: string;
  nameEn?: string | null;
  builtinIconName?: string | null;
}

export interface StatsPayment {
  id: string;
  amount: number | string;
  currency?: string | null;
  status: string;
  dueDate: string;
  completedAt?: Date | string | null;
  transactionCategory?: Category | null;
}

interface StatsIncome {
  amount: number | string;
  currency: string;
  date?: string | null;
  transactionCategory?: Category | null;
}

interface CurrencyTotal {
  currency: string;
  amount: number;
}

/** Курсы для пересчёта: текущие и снимки на прошедшие даты. */
export interface DashboardRates {
  current: ExchangeRates | null;
  byDate: Map<string, ExchangeRates | null>;
}

export interface DashboardStatsOptions {
  startDate: string;
  endDate: string;
  timezone: string;
  currency: string;
  /** Сегодняшняя дата (YYYY-MM-DD) в таймзоне пользователя. */
  today: string;
  rates: DashboardRates;
}

export interface DashboardStats<T extends StatsPayment> {
  month: string;
  currency: string;
  /** Часть прошедших операций пересчитана по текущему курсу, потому что исторического нет. */
  usedCurrentRatesFallback: boolean;
  conversionUnavailable: boolean;
  missingCurrencies: string[];
  originalTotals: { completed: CurrencyTotal[]; upcoming: CurrencyTotal[]; income: CurrencyTotal[] };
  totalUpcomingAmount: string | null;
  totalCompletedAmount: string | null;
  totalIncomeAmount: string | null;
  categoriesDistribution: (Category & { amount: number })[];
  incomeCategoriesDistribution: (Category & { amount: number })[];
  dailyPaymentLoad: { date: string; amount: number }[];
  allPaymentsInMonth: (T & { convertedAmount: number | null; rateDate: string | null })[];
}

type RateSource = { status?: string; completedAt?: Date | string | null; date?: string | null };

/**
 * Дата курса для операции: выполненный платёж — день оплаты в таймзоне пользователя,
 * доход — его дата. Предстоящие, просроченные и сегодняшние операции считаются по текущему курсу (null).
 */
export function getRateDate(item: RateSource, timezone: string, today: string): string | null {
  let date: string | null = null;
  if (item.status === "completed" && item.completedAt) {
    date = formatInTimeZone(item.completedAt, timezone, "yyyy-MM-dd");
  } else if (item.status === undefined && item.date) {
    date = String(item.date).slice(0, 10);
  }
  return date && date < today ? date : null;
}

const groupAmounts = (items: { amount: number | string; currency?: string | null }[]): CurrencyTotal[] => {
  const totals = new Map<string, number>();
  for (const item of items) {
    const currency = item.currency?.trim().toUpperCase() || "RUB";
    totals.set(currency, (totals.get(currency) || 0) + Number(item.amount));
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount }));
};

export function calculateDashboardStats<T extends StatsPayment>(
  payments: T[],
  incomes: StatsIncome[],
  { startDate, endDate, timezone, currency, today, rates }: DashboardStatsOptions
): DashboardStats<T> {
  const missingCurrencies = new Set<string>();
  let usedCurrentRatesFallback = false;
  const convert = (
    item: { amount: number | string; currency?: string | null },
    rateDate: string | null
  ): number | null => {
    const source = item.currency?.trim().toUpperCase() || "RUB";
    const historical = rateDate ? rates.byDate.get(rateDate) ?? null : null;
    const applied = historical ?? rates.current ?? {};
    const result = convertCurrency(Number(item.amount), source, currency, applied);
    if (result === null) missingCurrencies.add(source);
    else if (rateDate && !historical && source !== currency.toUpperCase()) usedCurrentRatesFallback = true;
    return result;
  };
  const allPaymentsInMonth = payments.filter((p) => p.status !== "deleted").map((p) => {
    const rateDate = getRateDate(p, timezone, today);
    return { ...p, rateDate, convertedAmount: convert(p, rateDate) };
  });
  const convertedIncomes = incomes.map((income) => ({
    ...income, convertedAmount: convert(income, getRateDate({ date: income.date }, timezone, today)),
  }));
  const completed = allPaymentsInMonth.filter((p) => p.status === "completed");
  const upcoming = allPaymentsInMonth.filter((p) => p.status === "upcoming" || p.status === "overdue");
  const sum = (items: { convertedAmount: number | null }[]): string =>
    items.reduce((total, item) => total + (item.convertedAmount ?? 0), 0).toFixed(2);
  const categories = (items: { transactionCategory?: Category | null; convertedAmount: number | null }[]): (Category & { amount: number })[] => {
    const totals = new Map<string, Category & { amount: number }>();
    for (const item of items) {
      const category = item.transactionCategory || { name: "Без категории" };
      const key = category.id || "no-category";
      totals.set(key, {
        id: category.id, name: category.name, nameEn: category.nameEn,
        amount: (totals.get(key)?.amount || 0) + (item.convertedAmount ?? 0),
      });
    }
    return [...totals.values()].filter((category) => category.amount > 0);
  };
  const hourly = new Date(endDate).getTime() - new Date(startDate).getTime() < 2 * 86400000;
  const daily = new Map<string, number>();
  for (const payment of allPaymentsInMonth) {
    const date = payment.status === "completed" && payment.completedAt
      ? formatInTimeZone(payment.completedAt, timezone, hourly ? "yyyy-MM-dd HH:00" : "yyyy-MM-dd")
      : `${payment.dueDate}${hourly ? " 12:00" : ""}`;
    daily.set(date, (daily.get(date) || 0) + (payment.convertedAmount ?? 0));
  }
  // Неполные суммы не выдаём за полный итог; исходные валюты всегда доступны.
  const conversionUnavailable = missingCurrencies.size > 0;
  return {
    month: startDate.slice(0, 7),
    currency,
    usedCurrentRatesFallback: !conversionUnavailable && usedCurrentRatesFallback,
    conversionUnavailable,
    missingCurrencies: [...missingCurrencies],
    originalTotals: { completed: groupAmounts(completed), upcoming: groupAmounts(upcoming), income: groupAmounts(incomes) },
    totalUpcomingAmount: conversionUnavailable ? null : sum(upcoming),
    totalCompletedAmount: conversionUnavailable ? null : sum(completed),
    totalIncomeAmount: conversionUnavailable ? null : sum(convertedIncomes),
    categoriesDistribution: conversionUnavailable ? [] : categories(allPaymentsInMonth),
    incomeCategoriesDistribution: conversionUnavailable ? [] : categories(convertedIncomes),
    dailyPaymentLoad: conversionUnavailable ? [] : Array.from(daily, ([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)),
    allPaymentsInMonth,
  };
}
