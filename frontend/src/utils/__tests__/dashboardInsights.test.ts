import { describe, expect, it } from "vitest";
import { getInsightDayCount, getPreviousInsightPeriod } from "../dashboardInsights";

describe("периоды наблюдений", () => {
  it("выбирает предыдущую календарную неделю при переходе через Новый год", () => {
    expect(getPreviousInsightPeriod("1w", new Date(2026, 11, 28), new Date(2027, 0, 1))).toEqual({
      startDate: new Date(2026, 11, 21), endDate: new Date(2026, 11, 27),
    });
  });

  it("сравнивает январь с декабрём, а март с високосным февралём", () => {
    expect(getPreviousInsightPeriod("1m", new Date(2026, 0, 1), new Date(2026, 0, 31))).toEqual({
      startDate: new Date(2025, 11, 1), endDate: new Date(2025, 11, 31),
    });
    expect(getPreviousInsightPeriod("1m", new Date(2024, 2, 1), new Date(2024, 2, 31))?.endDate).toEqual(new Date(2024, 1, 29));
  });

  it("выбирает весь предыдущий год", () => {
    expect(getPreviousInsightPeriod("1y", new Date(2026, 0, 1), new Date(2026, 11, 31))).toEqual({
      startDate: new Date(2025, 0, 1), endDate: new Date(2025, 11, 31),
    });
  });

  it("распознаёт календарный месяц и год из календаря", () => {
    for (const range of ["1m", "1y"] as const) {
      const start = new Date(2026, 0, 1);
      const end = range === "1m" ? new Date(2026, 0, 31) : new Date(2026, 11, 31);
      expect(getPreviousInsightPeriod("custom", start, end)).toEqual(getPreviousInsightPeriod(range, start, end));
    }
  });

  it("не сравнивает день и произвольный интервал", () => {
    expect(getPreviousInsightPeriod("1d", new Date(2026, 10, 20), new Date(2026, 10, 20))).toBeNull();
    expect(getPreviousInsightPeriod("custom", new Date(2026, 10, 4), new Date(2026, 10, 19))).toBeNull();
  });

  it("учитывает дни без расходов и не делит на будущие дни", () => {
    expect(getInsightDayCount(new Date(2026, 10, 1), new Date(2026, 10, 30), new Date(2026, 10, 20))).toBe(20);
    expect(getInsightDayCount(new Date(2024, 1, 1), new Date(2024, 1, 29), new Date(2026, 10, 20))).toBe(29);
    expect(getInsightDayCount(new Date(2026, 10, 20), new Date(2026, 10, 20), new Date(2026, 10, 20))).toBe(1);
  });
});
