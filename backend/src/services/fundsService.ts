import logger from "../config/logger";
import { addDays } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";
import { CardInstance } from "../models/Card";
import { CardBalanceInstance } from "../models/CardBalance";
import { CashBalanceInstance } from "../models/CashBalance";
import { CryptoBalanceInstance } from "../models/CryptoBalance";
import { UserInstance } from "../models/User";
import * as authService from "./authService";
import * as cardBalanceService from "./cardBalanceService";
import * as cardService from "./cardService";
import * as cashBalanceService from "./cashBalanceService";
import * as cryptoBalanceService from "./cryptoBalanceService";
import * as cryptoService from "./cryptoService";
import * as fundSnapshotService from "./fundSnapshotService";
import {
  convertCurrencyToUsd,
  convertUsdToCurrency,
  ExchangeRates,
  ExchangeRatesUnavailableError,
  getUsdRates,
  getUsdRatesForDates,
} from "./exchangeRateService";

// Сколько часов после локальной полуночи можно догонять пропущенный снимок (например, при недоступных курсах).
const SNAPSHOT_CATCH_UP_HOURS = 6;
// Последняя дата, за которую снимок пользователя точно есть; избавляет от лишних запросов к БД каждую минуту.
const snapshotDoneDateByUser = new Map<string, string>();

export interface FundsSummary {
  totalAmount: number;
  currency: string;
  changeAmount: number | null;
}

export interface FundsHistoryPoint {
  date: string;
  totalAmount: number;
}

const parseAmount = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const resolvePreferredCurrency = (user: UserInstance): string => {
  return (user.preferredCurrency || "RUB").toUpperCase();
};

const resolveUserTimezone = (user: UserInstance): string => {
  return user.timezone || "UTC";
};

const formatLocalDate = (date: Date, timezone: string): string => {
  return format(toZonedTime(date, timezone), "yyyy-MM-dd");
};

const calculateTotalUsd = async (
  userId: string,
  rates: Record<string, number>
): Promise<number> => {
  const [cards, cardBalances, cashBalances, cryptoBalances] = await Promise.all([
    cardService.getCards(userId),
    cardBalanceService.getCardBalancesByUser(userId),
    cashBalanceService.getCashBalances(userId),
    cryptoBalanceService.getBalances(userId),
  ]);

  const balancesByCardId = new Map<string, CardBalanceInstance[]>();
  (cardBalances as CardBalanceInstance[]).forEach((balance) => {
    const existing = balancesByCardId.get(balance.cardId) || [];
    existing.push(balance);
    balancesByCardId.set(balance.cardId, existing);
  });

  const cardTotalUsd = (cards as CardInstance[]).reduce((sum, card) => {
    const balances = balancesByCardId.get(card.id) || [];
    if (balances.length > 0) {
      return (
        sum +
        balances.reduce((balanceSum, balance) => {
          const amount = parseAmount(balance.amount);
          if (!balance.currency) {
            return balanceSum + amount;
          }
          return (
            balanceSum + convertCurrencyToUsd(amount, balance.currency, rates)
          );
        }, 0)
      );
    }

    const amount = parseAmount(card.balance);
    if (!card.currency) {
      return sum + amount;
    }
    return sum + convertCurrencyToUsd(amount, card.currency, rates);
  }, 0);

  const cashTotalUsd = (cashBalances as CashBalanceInstance[]).reduce(
    (sum, balance) => {
      const amount = parseAmount(balance.amount);
      if (!balance.currency) {
        return sum + amount;
      }
      return sum + convertCurrencyToUsd(amount, balance.currency, rates);
    },
    0
  );

  const cryptoBalancesList = cryptoBalances as CryptoBalanceInstance[];
  const coinIds = cryptoBalancesList.map((balance) => balance.coinId);
  let cryptoTotalUsd = 0;

  if (coinIds.length > 0) {
    const prices = await cryptoService.getPrices(coinIds, "usd");
    cryptoTotalUsd = cryptoBalancesList.reduce((sum, balance) => {
      const quantity = parseAmount(balance.quantity);
      const priceData = prices[balance.coinId];
      const currentPrice =
        priceData && typeof priceData.usd === "number" ? priceData.usd : 0;
      return sum + quantity * currentPrice;
    }, 0);
  }

  const totalUsd = cardTotalUsd + cashTotalUsd + cryptoTotalUsd;
  return Number(totalUsd.toFixed(2));
};

export const getFundsSummary = async (
  userId: string
): Promise<FundsSummary> => {
  const user = (await authService.getUserProfile(userId)) as UserInstance;
  const preferredCurrency = resolvePreferredCurrency(user);
  const timezone = resolveUserTimezone(user);
  const rates = await getUsdRates();
  const totalUsd = await calculateTotalUsd(userId, rates);
  const totalAmount = convertUsdToCurrency(totalUsd, preferredCurrency, rates);

  const now = new Date();
  const localYesterday = formatLocalDate(addDays(now, -1), timezone);
  const snapshot = await fundSnapshotService.getSnapshotByDate(
    userId,
    localYesterday
  );

  let changeAmount: number | null = null;
  if (snapshot) {
    const previousAmount = convertUsdToCurrency(
      parseAmount(snapshot.totalUsd),
      preferredCurrency,
      rates
    );
    changeAmount = Number((totalAmount - previousAmount).toFixed(2));
  }

  return {
    totalAmount: Number(totalAmount.toFixed(2)),
    currency: preferredCurrency,
    changeAmount,
  };
};

export const getFundsHistory = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<FundsHistoryPoint[]> => {
  const user = (await authService.getUserProfile(userId)) as UserInstance;
  const preferredCurrency = resolvePreferredCurrency(user);
  const snapshots = await fundSnapshotService.getSnapshots(
    userId,
    startDate,
    endDate
  );
  if (snapshots.length === 0) return [];

  // Снимок хранится в USD; переводим его по курсу на дату снимка, текущий курс — только запасной вариант.
  const ratesByDate = await getUsdRatesForDates(
    snapshots.map((snapshot) => snapshot.snapshotDate)
  );
  let currentRates: ExchangeRates | null | undefined;
  const resolveCurrentRates = async (): Promise<ExchangeRates | null> => {
    if (currentRates === undefined) {
      currentRates = await getUsdRates().catch(() => null);
    }
    return currentRates;
  };

  const points: FundsHistoryPoint[] = [];
  for (const snapshot of snapshots) {
    const rates = ratesByDate.get(snapshot.snapshotDate) ?? (await resolveCurrentRates());
    if (!rates) {
      logger.warn(`No exchange rates for funds snapshot ${snapshot.snapshotDate}, skipping point`);
      continue;
    }
    try {
      points.push({
        date: snapshot.snapshotDate,
        totalAmount: Number(
          convertUsdToCurrency(parseAmount(snapshot.totalUsd), preferredCurrency, rates).toFixed(2)
        ),
      });
    } catch (error) {
      logger.warn(`Failed to convert funds snapshot ${snapshot.snapshotDate}`, error);
    }
  }
  return points;
};

export const createDailySnapshotForUser = async (
  userId: string
): Promise<boolean> => {
  const user = (await authService.getUserProfile(userId)) as UserInstance;
  const timezone = resolveUserTimezone(user);
  const localToday = formatLocalDate(new Date(), timezone);

  const existing = await fundSnapshotService.getSnapshotByDate(
    userId,
    localToday
  );
  if (existing) {
    snapshotDoneDateByUser.set(userId, localToday);
    return false;
  }

  // Если курсов нет, ошибка всплывает наверх, и задача повторит попытку на следующей минуте.
  const rates = await getUsdRates();
  const totalUsd = await calculateTotalUsd(userId, rates);
  await fundSnapshotService.createSnapshot(userId, localToday, totalUsd);
  snapshotDoneDateByUser.set(userId, localToday);
  return true;
};

export const createDailySnapshots = async (): Promise<number> => {
  const users = await authService.getAllUsers();
  const now = new Date();
  let ratesUnavailableCount = 0;
  const results = await Promise.all(
    users.map(async (user) => {
      try {
        const timezone = resolveUserTimezone(user);
        const localTime = toZonedTime(now, timezone);
        // Не только ровно в 00:00: неудачная попытка повторяется, пока не истечёт окно догоняния.
        if (localTime.getHours() >= SNAPSHOT_CATCH_UP_HOURS) {
          return false;
        }
        if (snapshotDoneDateByUser.get(user.id) === formatLocalDate(now, timezone)) {
          return false;
        }
        return await createDailySnapshotForUser(user.id);
      } catch (error) {
        if (error instanceof ExchangeRatesUnavailableError) {
          ratesUnavailableCount += 1;
        } else {
          logger.error(`Failed to create funds snapshot for user ${user.id}`, error);
        }
        return false;
      }
    })
  );

  if (ratesUnavailableCount > 0) {
    logger.warn(
      `Exchange rates unavailable, postponed ${ratesUnavailableCount} funds snapshots until next run`
    );
  }

  return results.filter(Boolean).length;
};
