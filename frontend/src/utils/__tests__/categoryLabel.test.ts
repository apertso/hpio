import { describe, expect, it } from "vitest";
import { localizedCategoryName } from "../categoryLabel";

describe("localizedCategoryName", () => {
  const category = { name: "Продукты", nameEn: "Groceries" };

  it("returns the English name when the language is English", () => {
    expect(localizedCategoryName(category, "en")).toBe("Groceries");
  });

  it("returns the Russian name when the language is Russian", () => {
    expect(localizedCategoryName(category, "ru")).toBe("Продукты");
  });

  it("translates the fallback label when an English name is missing", () => {
    expect(localizedCategoryName({ name: "Без категории" }, "en")).toBe(
      "No category"
    );
  });
});
