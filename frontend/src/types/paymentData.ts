import { BuiltinIcon } from "../utils/builtinIcons";

// Интерфейс для данных платежа (должен совпадать с тем, что возвращает бэкенд /api/payments/list)
export interface PaymentData {
  id: string;
  title: string;
  amount: number; // number after conversion
  dueDate: string; // YYYY-MM-DD
  status: "upcoming" | "overdue" | "completed" | "deleted";
  completedAt?: string | null; // Add completedAt property
  seriesId?: string | null; // Link to RecurringSeries
  createdAt: string; // Creation date
  updatedAt: string; // Last update date
  filePath?: string | null; // File path field
  fileName?: string | null; // File name field
  // !!! Icon fields
  builtinIconName?: BuiltinIcon | null; // Use BuiltinIcon type
  category?: {
    id: string;
    name: string;
    builtinIconName?: BuiltinIcon | null;
  } | null; // Can be category object or null
  // Include series data if joined
  series?: {
    id: string;
    title: string;
    amount: number;
    recurrencePattern: "daily" | "weekly" | "monthly" | "yearly";
    recurrenceEndDate?: string | null;
    builtinIconName?: BuiltinIcon | null; // Use BuiltinIcon type
    isActive: boolean;
  } | null;
}
