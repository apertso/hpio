import type { Language } from "../i18n/translate";
import type { PaymentData } from "../types/paymentData";
import { formatDateToLocal } from "./dateUtils";

export type LandingPreviewCurrency = "RUB" | "USD";

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

/* Категории демо-панели на лендинге */
const dashboardCategories = {
  groceries: "Продукты",
  utilities: "ЖКХ",
  communications: "Связь",
  entertainment: "Развлечения",
  other: "Прочее",
} as const;

type DashboardCategory = keyof typeof dashboardCategories;

// Категории регулярных платежей из списка «Ближайшие платежи»
const upcomingCategories: Record<(typeof upcomingPayments)[number]["id"], DashboardCategory> = {
  "landing-internet": "communications",
  "landing-utilities": "utilities",
  "landing-mobile": "communications",
  "landing-music": "entertainment",
};

/*
 * Разовые траты текущего месяца. share — доля уже прошедших дней месяца,
 * поэтому траты всегда попадают в период «Месяц» и не уходят в будущее.
 */
const currentMonthSpending: { title: string; category: DashboardCategory; share: number; amounts: Record<LandingPreviewCurrency, number> }[] = [
  { title: "Продукты", category: "groceries", share: 0.05, amounts: { RUB: 1840, USD: 54.82 } },
  { title: "Такси", category: "other", share: 0.2, amounts: { RUB: 520, USD: 18.4 } },
  { title: "Продукты", category: "groceries", share: 0.35, amounts: { RUB: 2675, USD: 71.43 } },
  { title: "Билеты", category: "entertainment", share: 0.45, amounts: { RUB: 900, USD: 32 } },
  { title: "Продукты", category: "groceries", share: 0.6, amounts: { RUB: 2340, USD: 63.08 } },
  { title: "Такси", category: "other", share: 0.75, amounts: { RUB: 690, USD: 24.6 } },
  { title: "Продукты", category: "groceries", share: 0.9, amounts: { RUB: 1560, USD: 42.16 } },
];

// Разовые траты прошлого месяца (день месяца), чтобы было с чем сравнивать
const previousMonthSpending: { title: string; category: DashboardCategory; day: number; amounts: Record<LandingPreviewCurrency, number> }[] = [
  { title: "Продукты", category: "groceries", day: 3, amounts: { RUB: 2210, USD: 68.3 } },
  { title: "Продукты", category: "groceries", day: 11, amounts: { RUB: 2490, USD: 74.9 } },
  { title: "Такси", category: "other", day: 14, amounts: { RUB: 840, USD: 27.5 } },
  { title: "Продукты", category: "groceries", day: 19, amounts: { RUB: 1980, USD: 59.4 } },
  { title: "Продукты", category: "groceries", day: 26, amounts: { RUB: 2120, USD: 66.75 } },
];

// Дата внутри месяца со сдвигом monthOffset; день ограничен длиной месяца
function dateInMonth(today: Date, monthOffset: number, day: number): Date {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + monthOffset + 1, 0).getDate();
  return new Date(today.getFullYear(), today.getMonth() + monthOffset, Math.min(day, lastDay), 12);
}

export function getLandingDashboardPayments(
  currency: LandingPreviewCurrency,
  translate: (key: string) => string,
  today: Date,
): { upcoming: PaymentData[]; completed: PaymentData[] } {
  const timestamp = today.toISOString();
  const { payments } = getLandingUpcomingPreview(currency);
  const category = (key: DashboardCategory): PaymentData["transactionCategory"] => ({
    id: `demo-category-${key}`,
    name: dashboardCategories[key],
  });
  const completedPayment = (id: string, title: string, key: DashboardCategory, amount: number, date: Date): PaymentData => ({
    id,
    title: translate(title),
    amount,
    currency,
    dueDate: formatDateToLocal(date),
    completedAt: date.toISOString(),
    status: "completed",
    remind: false,
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
    transactionCategory: category(key),
  });

  const elapsedDays = today.getDate() - 1;
  const currentMonth = currentMonthSpending.map(({ title, category: key, share, amounts }, index) =>
    completedPayment(`demo-current-${index}`, title, key, amounts[currency], dateInMonth(today, 0, 1 + Math.floor(share * elapsedDays))),
  );
  const previousMonth = previousMonthSpending.map(({ title, category: key, day, amounts }, index) =>
    completedPayment(`demo-previous-${index}`, title, key, amounts[currency], dateInMonth(today, -1, day)),
  );

  const upcoming: PaymentData[] = payments.map(({ id, title, amount, days, builtinIconName }) => ({
    id, title: translate(title), amount, currency, builtinIconName,
    dueDate: formatDateToLocal(landingPreviewDate(days, today)),
    status: "upcoming", remind: true, createdAt: timestamp, updatedAt: timestamp,
    transactionCategory: category(upcomingCategories[id]),
  }));

  // Регулярные платежи уже оплачены месяцем раньше — в тот же день месяца
  const recurringPaid = payments.map(({ id, title, amount, days }) =>
    completedPayment(`${id}-paid`, title, upcomingCategories[id], amount, dateInMonth(landingPreviewDate(days, today), -1, landingPreviewDate(days, today).getDate())),
  );

  return { upcoming, completed: [...previousMonth, ...recurringPaid, ...currentMonth] };
}
