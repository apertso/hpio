import { Request, Response } from "express";
import * as fundsService from "../services/fundsService";

const isValidDateString = (value: unknown): value is string => {
  if (typeof value !== "string") {
    return false;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const summary = await fundsService.getFundsSummary(req.user!.id);
    res.json(summary);
  } catch (error: unknown) {
    res.status(500).json({ message: "Failed to fetch funds summary." });
  }
};

export const getHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      return res.status(400).json({ message: "Invalid date range." });
    }
    const history = await fundsService.getFundsHistory(
      req.user!.id,
      startDate,
      endDate
    );
    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ message: "Failed to fetch funds history." });
  }
};
