import db from "../models";
import { CardBalanceInstance } from "../models/CardBalance";

export interface CardBalanceInput {
  currency: string;
  amount: number;
}

const normalizeCurrency = (currency: string): string => {
  return currency.trim().toUpperCase();
};

const normalizeAmount = (amount: number): number => {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return amount;
};

const normalizeBalances = (
  balances: CardBalanceInput[]
): CardBalanceInput[] => {
  const byCurrency = new Map<string, CardBalanceInput>();
  balances.forEach((balance) => {
    const currency = normalizeCurrency(balance.currency);
    if (!currency) {
      return;
    }
    byCurrency.set(currency, {
      currency,
      amount: normalizeAmount(balance.amount),
    });
  });
  return Array.from(byCurrency.values());
};

export const getCardBalancesByCard = async (
  userId: string,
  cardId: string
): Promise<CardBalanceInstance[]> => {
  return await db.CardBalance.findAll({
    where: { userId, cardId },
    order: [["currency", "ASC"]],
  });
};

export const getCardBalancesByUser = async (
  userId: string
): Promise<CardBalanceInstance[]> => {
  return await db.CardBalance.findAll({
    where: { userId },
    order: [["cardId", "ASC"], ["currency", "ASC"]],
  });
};

export const setCardBalances = async (
  userId: string,
  cardId: string,
  balances: CardBalanceInput[]
): Promise<CardBalanceInstance[]> => {
  const normalizedBalances = normalizeBalances(balances);

  await db.sequelize.transaction(async (transaction) => {
    const existingBalances = await db.CardBalance.findAll({
      where: { userId, cardId },
      transaction,
    });
    const existingByCurrency = new Map(
      existingBalances.map((balance) => [balance.currency, balance])
    );

    const incomingCurrencies = new Set<string>();

    for (const balance of normalizedBalances) {
      incomingCurrencies.add(balance.currency);
      const existing = existingByCurrency.get(balance.currency);
      if (existing) {
        await existing.update(
          { amount: balance.amount },
          { transaction }
        );
      } else {
        await db.CardBalance.create(
          {
            userId,
            cardId,
            currency: balance.currency,
            amount: balance.amount,
          },
          { transaction }
        );
      }
    }

    for (const existing of existingBalances) {
      if (!incomingCurrencies.has(existing.currency)) {
        await existing.destroy({ transaction });
      }
    }
  });

  return await getCardBalancesByCard(userId, cardId);
};
