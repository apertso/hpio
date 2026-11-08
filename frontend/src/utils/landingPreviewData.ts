import type { Language } from "../i18n/translate";
import { formatDateToLocal } from "./dateUtils";

type LandingPreviewCurrency = "RUB" | "USD";

const upcomingPayments = [
  { id: "landing-internet", title: "Домашний интернет", days: 4, amounts: { RUB: 790, USD: 65 }, builtinIconName: "wifi" },
  { id: "landing-utilities", title: "Коммунальные услуги", days: 8, amounts: { RUB: 4190, USD: 148.72 }, builtinIconName: "home" },
  { id: "landing-mobile", title: "Мобильная связь", days: 9, amounts: { RUB: 630, USD: 39 }, builtinIconName: "mobile" },
  { id: "landing-music", title: "Музыка", days: 10, amounts: { RUB: 299, USD: 11.99 }, builtinIconName: "music" },
] as const;

type LandingUpcomingPayment = Omit<(typeof upcomingPayments)[number], "amounts"> & { amount: number };

export function getLandingPreviewCurrency(language: Language): LandingPreviewCurrency {
  return language === "en" ? "USD" : "RUB";
}

export function getLandingMoneyFormatter(locale: string, currency: LandingPreviewCurrency): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: currency === "USD" ? 2 : 0,
  });
}

export function getLandingUpcomingPreview(currency: LandingPreviewCurrency): {
  payments: LandingUpcomingPayment[];
  total: number;
} {
  const payments = upcomingPayments.map(({ amounts, ...payment }) => ({ ...payment, amount: amounts[currency] }));
  return { payments, total: payments.reduce((sum, payment) => sum + payment.amount, 0) };
}

const spendingActivity = [
  { name: "Продукты", entries: [[-29, 1840, 54.82], [-19, 2675, 71.43], [-12, 2340, 63.08], [-4, 1560, 42.16]] },
  { name: "ЖКХ", entries: [[-22, 4190, 148.72]] },
  { name: "Услуги", entries: [[-26, 790, 65], [-16, 1290, 39], [-8, 912, 26.5]] },
  { name: "Прочее", entries: [[0, 1645, 47.95]] },
] as const;

export const landingSpendingColors = {
  dark: ["#A5B4FC", "#93C5FD", "#818CF8", "#94A3B8"],
  light: ["#4F46E5", "#2563EB", "#4338CA", "#64748B"],
};

export function landingPreviewDate(offset: number, today = new Date()): Date {
  const date = new Date(today);
  date.setDate(date.getDate() + offset);
  date.setHours(12, 0, 0, 0);
  return date;
}

interface LandingSpendingPreview {
  categories: { name: string; amount: number }[];
  amounts: number[];
  dates: Date[];
  rawDates: string[];
  total: number;
}

export function getLandingSpendingPreview(currency: LandingPreviewCurrency, today = new Date()): LandingSpendingPreview {
  const activity = spendingActivity.map(({ name, entries }) => ({
    name,
    points: entries.map(([day, rubles, dollars]) => ({ day, amount: currency === "USD" ? dollars : rubles })),
  }));
  const categories = activity.map(({ name, points }) => ({
    name,
    amount: points.reduce((sum, { amount }) => sum + amount, 0),
  }));
  const points = activity
    .flatMap(({ points }) => points)
    .sort((first, second) => first.day - second.day);
  const dates = points.map(({ day }) => landingPreviewDate(day, today));

  return {
    categories,
    amounts: points.map(({ amount }) => amount),
    dates,
    rawDates: dates.map((date) => `${formatDateToLocal(date)}T12:00:00`),
    total: categories.reduce((sum, category) => sum + category.amount, 0),
  };
}
