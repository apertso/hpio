import axios from "axios";
import logger from "../config/logger";

type ExchangeRates = Record<string, number>;

type ExchangeApiResponse = {
  date?: string;
  usd?: ExchangeRates;
};

const CACHE_DURATION_MS = 1000 * 60 * 60;
let usdRatesCache: { rates: ExchangeRates; updatedAt: number } | null = null;

const normalizeCurrency = (currency: string): string => {
  return currency.trim().toLowerCase();
};

export const getUsdRates = async (): Promise<ExchangeRates> => {
  if (usdRatesCache && Date.now() - usdRatesCache.updatedAt < CACHE_DURATION_MS) {
    return usdRatesCache.rates;
  }

  try {
    const response = await axios.get<ExchangeApiResponse>(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
    );
    const rates = response.data.usd || {};
    const normalizedRates: ExchangeRates = { usd: 1 };

    Object.entries(rates).forEach(([code, value]) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        normalizedRates[normalizeCurrency(code)] = value;
      }
    });

    usdRatesCache = { rates: normalizedRates, updatedAt: Date.now() };
    return normalizedRates;
  } catch (error) {
    logger.error("Failed to fetch exchange rates", error);
    if (usdRatesCache) {
      return usdRatesCache.rates;
    }
    return { usd: 1 };
  }
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
  if (!rate || !Number.isFinite(rate)) {
    logger.warn(`Missing exchange rate for ${currency}, using fallback.`);
    return amount;
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
  if (!rate || !Number.isFinite(rate)) {
    logger.warn(`Missing exchange rate for ${currency}, using fallback.`);
    return amountUsd;
  }
  return amountUsd * rate;
};
