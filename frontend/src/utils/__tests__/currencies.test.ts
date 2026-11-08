import { describe, expect, it } from "vitest";
import { formatMoney } from "../currencies";

describe("formatMoney", () => {
  it("uses the given currency instead of a fixed ruble sign", () => {
    expect(formatMoney(10, "ru-RU", "USD")).toContain("$");
    expect(formatMoney(10, "ru-RU")).toMatch(/₽|RUB/);
  });
});
