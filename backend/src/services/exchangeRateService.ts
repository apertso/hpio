import axios from "axios";
import logger from "../config/logger";
import { getLatestStoredRates, getStoredRates, storeRates } from "./exchangeRateSnapshotService";

export type ExchangeRates = Record<string, number>;

type ExchangeApiResponse = {
  date?: string;
  usd?: ExchangeRates;
};

const CACHE_DURATION_MS = 1000 * 60 * 60;
const REQUEST_TIMEOUT_MS = 10000;
const HISTORICAL_FAILURE_RETRY_MS = 1000 * 60 * 60;
const HISTORICAL_CACHE_LIMIT = 2000;
const HISTORICAL_CONCURRENCY = 6;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const LATEST_RATE_URLS = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
];

// Провайдер публикует неизменяемый снимок курсов на каждую дату; второй адрес — резервный CDN.
const datedRateUrls = (date: string): string[] => [
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`,
  `https://${date}.currency-api.pages.dev/v1/currencies/usd.json`,
];

let usdRatesCache: { rates: ExchangeRates; updatedAt: number } | null = null;
let pendingRates: Promise<ExchangeRates> | null = null;
const historicalCache = new Map<string, ExchangeRates>();
const historicalFailures = new Map<string, number>();
const pendingHistorical = new Map<string, Promise<ExchangeRates | null>>();

/** Ошибка, когда курсов нет ни из сети, ни в кэше. */
export class ExchangeRatesUnavailableError extends Error {
  constructor() {
    super("Exchange rates are unavailable");
    this.name = "ExchangeRatesUnavailableError";
  }
}

// Сегодняшняя дата по UTC: снимки провайдера датируются по UTC, и только прошедшие дни неизменны.
const todayUtc = (): string => new Date().toISOString().slice(0, 10);

const normalizeCurrency = (currency: string): string => {
  return currency.trim().toLowerCase();
};

const normalizeRates = (response: ExchangeApiResponse): ExchangeRates => {
  const normalizedRates: ExchangeRates = { usd: 1 };
  Object.entries(response.usd || {}).forEach(([code, value]) => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      normalizedRates[normalizeCurrency(code)] = value;
    }
  });
  return normalizedRates;
};

// Перебирает адреса по очереди; пустой ответ считается неудачей, а не курсом 1:1.
const requestRates = async (urls: string[]): Promise<ExchangeRates> => {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      const response = await axios.get<ExchangeApiResponse>(url, { timeout: REQUEST_TIMEOUT_MS });
      const rates = normalizeRates(response.data);
      if (Object.keys(rates).length > 1) return rates;
      lastError = new Error(`Empty exchange rate response from ${url}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No exchange rate sources configured");
};

const fetchUsdRates = async (): Promise<ExchangeRates> => {
  if (usdRatesCache && Date.now() - usdRatesCache.updatedAt < CACHE_DURATION_MS) {
    return usdRatesCache.rates;
  }

  try {
    const rates = await requestRates(LATEST_RATE_URLS);
    usdRatesCache = { rates, updatedAt: Date.now() };
    return rates;
  } catch (error) {
    if (usdRatesCache) {
      logger.warn("Failed to refresh exchange rates, using stale cache", error);
      return usdRatesCache.rates;
    }
    // После перезапуска памяти нет: берём последний сохранённый в БД снимок, не кэшируя его,
    // чтобы следующий запрос снова попробовал получить свежие курсы.
    const stored = await getLatestStoredRates(todayUtc()).catch((dbError: unknown) => {
      logger.warn("Failed to read stored exchange rates", dbError);
      return null;
    });
    if (stored) {
      logger.warn(`Failed to fetch exchange rates, using stored rates from ${stored.rateDate}`, error);
      return stored.rates;
    }
    logger.error("Failed to fetch exchange rates", error);
    throw new ExchangeRatesUnavailableError();
  }
};

/** Текущие курсы относительно USD. Бросает ExchangeRatesUnavailableError, если курсов нет совсем. */
export const getUsdRates = async (): Promise<ExchangeRates> => {
  if (!pendingRates) pendingRates = fetchUsdRates();
  const request = pendingRates;
  try {
    return await request;
  } finally {
    if (pendingRates === request) pendingRates = null;
  }
};

const rememberHistorical = (date: string, rates: ExchangeRates): void => {
  if (historicalCache.size >= HISTORICAL_CACHE_LIMIT) {
    const oldest = historicalCache.keys().next().value;
    if (oldest !== undefined) historicalCache.delete(oldest);
  }
  historicalCache.set(date, rates);
};

const fetchHistoricalRates = async (date: string): Promise<ExchangeRates | null> => {
  try {
    const rates = await requestRates(datedRateUrls(date));
    rememberHistorical(date, rates);
    historicalFailures.delete(date);
    // Сохраняем только прошедшие дни: сегодняшний снимок у провайдера ещё может обновиться.
    if (date < todayUtc()) await storeRates(date, rates);
    return rates;
  } catch (error) {
    historicalFailures.set(date, Date.now());
    logger.warn(`Failed to fetch historical exchange rates for ${date}`, error);
    return null;
  }
};

/** Курсы на конкретную дату (YYYY-MM-DD) или null, если снимок недоступен. */
export const getUsdRatesForDate = async (date: string): Promise<ExchangeRates | null> => {
  if (!DATE_PATTERN.test(date)) return null;
  const cached = historicalCache.get(date);
  if (cached) return cached;
  const failedAt = historicalFailures.get(date);
  if (failedAt !== undefined && Date.now() - failedAt < HISTORICAL_FAILURE_RETRY_MS) return null;

  let request = pendingHistorical.get(date);
  if (!request) {
    request = fetchHistoricalRates(date);
    pendingHistorical.set(date, request);
  }
  try {
    return await request;
  } finally {
    if (pendingHistorical.get(date) === request) pendingHistorical.delete(date);
  }
};

/** Загружает курсы для набора дат с ограничением параллельных запросов. */
export const getUsdRatesForDates = async (
  dates: Iterable<string>
): Promise<Map<string, ExchangeRates | null>> => {
  const unique = [...new Set(dates)];
  const result = new Map<string, ExchangeRates | null>();

  // Сначала одним запросом поднимаем из БД всё, чего нет в памяти; в сеть идут только оставшиеся даты.
  const notInMemory = unique.filter((date) => DATE_PATTERN.test(date) && !historicalCache.has(date));
  if (notInMemory.length > 0) {
    try {
      const stored = await getStoredRates(notInMemory);
      stored.forEach((rates, date) => rememberHistorical(date, rates));
    } catch (error) {
      logger.warn("Failed to read stored historical exchange rates", error);
    }
  }

  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < unique.length) {
      const date = unique[next++];
      result.set(date, await getUsdRatesForDate(date));
    }
  };
  await Promise.all(Array.from({ length: Math.min(HISTORICAL_CONCURRENCY, unique.length) }, worker));
  return result;
};

// Для аналитики отсутствие курса означает отсутствие результата, а не курс 1:1.
export const convertCurrency = (
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates
): number | null => {
  if (!Number.isFinite(amount)) return null;
  const source = normalizeCurrency(from);
  const target = normalizeCurrency(to);
  if (source === target) return amount;
  const sourceRate = source === "usd" ? 1 : rates[source];
  const targetRate = target === "usd" ? 1 : rates[target];
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 ||
      !Number.isFinite(targetRate) || targetRate <= 0) return null;
  const converted = amount / sourceRate * targetRate;
  return Number.isFinite(converted) ? converted : null;
};

export const convertCurrencyToUsd = (
  amount: number,
  currency: string,
  rates: ExchangeRates
): number => {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  const code = normalizeCurrency(currency);
  if (code === "usd") {
    return amount;
  }
  const rate = rates[code];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing exchange rate for ${currency}`);
  }
  return amount / rate;
};

export const convertUsdToCurrency = (
  amountUsd: number,
  currency: string,
  rates: ExchangeRates
): number => {
  if (!Number.isFinite(amountUsd)) {
    return 0;
  }
  const code = normalizeCurrency(currency);
  if (code === "usd") {
    return amountUsd;
  }
  const rate = rates[code];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing exchange rate for ${currency}`);
  }
  return amountUsd * rate;
};
