import type { TimeRangeOption } from "../components/SegmentedControl";

export interface InsightPeriod {
  startDate: Date;
  endDate: Date;
}

/** Период блока «Наблюдения»: текущая календарная неделя, месяц или год. */
export type InsightRange = "1w" | "1m" | "1y";

export const INSIGHT_RANGES: InsightRange[] = ["1w", "1m", "1y"];

const INSIGHT_RANGE_STORAGE_KEY = "dashboard-insights-range";

/** Сохранённый период наблюдений; по умолчанию — текущий месяц. */
export function getSavedInsightRange(): InsightRange {
  if (typeof window === "undefined") return "1m";
  const saved = localStorage.getItem(INSIGHT_RANGE_STORAGE_KEY);
  return INSIGHT_RANGES.includes(saved as InsightRange) ? (saved as InsightRange) : "1m";
}

export function saveInsightRange(range: InsightRange): void {
  localStorage.setItem(INSIGHT_RANGE_STORAGE_KEY, range);
}

/** Границы текущего календарного периода наблюдений (неделя — с понедельника по воскресенье). */
export function getInsightRangePeriod(range: InsightRange, today = new Date()): InsightPeriod {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (range === "1w") {
    const daysFromMonday = (today.getDay() + 6) % 7;
    const monday = new Date(year, month, today.getDate() - daysFromMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { startDate: monday, endDate: sunday };
  }
  if (range === "1y") {
    return { startDate: new Date(year, 0, 1), endDate: new Date(year, 11, 31) };
  }
  return { startDate: new Date(year, month, 1), endDate: new Date(year, month + 1, 0) };
}

export function getPreviousInsightPeriod(
  timeRange: TimeRangeOption,
  startDate: Date,
  endDate: Date,
): InsightPeriod | null {
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  if (timeRange === "1w") {
    return {
      startDate: new Date(year, month, startDate.getDate() - 7),
      endDate: new Date(year, month, startDate.getDate() - 1),
    };
  }
  const isWholeYear = startDate.getDate() === 1 && month === 0 &&
    endDate.getFullYear() === year && endDate.getMonth() === 11 && endDate.getDate() === 31;
  const isWholeMonth = startDate.getDate() === 1 && endDate.getFullYear() === year &&
    endDate.getMonth() === month && endDate.getDate() === new Date(year, month + 1, 0).getDate();
  if (timeRange === "1y" || (timeRange === "custom" && isWholeYear)) {
    return { startDate: new Date(year - 1, 0, 1), endDate: new Date(year - 1, 11, 31) };
  }
  if (timeRange === "1m" || (timeRange === "custom" && isWholeMonth)) {
    return { startDate: new Date(year, month - 1, 1), endDate: new Date(year, month, 0) };
  }
  return null;
}

export function getInsightDayCount(startDate: Date, endDate: Date, today = new Date()): number {
  // Будущие дни не занижают средние расходы текущего периода; UTC исключает влияние перехода на летнее время.
  const lastDay = endDate < today ? endDate : today;
  const calendarDay = (date: Date): number => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.round((calendarDay(lastDay) - calendarDay(startDate)) / 86400000) + 1);
}
