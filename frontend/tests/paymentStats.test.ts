import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), payments: vi.fn(), categories: vi.fn(), incomes: vi.fn(), series: vi.fn(), rates: vi.fn(), datedRates: vi.fn(),
}));
vi.mock("../../backend/src/models", () => ({ default: {
  User: { findByPk: mocks.user }, Payment: { findAll: mocks.payments },
  TransactionCategory: { findAll: mocks.categories },
} }));
vi.mock("../../backend/src/services/incomeService", () => ({ getIncomesForPeriod: mocks.incomes }));
vi.mock("../../backend/src/services/seriesService", () => ({
  getActiveRecurringSeriesWithCategory: mocks.series,
}));
vi.mock("../../backend/src/services/exchangeRateService", async (original) => ({
  ...await original<typeof import("../../backend/src/services/exchangeRateService")>(), getUsdRates: mocks.rates, getUsdRatesForDates: mocks.datedRates,
}));
import { getDashboardStats } from "../../backend/src/services/paymentService";

describe("статистика платежей из сервиса", () => {
  afterEach(() => { vi.useRealTimers(); });
  beforeEach(() => {
    vi.clearAllMocks();
    // Оплата 2026-11-20 по Москве уже в прошлом, поэтому берётся курс на эту дату.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-25T12:00:00Z"));
    mocks.datedRates.mockImplementation(async (dates: Set<string>) =>
      new Map([...dates].map((date) => [date, date === "2026-11-20" ? { usd: 1, eur: 0.8, rub: 100 } : null])));
    mocks.user.mockResolvedValue({ timezone: "Europe/Moscow", preferredCurrency: "EUR" });
    const data = { id: "paid", title: "Оплачен", amount: "120", currency: "USD", dueDate: "2026-10-01", status: "completed", completedAt: new Date("2026-11-19T22:30:00Z"), categoryId: null };
    mocks.payments.mockResolvedValue([{ ...data, toJSON: () => data }]);
    mocks.categories.mockResolvedValue([]);
    mocks.series.mockResolvedValue([]);
    const income = { amount: "500", currency: "USD", date: "2026-11-20", categoryId: null };
    mocks.incomes.mockResolvedValue([{ ...income, toJSON: () => income }]);
    // Текущие курсы намеренно другие: итоги прошлых операций не должны от них зависеть.
    mocks.rates.mockResolvedValue({ usd: 1, eur: 0.9, rub: 90 });
  });

  it("использует валюту профиля, дату выполнения в таймзоне и сохраняет оригинал", async () => {
    const stats = await getDashboardStats("user", "2026-11-01", "2026-11-30");
    expect(mocks.user).toHaveBeenCalledWith("user", { attributes: ["timezone", "preferredCurrency"] });
    expect(mocks.incomes).toHaveBeenCalledWith("user", "2026-11-01", "2026-11-30");
    expect(stats.currency).toBe("EUR");
    expect(stats.totalCompletedAmount).toBe("96.00");
    expect(stats.totalIncomeAmount).toBe("400.00");
    expect(stats.dailyPaymentLoad).toEqual([{ date: "2026-11-20", amount: 96 }]);
    expect(stats.allPaymentsInMonth[0]).toMatchObject({ amount: "120", currency: "USD", convertedAmount: 96, rateDate: "2026-11-20" });
    expect(mocks.datedRates).toHaveBeenCalledWith(new Set(["2026-11-20"]));
    mocks.user.mockResolvedValue({ timezone: "Europe/Moscow", preferredCurrency: "RUB" });
    expect((await getDashboardStats("user", "2026-11-01", "2026-11-30")).totalCompletedAmount).toBe("12000.00");
  });

  it("берёт валюту виртуальной серии из платежа вне выбранного периода", async () => {
    mocks.payments.mockResolvedValueOnce([]).mockResolvedValueOnce([{ seriesId: "series", currency: "EUR" }]);
    mocks.series.mockResolvedValue([{ id: "series", title: "Подписка", amount: 80, startDate: "2026-10-20", generatedUntil: "2026-10-20", recurrenceRule: "FREQ=MONTHLY", remind: false }]);
    mocks.incomes.mockResolvedValue([]);
    mocks.user.mockResolvedValue({ timezone: "Europe/Moscow", preferredCurrency: "USD" });
    const stats = await getDashboardStats("user", "2026-11-01", "2026-11-30");
    expect(stats.allPaymentsInMonth).toHaveLength(1);
    // Предстоящий виртуальный платёж — по текущему курсу.
    expect(stats.allPaymentsInMonth[0]).toMatchObject({ amount: 80, currency: "EUR", rateDate: null, isVirtual: true });
    expect(stats.allPaymentsInMonth[0].convertedAmount).toBeCloseTo(88.89, 2);
    expect(stats.totalUpcomingAmount).toBe("88.89");
  });

  it("строит статистику без текущих курсов, если они недоступны", async () => {
    mocks.rates.mockRejectedValue(new Error("Exchange rates are unavailable"));
    mocks.user.mockResolvedValue({ timezone: "Europe/Moscow", preferredCurrency: "EUR" });
    const stats = await getDashboardStats("user", "2026-11-01", "2026-11-30");
    expect(stats.totalCompletedAmount).toBe("96.00");
    expect(stats.conversionUnavailable).toBe(false);
  });
});
