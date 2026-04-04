import { CardData } from "./cardData";

export interface IncomeData {
  id: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  date: string;
  method: "cash" | "card" | "transfer" | "other";
  comment?: string | null;
  transactionCategory?: {
    id: string;
    name: string;
    builtinIconName?: string | null;
  } | null;
  card?: CardData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeData {
  amount: number;
  currency: string;
  date: string;
  method: string;
  categoryId?: string | null;
  cardId?: string | null;
  comment?: string;
}

