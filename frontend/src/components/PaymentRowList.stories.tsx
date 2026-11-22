import type { Meta, StoryObj } from "@storybook/react";
import PaymentRowList from "./PaymentRowList";
import { PaymentData } from "../types/paymentData";
import { formatDateToLocal } from "../utils/dateUtils";

const meta: Meta<typeof PaymentRowList> = {
  title: "Components/PaymentRowList",
  component: PaymentRowList,
  args: {
    mode: "active",
    inset: "plain",
    emptyMessage: "Нет платежей",
  },
};

export default meta;
type Story = StoryObj<typeof PaymentRowList>;

// Дата относительно сегодняшнего дня в формате YYYY-MM-DD
const dayOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDateToLocal(d);
};

const monthsAgo = (months: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return formatDateToLocal(d);
};

const series = {
  id: "s-internet",
  title: "Интернет",
  amount: 750,
  recurrenceRule: "FREQ=MONTHLY",
  isActive: true,
};

const base = {
  remind: false,
  currency: "RUB",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Серия, просроченная на несколько месяцев: в БД один реальный платеж, остальные периоды — виртуальные
const overdueSeries: PaymentData[] = [3, 2, 1].map((months, index) => ({
  ...base,
  id: index === 0 ? "real-internet" : `virtual:s-internet:${monthsAgo(months)}`,
  title: "Интернет",
  amount: 750,
  dueDate: monthsAgo(months),
  status: "overdue",
  seriesId: series.id,
  series,
  isVirtual: index > 0,
  builtinIconName: "wifi",
  transactionCategory: { id: "c-home", name: "Дом" },
}));

const payments: PaymentData[] = [
  ...overdueSeries,
  {
    ...base,
    id: "single-overdue",
    title: "Штраф ГИБДД",
    amount: 500,
    dueDate: dayOffset(-4),
    status: "overdue",
  },
  {
    ...base,
    id: "today",
    title: "Мобильная связь",
    amount: 450,
    dueDate: dayOffset(0),
    status: "upcoming",
  },
  {
    ...base,
    id: "week",
    title: "Подписка на музыку",
    amount: 199,
    dueDate: dayOffset(3),
    status: "upcoming",
  },
];

export const OverdueSeriesGrouped: Story = {
  args: { payments },
  decorators: [
    (Story) => (
      <div className="max-w-2xl p-6">
        <Story />
      </div>
    ),
  ],
};
