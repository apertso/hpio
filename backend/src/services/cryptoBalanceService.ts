import db from "../models";
import { CryptoBalanceInstance } from "../models/CryptoBalance";

export interface CryptoBalanceInput {
  coinId: string;
  symbol: string;
  name: string;
  walletAddress?: string;
  quantity: number;
}

export const getBalances = async (
  userId: string
): Promise<CryptoBalanceInstance[]> => {
  return await db.CryptoBalance.findAll({ where: { userId } });
};

export const addBalance = async (
  userId: string,
  data: CryptoBalanceInput
): Promise<CryptoBalanceInstance> => {
  return await db.CryptoBalance.create({
    userId,
    coinId: data.coinId,
    symbol: data.symbol,
    name: data.name,
    walletAddress: data.walletAddress,
    quantity: data.quantity,
  });
};

export const updateBalance = async (
  userId: string,
  id: string,
  quantity: number,
  walletAddress?: string
): Promise<CryptoBalanceInstance | null> => {
  const balance = await db.CryptoBalance.findOne({
    where: { id, userId },
  });

  if (!balance) {
    return null;
  }

  balance.quantity = quantity;
  if (walletAddress !== undefined) {
    balance.walletAddress = walletAddress;
  }
  await balance.save();
  return balance;
};

export const deleteBalance = async (
  userId: string,
  id: string
): Promise<boolean> => {
  const deleted = await db.CryptoBalance.destroy({
    where: { id, userId },
  });
  return deleted > 0;
};
