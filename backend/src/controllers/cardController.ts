import { Request, Response } from "express";
import * as cardService from "../services/cardService";
import * as cardBalanceService from "../services/cardBalanceService";

type CardBalancePayload = {
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

const normalizeCardBalances = (card: any): Record<string, unknown> => {
  const data = typeof card.toJSON === "function" ? card.toJSON() : card;
  const balances = Array.isArray(data.balances)
    ? data.balances.map((balance: { amount?: unknown }) => ({
        ...balance,
        amount: parseAmount(balance.amount) ?? 0,
      }))
    : [];
  return { ...data, balances };
};

export const getCards = async (req: Request, res: Response) => {
  const cards = await cardService.getCards(req.user!.id);
  res.json(cards.map((card: any) => normalizeCardBalances(card)));
};

export const getCard = async (req: Request, res: Response) => {
  const card = await cardService.getCard(req.params.id, req.user!.id);
  if (!card) return res.status(404).json({ message: "Card not found" });
  res.json(normalizeCardBalances(card));
};

export const createCard = async (req: Request, res: Response) => {
  try {
    const card = await cardService.createCard(req.user!.id, req.body);
    res.status(201).json(card);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateCard = async (req: Request, res: Response) => {
  try {
    const card = await cardService.updateCard(req.params.id, req.user!.id, req.body);
    res.json(card);
  } catch (e: any) {
    const status = e.message === "Card not found" ? 404 : 400;
    res.status(status).json({ message: e.message });
  }
};

export const deleteCard = async (req: Request, res: Response) => {
  try {
    await cardService.deleteCard(req.params.id, req.user!.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const lookupBin = async (req: Request, res: Response) => {
  try {
    const info = await cardService.lookupBin(req.params.bin);
    if (!info) return res.status(404).json({ message: "Not found" });
    res.json(info);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

export const getBalances = async (req: Request, res: Response) => {
  try {
    const card = await cardService.getCard(req.params.id, req.user!.id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const balances = await cardBalanceService.getCardBalancesByCard(
      req.user!.id,
      req.params.id
    );
    const result = balances.map((balance) => ({
      id: balance.id,
      currency: balance.currency,
      amount:
        typeof balance.amount === "string"
          ? parseFloat(balance.amount)
          : balance.amount,
    }));
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ message: "Failed to fetch card balances." });
  }
};

export const setBalances = async (req: Request, res: Response) => {
  try {
    const card = await cardService.getCard(req.params.id, req.user!.id);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const payload = req.body as { balances?: unknown };
    if (!payload || !Array.isArray(payload.balances)) {
      return res.status(400).json({ message: "Balances list required." });
    }

    const normalized = (payload.balances as CardBalancePayload[])
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

    const balances = await cardBalanceService.setCardBalances(
      req.user!.id,
      req.params.id,
      normalized
    );
    const result = balances.map((balance) => ({
      id: balance.id,
      currency: balance.currency,
      amount:
        typeof balance.amount === "string"
          ? parseFloat(balance.amount)
          : balance.amount,
    }));
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ message: "Failed to save card balances." });
  }
};

