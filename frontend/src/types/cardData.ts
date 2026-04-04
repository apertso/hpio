export interface CardData {
  id: string;
  name: string;
  pan?: string | null;
  bankName?: string | null;
  country?: string | null;
  currency: string;
  balance: number;
  balances?: CardBalanceData[];
  type?: string | null;
  vendor?: string | null;
  level?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardBalanceData {
  id?: string;
  currency: string;
  amount: number;
}

export interface BinInfo {
  number?: string;
  country?: string;
  vendor?: string;
  type?: string;
  level?: string;
  bank_name?: string;
}
