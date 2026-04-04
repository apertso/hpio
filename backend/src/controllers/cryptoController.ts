import { Request, Response } from "express";
import * as cryptoService from "../services/cryptoService";
import * as cryptoBalanceService from "../services/cryptoBalanceService";

type CryptoBalance = {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  walletAddress?: string;
  quantity: number | string;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const getTop = async (req: Request, res: Response) => {
  try {
    const data = await cryptoService.getTopCoins();
    res.json(data);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

export const search = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.status(400).json({ message: "Query required" });
    const data = await cryptoService.searchCoins(query);
    res.json(data);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

export const getBalances = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const balances = (await cryptoBalanceService.getBalances(
      userId
    )) as CryptoBalance[];

    if (!balances || balances.length === 0) {
      return res.json([]);
    }

    const coinIds = balances.map((balance) => balance.coinId);
    // Default to RUB given the Russian UI context
    const currency = ((req.query.currency as string) || "rub").toLowerCase();

    let prices: Record<string, Record<string, number>> = {};
    try {
      const fetchedPrices = await cryptoService.getPrices(coinIds, currency);
      if (typeof fetchedPrices === "object" && fetchedPrices !== null) {
        prices = fetchedPrices as Record<string, Record<string, number>>;
      }
    } catch (error) {
      console.error("Error fetching prices in controller:", error);
    }

    const result = balances.map((balance) => {
      const priceData = prices[balance.coinId];
      // Check if priceData exists and has the currency key
      const currentPrice = priceData?.[currency] ?? 0;
      const quantity =
        typeof balance.quantity === "string"
          ? parseFloat(balance.quantity)
          : balance.quantity;
      const totalValue = currentPrice * quantity;
      return {
        id: balance.id,
        coinId: balance.coinId,
        symbol: balance.symbol,
        name: balance.name,
        walletAddress: balance.walletAddress,
        quantity,
        currentPrice,
        totalValue,
        currency,
      };
    });

    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

export const addBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { coinId, symbol, name, quantity, walletAddress } = req.body;

    if (!coinId || !symbol || !name || quantity === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newBalance = await cryptoBalanceService.addBalance(userId, {
      coinId,
      symbol,
      name,
      quantity,
      walletAddress,
    });

    res.status(201).json(newBalance);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

export const updateBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { quantity, walletAddress } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ message: "Quantity required" });
    }

    const balance = await cryptoBalanceService.updateBalance(
      userId,
      id,
      quantity,
      walletAddress
    );

    if (!balance) {
      return res.status(404).json({ message: "Balance not found" });
    }

    res.json(balance);
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

export const deleteBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await cryptoBalanceService.deleteBalance(userId, id);

    if (!deleted) {
      return res.status(404).json({ message: "Balance not found" });
    }

    res.json({ message: "Balance deleted" });
  } catch (error: unknown) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};
