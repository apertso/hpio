import db from "../models";
import { CashBalanceInstance } from "../models/CashBalance";

export interface CashBalanceInput {
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

const normalizeBalances = (balances: CashBalanceInput[]): CashBalanceInput[] => {
  const byCurrency = new Map<string, CashBalanceInput>();
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

export const getCashBalances = async (
  userId: string
): Promise<CashBalanceInstance[]> => {
  return await db.CashBalance.findAll({
    where: { userId },
    order: [["currency", "ASC"]],
  });
};

export const setCashBalances = async (
  userId: string,
  balances: CashBalanceInput[]
): Promise<CashBalanceInstance[]> => {
  const normalizedBalances = normalizeBalances(balances);

  await db.sequelize.transaction(async (transaction) => {
    const existingBalances = await db.CashBalance.findAll({
      where: { userId },
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
        await db.CashBalance.create(
          {
            userId,
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

  return await getCashBalances(userId);
};
