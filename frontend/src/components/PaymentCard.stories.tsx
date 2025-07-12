import type { Meta, StoryObj } from "@storybook/react";
import PaymentCard from "./PaymentCard";

const meta: Meta<typeof PaymentCard> = {
  title: "Components/PaymentCard",
  component: PaymentCard,
  tags: ["autodocs"],
  argTypes: {
    onEdit: { action: "onEdit" },
    onComplete: { action: "onComplete" },
    onDelete: { action: "onDelete" },
  },
};

export default meta;
type Story = StoryObj<typeof PaymentCard>;

const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);

const basePayment = {
  id: "1",
  title: "Netflix Subscription",
  amount: 1299.0,
  dueDate: tomorrow.toISOString().split("T")[0],
  status: "upcoming" as const,
  onEdit: () => {},
  onComplete: () => {},
  onDelete: () => {},
};

export const Upcoming: Story = {
  args: {
    payment: {
      ...basePayment,
    },
  },
};

export const DueToday: Story = {
  args: {
    payment: {
      ...basePayment,
      dueDate: today.toISOString().split("T")[0],
    },
  },
};

export const Overdue: Story = {
  args: {
    payment: {
      ...basePayment,
      status: "overdue",
      dueDate: yesterday.toISOString().split("T")[0],
      title: "Internet Bill",
    },
  },
};

export const Recurring: Story = {
  args: {
    payment: {
      ...basePayment,
      title: "Yandex Plus",
      seriesId: "series-1",
      series: { id: "series-1", isActive: true },
    },
  },
};

export const RecurringInactive: Story = {
  args: {
    payment: {
      ...basePayment,
      title: "Paused Gym",
      seriesId: "series-2",
      series: { id: "series-2", isActive: false },
    },
  },
};
