import { Request, Response } from "express";
import * as cashBalanceService from "../services/cashBalanceService";

type CashBalancePayload = {
  currency?: unknown;
  amount?: unknown;
};

const parseAmount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const getBalances = async (req: Request, res: Response) => {
  try {
    const balances = await cashBalanceService.getCashBalances(req.user!.id);
    const result = balances.map((balance) => ({
      currency: balance.currency,
      amount:
        typeof balance.amount === "string"
          ? parseFloat(balance.amount)
          : balance.amount,
    }));
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ message: "Failed to fetch cash balances." });
  }
};

export const setBalances = async (req: Request, res: Response) => {
  try {
    const payload = req.body as { balances?: unknown };
    if (!payload || !Array.isArray(payload.balances)) {
      return res.status(400).json({ message: "Balances list required." });
    }

    const normalized = (payload.balances as CashBalancePayload[])
      .map((entry) => {
        const currency =
          typeof entry.currency === "string" ? entry.currency.trim() : "";
        const amount = parseAmount(entry.amount);
        if (!currency || amount === null) {
          return null;
        }
        return { currency, amount };
      })
      .filter((entry): entry is { currency: string; amount: number } =>
        Boolean(entry)
      );

    const balances = await cashBalanceService.setCashBalances(
      req.user!.id,
      normalized
    );
    const result = balances.map((balance) => ({
      currency: balance.currency,
      amount:
        typeof balance.amount === "string"
          ? parseFloat(balance.amount)
          : balance.amount,
    }));
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ message: "Failed to save cash balances." });
  }
};
