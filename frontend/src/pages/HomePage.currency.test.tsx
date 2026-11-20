import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardStats } from "../utils/dashboardStats";
import { calculateStatsFromPayments } from "../utils/dashboardStats";

const mocks = vi.hoisted(() => ({ currency: "RUB", get: vi.fn(), execute: vi.fn(), setTitle: vi.fn(), toast: vi.fn(), upcoming: [] }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user", timezone: "Europe/Moscow", preferredCurrency: mocks.currency } }),
  usePreferredCurrency: () => mocks.currency,
}));
vi.mock("../context/ThemeContext", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("../context/ResetContext", () => ({ useReset: () => ({ resetKey: 0 }) }));
vi.mock("../context/PageTitleContext", () => ({ usePageTitle: () => ({ setPageTitle: mocks.setTitle }) }));
vi.mock("../context/ToastContext", () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock("../hooks/useApi", () => ({ default: () => ({ data: mocks.upcoming, isLoading: false, error: null, execute: mocks.execute }) }));
vi.mock("../api/axiosInstance", () => ({ default: { get: mocks.get } }));
vi.mock("../components/DatePicker", () => ({ default: () => null }));
vi.mock("../utils/featureFlags", () => ({ isIncomeAndCardsEnabled: () => false }));
import HomePage from "./HomePage";

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.currency = "RUB";
});
const stats = (currency: string): DashboardStats => calculateStatsFromPayments([], new Date(2026, 10, 1), new Date(2026, 10, 30), currency);
const RATES_NOTE = (currency: string): string => `Оценка в ${currency} по курсу на дату операции`;

describe("валюта профиля на главной", () => {
  it("перезагружает тот же период при смене валюты и не подписывает старые числа новой валютой", async () => {
    // Статистику периода и наблюдения страница грузит отдельными запросами к /stats.
    mocks.get.mockImplementation(async () => ({ data: { ...stats("RUB"), totalCompletedAmount: "12000" } }));
    const { rerender } = render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect((await screen.findAllByText(RATES_NOTE("RUB"))).length).toBeGreaterThan(0);
    const callsBeforeSwitch = mocks.get.mock.calls.length;

    let resolve: (value: { data: DashboardStats }) => void = () => {};
    const pending = new Promise<{ data: DashboardStats }>((done) => { resolve = done; });
    mocks.get.mockImplementation(() => pending);
    mocks.currency = "EUR";
    rerender(<MemoryRouter><HomePage /></MemoryRouter>);
    await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThan(callsBeforeSwitch));
    expect(screen.queryByText(RATES_NOTE("RUB"))).toBeNull();
    expect(screen.queryByText(RATES_NOTE("EUR"))).toBeNull();

    await act(async () => { resolve({ data: { ...stats("EUR"), totalCompletedAmount: "96" } }); });
    expect((await screen.findAllByText(RATES_NOTE("EUR"))).length).toBeGreaterThan(0);
    expect(screen.queryByText(/12.000/)).toBeNull();
  });

  it("показывает исходные валюты и сообщение, если пересчёт недоступен", async () => {
    mocks.get.mockImplementation(async () => ({ data: { ...stats("RUB"), conversionUnavailable: true,
      totalCompletedAmount: null, totalUpcomingAmount: null,
      originalTotals: { completed: [{ amount: 120, currency: "USD" }, { amount: 80, currency: "EUR" }], upcoming: [], income: [] },
    } }));
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(await screen.findByRole("status")).toHaveTextContent("Пересчёт в RUB недоступен");
    expect(screen.getByRole("status")).toHaveTextContent("120,00 $ + 80,00 €");
    expect(screen.queryByText(/Оценка в/)).toBeNull();
    expect(await screen.findByText("Наблюдения недоступны: нет курса для пересчёта в RUB.")).toBeTruthy();
    expect(screen.queryByRole("img", { name: /Накопленные расходы/ })).toBeNull();
  });
});
