import db from "../models";
import { IncomeInstance } from "../models/Income";
export const createIncome = async (
  userId: string,
  data: any
): Promise<IncomeInstance> => {
  const income = await db.Income.create({ ...data, userId });
  // If linked to a card, we might update balance in future, for now just log
  if (income.cardId) {
     // TODO: Update card balance
  }
  return income;
};

export const getIncomes = async (
  userId: string
): Promise<IncomeInstance[]> => {
  const incomes = await db.Income.findAll({
    where: { userId },
    order: [["date", "DESC"]],
    include: [
      { model: db.TransactionCategory, as: "transactionCategory" },
      { model: db.Card, as: "card" }
    ]
  });
  return incomes;
};

export const updateIncome = async (
  id: string,
  userId: string,
  data: any
): Promise<IncomeInstance | null> => {
  const income = await db.Income.findOne({ where: { id, userId } });
  if (!income) throw new Error("Income not found");

  await income.update(data);

  // Reload with associations
  const updated = await db.Income.findOne({
    where: { id, userId },
    include: [
      { model: db.TransactionCategory, as: "transactionCategory" },
      { model: db.Card, as: "card" }
    ]
  });

  return updated;
};

export const deleteIncome = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const income = await db.Income.findOne({ where: { id, userId } });
  if (!income) throw new Error("Income not found");
  await income.destroy();
  return true;
};

