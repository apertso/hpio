import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(), profile: vi.fn(), users: vi.fn(), snapshotByDate: vi.fn(), snapshots: vi.fn(), createSnapshot: vi.fn(),
  cash: vi.fn(),
  // Имитация таблицы exchange_rate_snapshots: переживает vi.resetModules(), как БД переживает перезапуск.
  store: new Map<string, Record<string, number>>(),
}));
vi.mock("../../backend/node_modules/axios", () => ({ default: { get: mocks.get } }));
vi.mock("../../backend/src/services/authService", () => ({ getUserProfile: mocks.profile, getAllUsers: mocks.users }));
vi.mock("../../backend/src/services/fundSnapshotService", () => ({
  getSnapshotByDate: mocks.snapshotByDate, getSnapshots: mocks.snapshots, createSnapshot: mocks.createSnapshot,
}));
vi.mock("../../backend/src/services/cardService", () => ({ getCards: async () => [] }));
vi.mock("../../backend/src/services/cardBalanceService", () => ({ getCardBalancesByUser: async () => [] }));
vi.mock("../../backend/src/services/cashBalanceService", () => ({ getCashBalances: mocks.cash }));
vi.mock("../../backend/src/services/cryptoBalanceService", () => ({ getBalances: async () => [] }));
vi.mock("../../backend/src/services/cryptoService", () => ({ getPrices: async () => ({}) }));
vi.mock("../../backend/src/services/exchangeRateSnapshotService", () => ({
  getStoredRates: async (dates: string[]) =>
    new Map(dates.filter((date) => mocks.store.has(date)).map((date) => [date, mocks.store.get(date)!])),
  getLatestStoredRates: async (notAfter: string) => {
    const date = [...mocks.store.keys()].filter((d) => d <= notAfter).sort().pop();
    return date ? { rateDate: date, rates: mocks.store.get(date)! } : null;
  },
  storeRates: async (date: string, rates: Record<string, number>) => { mocks.store.set(date, rates); },
}));

const ratesResponse = (rates: Record<string, number>) => ({ data: { usd: rates } });
// Свежие модули на каждый тест: кэши курсов и отметки снимков живут на уровне модуля.
const loadRates = () => import("../../backend/src/services/exchangeRateService");
const loadFunds = () => import("../../backend/src/services/fundsService");

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.store.clear();
  mocks.profile.mockResolvedValue({ id: "user", preferredCurrency: "RUB", timezone: "UTC" });
  mocks.users.mockResolvedValue([{ id: "user", preferredCurrency: "RUB", timezone: "UTC" }]);
  mocks.snapshotByDate.mockResolvedValue(null);
  mocks.cash.mockResolvedValue([{ amount: "100", currency: "EUR" }]);
});
afterEach(() => { vi.useRealTimers(); });

describe("курсы валют", () => {
  it("переходит на резервный адрес и не выдаёт 1:1, если курсов нет совсем", async () => {
    const { getUsdRates, ExchangeRatesUnavailableError } = await loadRates();
    mocks.get.mockRejectedValueOnce(new Error("cdn down")).mockResolvedValueOnce(ratesResponse({ eur: 0.8 }));
    expect(await getUsdRates()).toEqual({ usd: 1, eur: 0.8 });
    expect(mocks.get.mock.calls[1][0]).toContain("currency-api.pages.dev");

    vi.resetModules();
    const fresh = await loadRates();
    mocks.get.mockRejectedValue(new Error("all down"));
    await expect(fresh.getUsdRates()).rejects.toBeInstanceOf(fresh.ExchangeRatesUnavailableError);
    expect(ExchangeRatesUnavailableError).toBeDefined();
  });

  it("берёт снимок курсов на дату, кэширует его и не повторяет неудачный запрос сразу", async () => {
    const { getUsdRatesForDates } = await loadRates();
    mocks.get.mockImplementation(async (url: string) => {
      if (url.includes("2026-10-05")) return ratesResponse({ rub: 80 });
      throw new Error("not found");
    });
    const first = await getUsdRatesForDates(["2026-10-05", "2020-01-01", "2026-10-05"]);
    expect(first.get("2026-10-05")).toEqual({ usd: 1, rub: 80 });
    expect(first.get("2020-01-01")).toBeNull();
    expect(mocks.get.mock.calls.some(([url]) => String(url).includes("@2026-10-05/"))).toBe(true);
    const callsAfterFirst = mocks.get.mock.calls.length;
    await getUsdRatesForDates(["2026-10-05", "2020-01-01"]);
    expect(mocks.get.mock.calls.length).toBe(callsAfterFirst);
  });

  it("не подставляет в адрес строку, не похожую на дату", async () => {
    const { getUsdRatesForDate } = await loadRates();
    expect(await getUsdRatesForDate("latest/../x")).toBeNull();
    expect(mocks.get).not.toHaveBeenCalled();
  });
});

describe("курсы в базе данных", () => {
  it("после перезапуска берёт исторические курсы из БД без запросов к провайдеру", async () => {
    mocks.get.mockResolvedValue(ratesResponse({ rub: 80 }));
    await (await loadRates()).getUsdRatesForDates(["2026-10-05"]);
    expect(mocks.store.get("2026-10-05")).toEqual({ usd: 1, rub: 80 });

    vi.resetModules();
    mocks.get.mockClear();
    const restarted = await loadRates();
    const rates = await restarted.getUsdRatesForDates(["2026-10-05"]);
    expect(rates.get("2026-10-05")).toEqual({ usd: 1, rub: 80 });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("не сохраняет сегодняшний снимок: он ещё может измениться", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
    mocks.get.mockResolvedValue(ratesResponse({ rub: 80 }));
    await (await loadRates()).getUsdRatesForDates(["2026-11-20"]);
    expect(mocks.store.has("2026-11-20")).toBe(false);
  });

  it("при холодном старте без провайдера использует последний сохранённый снимок", async () => {
    mocks.store.set("2026-11-18", { usd: 1, rub: 95 });
    mocks.store.set("2026-11-19", { usd: 1, rub: 96 });
    mocks.get.mockRejectedValue(new Error("all down"));
    expect(await (await loadRates()).getUsdRates()).toEqual({ usd: 1, rub: 96 });
  });
});

describe("снимки и история баланса", () => {
  it("повторяет снимок после полуночи, если курсы были недоступны, и не дублирует его", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { createDailySnapshots } = await loadFunds();
    vi.setSystemTime(new Date("2026-11-20T00:00:00Z"));
    mocks.get.mockRejectedValue(new Error("all down"));
    expect(await createDailySnapshots()).toBe(0);
    expect(mocks.createSnapshot).not.toHaveBeenCalled();

    vi.setSystemTime(new Date("2026-11-20T00:07:00Z"));
    mocks.get.mockResolvedValue(ratesResponse({ eur: 0.8, rub: 100 }));
    expect(await createDailySnapshots()).toBe(1);
    expect(mocks.createSnapshot).toHaveBeenCalledWith("user", "2026-11-20", 125);

    vi.setSystemTime(new Date("2026-11-20T00:08:00Z"));
    expect(await createDailySnapshots()).toBe(0);
    expect(mocks.snapshotByDate).toHaveBeenCalledTimes(2);

    vi.setSystemTime(new Date("2026-11-20T07:00:00Z"));
    mocks.createSnapshot.mockClear();
    expect(await createDailySnapshots()).toBe(0);
  });

  it("переводит историю по курсу на дату снимка, а без него — по текущему", async () => {
    const { getFundsHistory } = await loadFunds();
    mocks.snapshots.mockResolvedValue([
      { snapshotDate: "2026-10-05", totalUsd: "10" },
      { snapshotDate: "2026-11-19", totalUsd: "10" },
    ]);
    mocks.get.mockImplementation(async (url: string) => {
      if (url.includes("2026-10-05")) return ratesResponse({ rub: 80 });
      if (url.includes("latest")) return ratesResponse({ rub: 100 });
      throw new Error("not found");
    });
    expect(await getFundsHistory("user", "2026-10-01", "2026-11-20")).toEqual([
      { date: "2026-10-05", totalAmount: 800 },
      { date: "2026-11-19", totalAmount: 1000 },
    ]);
  });
});
