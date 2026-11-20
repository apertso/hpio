import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardHero from "./DashboardHero";
import DashboardInsights from "./DashboardInsights";
import CumulativeSpendingChart from "./CumulativeSpendingChart";
import PaymentRowList from "../PaymentRowList";
import { formatCurrencyTotals, formatMoney } from "../../utils/currencies";
import type { AnalyticsPayment } from "../../utils/dashboardStats";

afterEach(cleanup);
const payment = (id: string, amount: number, currency: string, convertedAmount: number): AnalyticsPayment => ({
  id, title: id, amount, currency, convertedAmount, status: "completed", dueDate: "2026-11-20",
  completedAt: "2026-11-20T10:00:00Z", remind: false, createdAt: "2026-11-01", updatedAt: "2026-11-20",
});
const mixed = [payment("Доллары", 120, "USD", 12000), payment("Евро", 80, "EUR", 10000)];

describe("валюты виджетов", () => {
  it("сохраняет валюты героя, просроченных и сегодняшних платежей", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    try {
      const upcoming = mixed.map((p) => ({ ...p, status: "upcoming" as const }));
      const { container, rerender } = render(<DashboardHero upcoming={upcoming} currency="RUB" windowLabel="10 дней" activeFilter={null} onFilter={vi.fn()} onOpenPayment={vi.fn()} />);
      expect(container.textContent).toContain("$");
      expect(container.textContent).toContain("€");
      expect(container.textContent).not.toContain("₽");
      expect(screen.getByRole("button", { name: /Сегодня/ }).textContent).toContain(formatCurrencyTotals(upcoming, "ru-RU"));
      rerender(<DashboardHero upcoming={upcoming.map((p) => ({ ...p, status: "overdue" }))} currency="EUR" windowLabel="10 дней" activeFilter={null} onFilter={vi.fn()} onOpenPayment={vi.fn()} />);
      expect(screen.getByRole("button", { name: /Просрочено/ }).textContent).toContain(formatCurrencyTotals(upcoming, "ru-RU"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("группирует валюты заголовка и скрытых строк, сохраняя суммы отдельных строк", () => {
    const payments = [payment("Первая", 10, "RUB", 10), ...mixed];
    const { container } = render(<PaymentRowList payments={payments} mode="archive" emptyMessage="Пусто" onOpen={vi.fn()} groupLimit={1} />);
    expect(container.textContent).toContain(formatCurrencyTotals(payments, "ru-RU"));
    const more = screen.getByRole("button", { name: /Ещё 2/ });
    expect(more.textContent).toContain(formatCurrencyTotals(mixed, "ru-RU"));
    fireEvent.click(more);
    // Строка рендерится в мобильном и настольном вариантах — проверяем каждый.
    const rowsOf = (title: string): (string | null | undefined)[] =>
      screen.getAllByText(title).map((element) => element.closest("li")?.textContent);
    rowsOf("Доллары").forEach((text) => expect(text).toContain(formatMoney(120, "ru-RU", "USD")));
    rowsOf("Евро").forEach((text) => expect(text).toContain(formatMoney(80, "ru-RU", "EUR")));
  });

  it("ранжирует крупнейшую трату и категории по пересчитанным значениям", () => {
    const dollar = { ...mixed[0], amount: 120, convertedAmount: 12000, transactionCategory: { id: "a", name: "Доллары" } };
    const rubles = { ...payment("Рубли", 1000, "RUB", 1000), transactionCategory: { id: "b", name: "Рубли" } };
    const onOpenPayment = vi.fn();
    render(<DashboardInsights stats={{ totalCompletedAmount: "13000", allPaymentsInMonth: [dollar, rubles], conversionUnavailable: false }} currency="RUB" startDate={new Date(2026, 10, 1)} endDate={new Date(2026, 10, 30)} previousPeriod={null} previousTotal={null} theme="light" onOpenPayment={onOpenPayment} />);
    const biggest = screen.getByRole("button", { name: /Крупнейшая трата/ });
    expect(biggest.textContent).toContain("Доллары");
    expect(biggest.textContent).toContain(formatMoney(12000, "ru-RU", "RUB"));
    expect(screen.getByText("Больше всего тратите на").closest("li")?.textContent).toContain("Доллары");
    expect(screen.getByText(/Оценка в RUB/)).toBeTruthy();
    fireEvent.click(biggest);
    expect(onOpenPayment).toHaveBeenCalledWith("Доллары");
  });

  it("строит график по convertedAmount, сохраняя исходные данные платежа", () => {
    render(<CumulativeSpendingChart payments={mixed} currency="RUB" startDate={new Date(2026, 10, 20)} endDate={new Date(2026, 10, 20)} />);
    const plot = screen.getByRole("img");
    vi.spyOn(plot, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 100, 100));
    fireEvent.mouseMove(plot, { clientX: 100 });
    expect(screen.getByRole("tooltip").textContent).toContain(formatMoney(22000, "ru-RU", "RUB"));
    expect(mixed[0].amount).toBe(120);
  });

  it("не выдаёт неполную аналитику при отсутствии курсов", () => {
    render(<DashboardInsights stats={{ totalCompletedAmount: null, allPaymentsInMonth: mixed, conversionUnavailable: true }} currency="RUB" startDate={new Date(2026, 10, 1)} endDate={new Date(2026, 10, 30)} previousPeriod={null} previousTotal={null} theme="light" onOpenPayment={vi.fn()} />);
    expect(screen.getByText("Наблюдения недоступны: нет курса для пересчёта в RUB.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Крупнейшая трата/ })).toBeNull();
  });
});
