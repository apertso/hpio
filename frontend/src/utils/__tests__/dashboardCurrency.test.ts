import { describe, expect, it } from "vitest";
import { convertCurrency, formatCurrencyTotals, groupCurrencyTotals } from "../currencies";
import { calculateStatsFromPayments, previousCompletedTotal, ratesNoteKey } from "../dashboardStats";
import type { PaymentData } from "../../types/paymentData";

// Серверный расчёт статистики проверяется в tests/dashboardCurrencyBackend.test.ts.
const rates = { usd: 1, eur: 0.8, rub: 100 };
const payment = (id: string, amount: number, currency: string, status: PaymentData["status"] = "completed"): PaymentData => ({
  id, title: id, amount, currency, status, dueDate: "2026-11-20", completedAt: status === "completed" ? "2026-11-19T22:30:00Z" : null,
  remind: false, createdAt: "2026-11-01", updatedAt: "2026-11-20",
});
const payments = [payment("USD", 120, "USD"), payment("EUR", 80, "EUR"), payment("План", 9000, "RUB", "upcoming")];

describe("валюты аналитики", () => {
  it("пересчитывает через USD и не подменяет отсутствующий курс единицей", () => {
    expect(convertCurrency(80, "EUR", "RUB", rates)).toBe(10000);
    expect(convertCurrency(80, "EUR", "EUR", {})).toBe(80);
    expect(convertCurrency(80, "EUR", "RUB", {})).toBeNull();
    expect(convertCurrency(80, "EUR", "RUB", { eur: 0, rub: 100 })).toBeNull();
    expect(convertCurrency(80, "EUR", "RUB", { eur: -1, rub: 100 })).toBeNull();
    expect(convertCurrency(Infinity, "USD", "USD", {})).toBeNull();
  });

  it("сравнивает с прошлым периодом по серверному итогу только в той же валюте", () => {
    const previous = { currency: "EUR", totalCompletedAmount: "176.00", conversionUnavailable: false };
    expect(previousCompletedTotal(previous, "EUR")).toBe(176);
    expect(previousCompletedTotal(previous, "RUB")).toBeNull();
    expect(previousCompletedTotal({ ...previous, totalCompletedAmount: null, conversionUnavailable: true }, "EUR")).toBeNull();
  });

  it("подписывает, по каким курсам сделана оценка", () => {
    expect(ratesNoteKey({})).toBe("Оценка в {1} по курсу на дату операции");
    expect(ratesNoteKey({ usedCurrentRatesFallback: true })).toBe("Оценка в {1}; где нет исторического курса, использован текущий");
  });

  it("в офлайне показывает исходные валюты вместо выдуманной конвертации и не выдумывает доход", () => {
    const offline = calculateStatsFromPayments(payments, new Date(2026, 10, 1), new Date(2026, 10, 30), "RUB");
    expect(offline.conversionUnavailable).toBe(true);
    expect(offline.totalCompletedAmount).toBeNull();
    expect(offline.totalIncomeAmount).toBeNull();
    expect(offline.originalTotals.completed).toEqual([{ currency: "USD", amount: 120 }, { currency: "EUR", amount: 80 }]);
    const sameCurrency = calculateStatsFromPayments([payment("Один", 80, "EUR")], new Date(2026, 10, 1), new Date(2026, 10, 30), "EUR");
    expect(sameCurrency.totalCompletedAmount).toBe("80.00");
    expect(sameCurrency.conversionUnavailable).toBe(false);
  });
});

describe("операционные суммы", () => {
  it("группирует по исходной валюте независимо от порядка, регистра и пустой валюты", () => {
    const items = [{ amount: 120, currency: "USD" }, { amount: "80", currency: "eur" }, { amount: 30, currency: " usd " }, { amount: 10 }];
    expect(groupCurrencyTotals(items)).toEqual([{ currency: "USD", amount: 150 }, { currency: "EUR", amount: 80 }, { currency: "RUB", amount: 10 }]);
    expect(formatCurrencyTotals(items, "en-US")).toBe("$150.00 + €80.00 + ₽10.00");
    expect(formatCurrencyTotals([], "ru-RU")).toBe("");
  });
});
