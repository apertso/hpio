import { Op } from "sequelize";
import db from "../models";
import logger from "../config/logger";

type ExchangeRates = Record<string, number>;

// Единственное место доступа к модели ExchangeRateSnapshot (см. правило service-model в AGENTS.md).

const parseRates = (value: string): ExchangeRates | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const rates: ExchangeRates = {};
    for (const [code, rate] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) rates[code] = rate;
    }
    return Object.keys(rates).length > 1 ? rates : null;
  } catch {
    return null;
  }
};

/** Читает сохранённые снимки для набора дат; повреждённые записи пропускаются. */
export const getStoredRates = async (dates: string[]): Promise<Map<string, ExchangeRates>> => {
  const result = new Map<string, ExchangeRates>();
  if (dates.length === 0) return result;
  const rows = await db.ExchangeRateSnapshot.findAll({
    where: { rateDate: { [Op.in]: dates } },
  });
  for (const row of rows) {
    const rates = parseRates(row.rates);
    if (rates) result.set(String(row.rateDate), rates);
  }
  return result;
};

/** Последний сохранённый снимок не позже указанной даты — запасной вариант, когда провайдер недоступен. */
export const getLatestStoredRates = async (
  notAfter: string
): Promise<{ rateDate: string; rates: ExchangeRates } | null> => {
  const row = await db.ExchangeRateSnapshot.findOne({
    where: { rateDate: { [Op.lte]: notAfter } },
    order: [["rateDate", "DESC"]],
  });
  if (!row) return null;
  const rates = parseRates(row.rates);
  return rates ? { rateDate: String(row.rateDate), rates } : null;
};

/** Сохраняет снимок; повторная запись той же даты безопасна. */
export const storeRates = async (rateDate: string, rates: ExchangeRates): Promise<void> => {
  try {
    await db.ExchangeRateSnapshot.upsert({ rateDate, rates: JSON.stringify(rates) });
  } catch (error) {
    logger.warn(`Failed to store exchange rates for ${rateDate}`, error);
  }
};
