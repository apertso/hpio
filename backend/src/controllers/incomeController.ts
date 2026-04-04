import { Request, Response } from "express";
import * as incomeService from "../services/incomeService";

export const getIncomes = async (req: Request, res: Response) => {
  const incomes = await incomeService.getIncomes(req.user!.id);
  res.json(incomes);
};

export const createIncome = async (req: Request, res: Response) => {
  try {
    const income = await incomeService.createIncome(req.user!.id, req.body);
    res.status(201).json(income);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const updateIncome = async (req: Request, res: Response) => {
  try {
    const income = await incomeService.updateIncome(
      req.params.id,
      req.user!.id,
      req.body
    );
    res.json(income);
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

export const deleteIncome = async (req: Request, res: Response) => {
  try {
    await incomeService.deleteIncome(req.params.id, req.user!.id);
    res.json({ message: "Deleted" });
  } catch (e: any) {
    res.status(400).json({ message: e.message });
  }
};

