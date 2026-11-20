import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FundsSummary, FundsHistoryPoint } from "../api/fundsApi";

const mocks = vi.hoisted(() => ({ currency: "USD", summary: vi.fn(), history: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ usePreferredCurrency: () => mocks.currency }));
vi.mock("../context/ThemeContext", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("../api/fundsApi", () => ({ fundsApi: { getSummary: mocks.summary, getHistory: mocks.history } }));
vi.mock("./CustomDailySpendingChart", () => ({ default: ({ data, currency }: { data: number[]; currency: string }) => <div data-testid="funds-chart">{currency}: {data.join(",")}</div> }));
import TotalFundsWidget from "./TotalFundsWidget";
import FundsTrendWidget from "./FundsTrendWidget";

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.currency = "USD"; });

describe("валюты общего баланса", () => {
  it("перезапрашивает сводку и скрывает прежнюю валюту до нового ответа", async () => {
    mocks.summary.mockResolvedValueOnce({ totalAmount: 120, currency: "USD", changeAmount: null });
    const { rerender, container } = render(<TotalFundsWidget />);
    await waitFor(() => expect(container.textContent).toContain("$"));
    let resolve: (value: FundsSummary) => void = () => {};
    mocks.summary.mockReturnValueOnce(new Promise<FundsSummary>((done) => { resolve = done; }));
    mocks.currency = "EUR";
    rerender(<TotalFundsWidget />);
    expect(container.textContent).not.toContain("120");
    await act(async () => { resolve({ totalAmount: 96, currency: "EUR", changeAmount: null }); });
    await waitFor(() => expect(container.textContent).toContain("€"));
    expect(mocks.summary).toHaveBeenCalledTimes(2);
  });

  it("не подставляет ноль или старую сумму при ошибке пересчёта", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.summary.mockRejectedValueOnce(new Error("Missing exchange rate for EUR"));
      render(<TotalFundsWidget />);
      expect(await screen.findByText("Не удалось загрузить баланс в USD.")).toBeTruthy();
    } finally {
      errorLog.mockRestore();
    }
  });

  it("перезапрашивает историю и не подписывает прежние точки новой валютой", async () => {
    mocks.history.mockResolvedValueOnce([{ date: "2026-11-19", totalAmount: 100 }, { date: "2026-11-20", totalAmount: 120 }]);
    const { rerender } = render(<FundsTrendWidget timeRange="1w" />);
    expect(await screen.findByTestId("funds-chart")).toHaveTextContent("USD: 100,120");
    let resolve: (value: FundsHistoryPoint[]) => void = () => {};
    mocks.history.mockReturnValueOnce(new Promise<FundsHistoryPoint[]>((done) => { resolve = done; }));
    mocks.currency = "EUR";
    rerender(<FundsTrendWidget timeRange="1w" />);
    expect(screen.queryByTestId("funds-chart")).toBeNull();
    await act(async () => { resolve([{ date: "2026-11-19", totalAmount: 80 }, { date: "2026-11-20", totalAmount: 96 }]); });
    expect(await screen.findByTestId("funds-chart")).toHaveTextContent("EUR: 80,96");
    expect(mocks.history).toHaveBeenCalledTimes(2);
  });
});
