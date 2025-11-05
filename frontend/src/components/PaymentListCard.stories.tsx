import type { Meta, StoryObj } from "@storybook/react";
import PaymentListCard, { PaymentListCardProps } from "./PaymentListCard";

const meta: Meta<typeof PaymentListCard> = {
  title: "Components/PaymentListCard",
  component: PaymentListCard,
};

export default meta;
type Story = StoryObj<typeof PaymentListCard>;

const basePayment = {
  id: "1",
  title: "Оплата интернета",
  amount: 599.99,
  dueDate: new Date().toISOString(),
  status: "upcoming" as const,
  remind: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  category: { id: "c1", name: "Коммунальные", builtinIconName: "bolt" },
} as PaymentListCardProps["payment"];

export const UpcomingToday: Story = {
  args: {
    payment: basePayment,
    context: "payments",
  },
};

export const Overdue: Story = {
  args: {
    payment: {
      ...basePayment,
      status: "overdue",
      dueDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
    context: "payments",
  },
};

export const RecurringWithFile: Story = {
  args: {
    payment: {
      ...basePayment,
      seriesId: "s1",
      series: {
        id: "s1",
        isActive: true,
        title: "",
        amount: 0,
        recurrenceRule: "FREQ=MONTHLY",
      },
      isVirtual: true,
      filePath: "/files/1",
      fileName: "invoice.pdf",
    },
    context: "payments",
  },
};

export const HomeUpcoming: Story = {
  args: {
    payment: basePayment,
    context: "home",
  },
};

export const ArchiveCompleted: Story = {
  args: {
    payment: {
      ...basePayment,
      status: "completed",
      completedAt: new Date().toISOString(),
    },
    context: "archive",
  },
};

export const ArchiveDeleted: Story = {
  args: {
    payment: {
      ...basePayment,
      status: "deleted",
      completedAt: undefined,
      seriesId: "s1",
      series: {
        id: "s1",
        isActive: true,
        title: "",
        amount: 0,
        recurrenceRule: "FREQ=MONTHLY",
      },
      filePath: "/files/1",
      fileName: "invoice.pdf",
      createdAt: new Date().toISOString(),
      isVirtual: true,
      updatedAt: new Date().toISOString(),
    },
    context: "archive",
  },
};

export const VirtualPayment: Story = {
  args: {
    payment: {
      ...basePayment,
      dueDate: new Date(
        new Date().setDate(new Date().getDate() + 1)
      ).toISOString(),
      isVirtual: true,
      title: "Виртуальная подписка",
    },
    context: "payments",
  },
};

export const LongTitle: Story = {
  args: {
    payment: {
      ...basePayment,
      title:
        "Очень длинное название платежа которое должно проверять как компонент обрабатывает очень длинный текст в заголовке",
    },
    context: "payments",
  },
};
