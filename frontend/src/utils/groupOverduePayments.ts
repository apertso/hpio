import { PaymentData } from "../types/paymentData";
import { parseCalendarDate } from "./dateUtils";

/**
 * Строка списка платежей: обычный платеж или несколько пропущенных периодов одной серии.
 */
export interface PaymentRowItem {
  key: string;
  /** Платеж, с которым работают действия строки: самый ранний реальный экземпляр */
  payment: PaymentData;
  /** Все платежи строки по возрастанию срока; больше одного — сгруппированная серия */
  occurrences: PaymentData[];
}

const byDueDate = (a: PaymentData, b: PaymentData): number =>
  parseCalendarDate(a.dueDate).getTime() - parseCalendarDate(b.dueDate).getTime();

/**
 * Собирает просроченные платежи одной серии в одну строку.
 * У серии в БД хранится только самый старый пропущенный платеж, остальные
 * пропущенные периоды приходят виртуальными — вместе они показываются как «×N».
 * Порядок строк сохраняется по первому вхождению.
 */
export const groupOverdueBySeries = (payments: PaymentData[]): PaymentRowItem[] => {
  const items: PaymentRowItem[] = [];
  const bySeries = new Map<string, PaymentRowItem>();

  for (const payment of payments) {
    const seriesId = payment.seriesId;
    if (!seriesId) {
      items.push({ key: payment.id, payment, occurrences: [payment] });
      continue;
    }
    const existing = bySeries.get(seriesId);
    if (existing) {
      existing.occurrences.push(payment);
      continue;
    }
    const item: PaymentRowItem = { key: `series:${seriesId}`, payment, occurrences: [payment] };
    bySeries.set(seriesId, item);
    items.push(item);
  }

  for (const item of bySeries.values()) {
    if (item.occurrences.length < 2) {
      item.key = item.payment.id;
      continue;
    }
    item.occurrences.sort(byDueDate);
    item.payment = item.occurrences.find((p) => !p.isVirtual) ?? item.occurrences[0];
  }

  return items;
};

/**
 * Ссылка на форму «Оплатить одним платежом»: редактирование реального платежа серии
 * с суммой всех пропущенных периодов. Возвращает null, если реального платежа нет.
 */
export const buildMergeOverduePath = (occurrences: PaymentData[]): string | null => {
  const sorted = [...occurrences].sort(byDueDate);
  const payment = sorted.find((p) => !p.isVirtual);
  const last = sorted[sorted.length - 1];
  if (!payment || !last) return null;
  const total = sorted.reduce((sum, p) => sum + Number(p.amount), 0);
  const params = new URLSearchParams({
    mergeUntil: last.dueDate.slice(0, 10),
    mergeCount: String(sorted.length),
    mergeTotal: String(Math.round(total * 100) / 100),
  });
  return `/payments/edit/${payment.id}?${params.toString()}`;
};
