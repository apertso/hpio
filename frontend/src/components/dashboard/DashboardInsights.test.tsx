import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardInsights from "./DashboardInsights";
import type { AnalyticsPayment } from "../../utils/dashboardStats";
import { formatMoney } from "../../utils/currencies";

afterEach(cleanup);

const payment = (id: string, amount: number, status: AnalyticsPayment["status"] = "completed"): AnalyticsPayment => ({
  id, amount, convertedAmount: amount, status, title: id, dueDate: "2026-11-01", completedAt: "2026-11-19T22:30:00Z",
  remind: false, createdAt: "2026-11-01", updatedAt: "2026-11-20",
});
const props = {
  startDate: new Date(2026, 10, 1), endDate: new Date(2026, 10, 30),
  previousPeriod: { startDate: new Date(2026, 9, 1), endDate: new Date(2026, 9, 31) },
  previousTotal: 100, currency: "RUB", timezone: "Europe/Moscow", theme: "light" as const,
  onOpenPayment: vi.fn(),
  stats: { conversionUnavailable: false, totalCompletedAmount: "150", allPaymentsInMonth: [payment("Большая трата", 120), payment("Малая трата", 30), payment("Будущий платёж", 999, "upcoming")] },
};

describe("наблюдения расходов", () => {
  it("показывает крупнейшую выполненную трату и дату оплаты в часовом поясе профиля", () => {
    render(<DashboardInsights {...props} />);
    const biggest = screen.getByRole("button", { name: /Крупнейшая трата/ });
    expect(biggest.textContent).toContain("Большая трата");
    // Дата склеена неразрывными пробелами, сравниваем без учёта вида пробела
    expect(biggest.textContent?.replace(/\u00a0/g, " ")).toContain("20 нояб. 2026 г.");
    expect(screen.queryByText("Будущий платёж")).toBeNull();
    expect(screen.queryByText("Регулярные платежи")).toBeNull();
    fireEvent.click(biggest);
    expect(props.onOpenPayment).toHaveBeenCalledWith("Большая трата");
  });

  it("обновляет крупнейшую трату при смене периода, даже если она единственная", () => {
    const { rerender } = render(<DashboardInsights {...props} />);
    rerender(<DashboardInsights {...props} stats={{ conversionUnavailable: false, totalCompletedAmount: "70", allPaymentsInMonth: [payment("Другая трата", 70)] }} />);
    expect(screen.getByRole("button", { name: /Крупнейшая трата/ }).textContent).toContain("Другая трата");
    expect(screen.queryByText(/Большая трата/)).toBeNull();
  });

  it.each([
    [100, "Расходы выросли", "50%"],
    [300, "Расходы снизились", "50%"],
    [150, "Расходы не изменились", "0%"],
    [0, "Расходы выросли", "В прошлом периоде расходов не было"],
    [null, "Сравнение расходов", "Нет данных для сравнения"],
  ])("обрабатывает предыдущие расходы %s", (previousTotal, label, expected) => {
    const { container } = render(<DashboardInsights {...props} previousTotal={previousTotal} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(container.textContent).toContain(expected);
    expect(container.textContent).not.toMatch(/Infinity|NaN/);
  });

  it("не показывает сравнение и среднее для одного дня", () => {
    render(<DashboardInsights {...props} previousPeriod={null} startDate={new Date(2026, 10, 20)} endDate={new Date(2026, 10, 20)} />);
    expect(screen.queryByText(/Расходы выросли|Сравнение расходов/)).toBeNull();
    expect(screen.queryByText("Средние расходы в день")).toBeNull();
  });

  it("считает среднее по прошедшим дням, включая дни без трат", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    try {
      render(<DashboardInsights {...props} />);
      const row = screen.getByText("Средние расходы в день").closest("li");
      expect(row?.textContent).toContain(formatMoney(7.5, "ru-RU", "RUB"));
    } finally {
      vi.useRealTimers();
    }
  });

  it("показывает нулевые расходы без выдуманной крупнейшей траты", () => {
    render(<DashboardInsights {...props} stats={{ conversionUnavailable: false, totalCompletedAmount: "0", allPaymentsInMonth: [] }} />);
    expect(screen.queryByText("Крупнейшая трата")).toBeNull();
    expect(screen.getByText("Расходы снизились")).toBeTruthy();
    expect(screen.getByText(/100%/)).toBeTruthy();
  });

  it("скрывает старые наблюдения во время загрузки нового периода", () => {
    render(<DashboardInsights {...props} isLoading />);
    expect(screen.getByRole("region", { name: "Наблюдения" }).getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByText("Крупнейшая трата")).toBeNull();
  });
});
