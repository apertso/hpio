import { describe, expect, it, vi } from "vitest";
import { calculateDashboardStats, getRateDate, type DashboardRates } from "../../backend/src/services/dashboardStats";
import { convertCurrency, convertCurrencyToUsd, convertUsdToCurrency } from "../../backend/src/services/exchangeRateService";
import type { PaymentData } from "../src/types/paymentData";

// Без настоящей БД: модуль курсов импортирует сервис хранилища снимков.
vi.mock("../../backend/src/services/exchangeRateSnapshotService", () => ({
  getStoredRates: async () => new Map(), getLatestStoredRates: async () => null, storeRates: async () => undefined,
}));

const rates = { usd: 1, eur: 0.8, rub: 100 };
const current = (value: Record<string, number> | null = rates): DashboardRates => ({ current: value, byDate: new Map() });
const payment = (
  id: string, amount: number, currency: string, status: PaymentData["status"] = "completed", completedAt = "2026-11-19T22:30:00Z"
): PaymentData => ({
  id, title: id, amount, currency, status, dueDate: "2026-11-20", completedAt: status === "completed" ? completedAt : null,
  remind: false, createdAt: "2026-11-01", updatedAt: "2026-11-20",
});
const payments = [payment("USD", 120, "USD"), payment("EUR", 80, "EUR"), payment("План", 9000, "RUB", "upcoming")];
// «Сегодня» — 2026-11-20 по Москве: платежи, выполненные сегодня, считаются по текущему курсу.
const calculate = (currency = "RUB", exchangeRates: DashboardRates = current()) => calculateDashboardStats(
  payments, [{ amount: 400, currency: "EUR", date: "2026-11-20", transactionCategory: { id: "salary", name: "Зарплата" } }],
  { startDate: "2026-11-01", endDate: "2026-11-30", timezone: "Europe/Moscow", currency, today: "2026-11-20", rates: exchangeRates }
);

describe("серверная валюта аналитики", () => {
  it("пересчитывает через USD и не подменяет отсутствующий курс единицей", () => {
    expect(convertCurrency(80, "EUR", "RUB", rates)).toBe(10000);
    expect(convertCurrency(80, "EUR", "RUB", {})).toBeNull();
    expect(convertCurrency(80, "EUR", "RUB", { eur: 0, rub: 100 })).toBeNull();
  });

  it("пересчитывает итоги, категории, доходы и нагрузку, сохраняя оригиналы", () => {
    const stats = calculate();
    expect(stats.currency).toBe("RUB");
    expect(stats.totalCompletedAmount).toBe("22000.00");
    expect(stats.totalUpcomingAmount).toBe("9000.00");
    expect(stats.totalIncomeAmount).toBe("50000.00");
    expect(stats.categoriesDistribution[0].amount).toBe(31000);
    expect(stats.incomeCategoriesDistribution[0].amount).toBe(50000);
    expect(stats.dailyPaymentLoad).toEqual([{ date: "2026-11-20", amount: 31000 }]);
    expect(stats.allPaymentsInMonth[0]).toMatchObject({ amount: 120, currency: "USD", convertedAmount: 12000, rateDate: null });
    expect(stats.originalTotals.completed).toEqual([{ currency: "USD", amount: 120 }, { currency: "EUR", amount: 80 }]);
    expect(calculate("EUR").totalCompletedAmount).toBe("176.00");
  });

  it("выполненные в прошлом платежи и доходы считает по курсу на их дату", () => {
    const byDate = new Map([["2026-10-05", { usd: 1, eur: 0.5, rub: 80 }]]);
    const stats = calculateDashboardStats(
      [payment("Старый", 100, "USD", "completed", "2026-10-05T10:00:00Z"), payment("План", 100, "USD", "upcoming")],
      [{ amount: 50, currency: "EUR", date: "2026-10-05" }],
      { startDate: "2026-10-01", endDate: "2026-11-30", timezone: "Europe/Moscow", currency: "RUB", today: "2026-11-20", rates: { current: rates, byDate } }
    );
    expect(stats.allPaymentsInMonth[0]).toMatchObject({ convertedAmount: 8000, rateDate: "2026-10-05" });
    expect(stats.allPaymentsInMonth[1]).toMatchObject({ convertedAmount: 10000, rateDate: null });
    expect(stats.totalIncomeAmount).toBe("8000.00");
    expect(stats.usedCurrentRatesFallback).toBe(false);
  });

  it("без исторического курса использует текущий и помечает это", () => {
    const stats = calculateDashboardStats(
      [payment("Старый", 100, "USD", "completed", "2026-10-05T10:00:00Z")], [],
      { startDate: "2026-10-01", endDate: "2026-10-31", timezone: "Europe/Moscow", currency: "RUB", today: "2026-11-20",
        rates: { current: rates, byDate: new Map([["2026-10-05", null]]) } }
    );
    expect(stats.totalCompletedAmount).toBe("10000.00");
    expect(stats.usedCurrentRatesFallback).toBe(true);
  });

  it("определяет дату курса в таймзоне пользователя и не берёт сегодняшние и будущие даты", () => {
    expect(getRateDate({ status: "completed", completedAt: "2026-11-18T22:30:00Z" }, "Europe/Moscow", "2026-11-20")).toBe("2026-11-19");
    expect(getRateDate({ status: "completed", completedAt: "2026-11-19T22:30:00Z" }, "Europe/Moscow", "2026-11-20")).toBeNull();
    expect(getRateDate({ status: "overdue", completedAt: null }, "Europe/Moscow", "2026-11-20")).toBeNull();
    expect(getRateDate({ date: "2026-11-01" }, "Europe/Moscow", "2026-11-20")).toBe("2026-11-01");
  });

  it("не отдаёт неполные суммы без курса, но сохраняет исходные валюты", () => {
    const stats = calculate("RUB", current({ usd: 1, rub: 100 }));
    expect(stats.conversionUnavailable).toBe(true);
    expect(stats.missingCurrencies).toEqual(["EUR"]);
    expect(stats.totalCompletedAmount).toBeNull();
    expect(stats.categoriesDistribution).toEqual([]);
    expect(stats.dailyPaymentLoad).toEqual([]);
    expect(stats.allPaymentsInMonth[1].convertedAmount).toBeNull();
  });

  it("без текущих курсов всё равно считает операции в валюте профиля", () => {
    const stats = calculateDashboardStats([payment("Рубли", 500, "RUB")], [],
      { startDate: "2026-11-01", endDate: "2026-11-30", timezone: "Europe/Moscow", currency: "RUB", today: "2026-11-20", rates: current(null) });
    expect(stats.totalCompletedAmount).toBe("500.00");
    expect(stats.conversionUnavailable).toBe(false);
  });

  it("не превращает отсутствующие курсы балансов в 1:1", () => {
    expect(convertCurrencyToUsd(80, "EUR", rates)).toBe(100);
    expect(convertUsdToCurrency(100, "EUR", rates)).toBe(80);
    expect(() => convertCurrencyToUsd(80, "EUR", {})).toThrow("Missing exchange rate");
  });

  it("учитывает виртуальные экземпляры и исключает удалённые", () => {
    const stats = calculateDashboardStats(
      [{ ...payment("Виртуальный", 50, "EUR", "upcoming"), isVirtual: true }, payment("Удалённый", 999, "USD", "deleted")],
      [], { startDate: "2026-11-20", endDate: "2026-11-20", timezone: "Europe/Moscow", currency: "USD", today: "2026-11-20", rates: current() }
    );
    expect(stats.totalUpcomingAmount).toBe("62.50");
    expect(stats.allPaymentsInMonth).toHaveLength(1);
    expect(stats.dailyPaymentLoad).toEqual([{ date: "2026-11-20 12:00", amount: 62.5 }]);
  });
});
