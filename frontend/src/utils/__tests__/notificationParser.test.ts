import { describe, it, expect, vi } from "vitest";
import {
  validateRaiffeisenTitle,
  parseRaiffeisenNotification,
  parseNotification,
} from "../notificationParser";

// Mock console methods to avoid test output pollution
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("validateRaiffeisenTitle", () => {
  it("should validate correct Raiffeisen title format", () => {
    expect(validateRaiffeisenTitle("Заплатили картой *1234")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили картой *5678")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили картой *0000")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили картой *9999")).toBe(true);

    // New format with "со счета"
    expect(validateRaiffeisenTitle("Заплатили со счета *1234")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили со счета *5678")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили со счета *0000")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили со счета *9999")).toBe(true);

    // Format with extra spaces before asterisk (actual notification format)
    expect(validateRaiffeisenTitle("Заплатили картой  *1974")).toBe(true);
    expect(validateRaiffeisenTitle("Заплатили со счета  *1974")).toBe(true);
  });

  it("should validate case insensitive titles", () => {
    expect(validateRaiffeisenTitle("заплаТили картой *1234")).toBe(true);
    expect(validateRaiffeisenTitle("ЗАПЛАТИЛИ КАРТОЙ *1234")).toBe(true);
    expect(validateRaiffeisenTitle("ЗаПлАтИлИ КаРтОй *1234")).toBe(true);

    // New format with "со счета" - case insensitive
    expect(validateRaiffeisenTitle("заплаТили со счета *1234")).toBe(true);
    expect(validateRaiffeisenTitle("ЗАПЛАТИЛИ СО СЧЕТА *1234")).toBe(true);
    expect(validateRaiffeisenTitle("ЗаПлАтИлИ Со СчЕтА *1234")).toBe(true);
  });

  it("should reject invalid title formats", () => {
    expect(validateRaiffeisenTitle("")).toBe(false);
    expect(validateRaiffeisenTitle("Some other title")).toBe(false);
    expect(validateRaiffeisenTitle("Заплатили картой")).toBe(false); // missing asterisk and digits
    expect(validateRaiffeisenTitle("Заплатили картой *")).toBe(false); // missing digits
    expect(validateRaiffeisenTitle("Заплатили картой *12")).toBe(false); // only 2 digits
    expect(validateRaiffeisenTitle("Заплатили картой *12345")).toBe(false); // 5 digits
    expect(validateRaiffeisenTitle("Заплатили картой ****")).toBe(false); // asterisks instead of digits
    expect(validateRaiffeisenTitle("Заплатили картой *ABCD")).toBe(false); // letters instead of digits
    expect(validateRaiffeisenTitle("Оплатили картой *1234")).toBe(false); // different verb
  });
});

describe("parseRaiffeisenNotification", () => {
  it("should parse standard notification format", () => {
    const text = "− 1 000.00 ₽ в Магазин продуктов.";
    const result = parseRaiffeisenNotification(text);

    expect(result).toEqual({
      merchantName: "Магазин продуктов",
      amount: 1000.0,
    });
  });

  it("should parse notifications with specific Unicode minus sign and additional text", () => {
    const text = "− 689.68 ₽ в Пятерочка. Теперь на карте 34 574.90 ₽";
    const result = parseRaiffeisenNotification(text);

    expect(result).toEqual({
      merchantName: "Пятерочка",
      amount: 689.68,
    });
  });

  it("should parse notifications with regular hyphen instead of Unicode minus", () => {
    const text = "- 689.68 ₽ в Пятерочка.";
    const result = parseRaiffeisenNotification(text);

    expect(result).toEqual({
      merchantName: "Пятерочка",
      amount: 689.68,
    });
  });

  it("should parse notifications with regular hyphen without space after minus", () => {
    const text = "-689.68 ₽ в Пятерочка.";
    const result = parseRaiffeisenNotification(text);

    expect(result).toEqual({
      merchantName: "Пятерочка",
      amount: 689.68,
    });
  });

  it("should parse notifications with Unicode minus without space after minus", () => {
    const text = "−689.68 ₽ в Пятерочка.";
    const result = parseRaiffeisenNotification(text);

    expect(result).toEqual({
      merchantName: "Пятерочка",
      amount: 689.68,
    });
  });

  it("should parse notifications with different amount formats", () => {
    // Standard format with spaces
    expect(parseRaiffeisenNotification("− 1 000.50 ₽ в Магазин.")).toEqual({
      merchantName: "Магазин",
      amount: 1000.5,
    });

    // No spaces in amount
    expect(parseRaiffeisenNotification("− 1000.00 ₽ в Магазин.")).toEqual({
      merchantName: "Магазин",
      amount: 1000.0,
    });

    // Large amounts with multiple spaces
    expect(
      parseRaiffeisenNotification("− 10 000 500.75 ₽ в Большой магазин.")
    ).toEqual({
      merchantName: "Большой магазин",
      amount: 10000500.75,
    });

    // Small amounts
    expect(parseRaiffeisenNotification("− 0.01 ₽ в Мини-магазин.")).toEqual({
      merchantName: "Мини-магазин",
      amount: 0.01,
    });

    // Round amounts (with .00)
    expect(parseRaiffeisenNotification("− 500.00 ₽ в Магазин.")).toEqual({
      merchantName: "Магазин",
      amount: 500,
    });
  });

  it("should handle Unicode spaces in amounts", () => {
    // Non-breaking space (U+00A0)
    expect(parseRaiffeisenNotification("− 1 000.00 ₽ в Магазин.")).toEqual({
      merchantName: "Магазин",
      amount: 1000.0,
    });

    // Narrow non-breaking space (U+202F)
    expect(parseRaiffeisenNotification("− 1 000.00 ₽ в Магазин.")).toEqual({
      merchantName: "Магазин",
      amount: 1000.0,
    });
  });

  it("should handle different merchant name formats", () => {
    // With period at end
    expect(parseRaiffeisenNotification("− 100.00 ₽ в Кафе.")).toEqual({
      merchantName: "Кафе",
      amount: 100.0,
    });

    // Without period at end
    expect(parseRaiffeisenNotification("− 100.00 ₽ в Кафе")).toEqual({
      merchantName: "Кафе",
      amount: 100.0,
    });

    // Merchant name with spaces
    expect(
      parseRaiffeisenNotification("− 50.00 ₽ в Большое кафе с видом на реку.")
    ).toEqual({
      merchantName: "Большое кафе с видом на реку",
      amount: 50.0,
    });

    // Merchant name with special characters
    expect(parseRaiffeisenNotification("− 25.99 ₽ в McDonald's.")).toEqual({
      merchantName: "McDonald's",
      amount: 25.99,
    });
  });

  it("should return null for invalid formats", () => {
    // No match at all
    expect(parseRaiffeisenNotification("Some random text")).toBe(null);

    // Missing amount
    expect(parseRaiffeisenNotification("в Магазин.")).toBe(null);

    // Missing merchant
    expect(parseRaiffeisenNotification("− 100.00 ₽")).toBe(null);

    // Invalid amount format
    expect(parseRaiffeisenNotification("− abc.00 ₽ в Магазин.")).toBe(null);
    expect(parseRaiffeisenNotification("− 100. ₽ в Магазин.")).toBe(null); // missing kopecks
    expect(parseRaiffeisenNotification("− 100 ₽ в Магазин.")).toBe(null); // missing decimal point

    // Zero amounts are invalid (amount <= 0 check)
    expect(parseRaiffeisenNotification("− 0.00 ₽ в Магазин.")).toBe(null);
  });

  it("should handle edge cases gracefully", () => {
    // Empty string
    expect(parseRaiffeisenNotification("")).toBe(null);

    // Only whitespace
    expect(parseRaiffeisenNotification("   ")).toBe(null);

    // Very long merchant name
    const longMerchant = "A".repeat(1000);
    expect(
      parseRaiffeisenNotification(`− 100.00 ₽ в ${longMerchant}.`)
    ).toEqual({
      merchantName: longMerchant,
      amount: 100.0,
    });
  });

  it("should log errors for unexpected parsing issues", () => {
    // This would be hard to trigger with current implementation
    // but we can test that console.error is not called for normal cases
    parseRaiffeisenNotification("− 100.00 ₽ в Магазин.");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe("parseNotification", () => {
  it("should parse Raiffeisen notifications correctly", () => {
    const result = parseNotification(
      "ru.raiffeisennews",
      "− 1 000.00 ₽ в Магазин продуктов.",
      "Заплатили картой *1234"
    );

    expect(result).toEqual({
      merchantName: "Магазин продуктов",
      amount: 1000.0,
    });
  });

  it("should parse Raiffeisen notifications with specific Unicode minus and additional text", () => {
    const result = parseNotification(
      "ru.raiffeisennews",
      "− 689.68 ₽ в Пятерочка. Теперь на карте 34 574.90 ₽",
      "Заплатили картой *1234"
    );

    expect(result).toEqual({
      merchantName: "Пятерочка",
      amount: 689.68,
    });
  });

  it("should parse Raiffeisen notifications with 'со счета' title and regular hyphen", () => {
    const result = parseNotification(
      "ru.raiffeisennews",
      "- 340.00 ₽ в t2",
      "Заплатили со счета *1234"
    );

    expect(result).toEqual({
      merchantName: "t2",
      amount: 340.0,
    });
  });

  it("should parse Raiffeisen notifications with extra spaces in title and balance info", () => {
    const result = parseNotification(
      "ru.raiffeisennews",
      "− 1 136.96 ₽ в КуулКлевер. Теперь на карте 22 967.60 ₽",
      "Заплатили картой  *1974"
    );

    expect(result).toEqual({
      merchantName: "КуулКлевер",
      amount: 1136.96,
    });
  });

  it("should validate title for Raiffeisen notifications", () => {
    // Valid title
    const result1 = parseNotification(
      "ru.raiffeisennews",
      "− 100.00 ₽ в Магазин.",
      "Заплатили картой *1234"
    );
    expect(result1).toEqual({
      merchantName: "Магазин",
      amount: 100.0,
    });

    // Invalid title
    const result2 = parseNotification(
      "ru.raiffeisennews",
      "− 100.00 ₽ в Магазин.",
      "Invalid title"
    );
    expect(result2).toBe(null);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Raiffeisen notification title:",
      "Invalid title"
    );
  });

  it("should return null for unsupported package names", () => {
    expect(
      parseNotification("com.sberbank", "− 100.00 ₽ в Магазин.", "Some title")
    ).toBe(null);
    expect(
      parseNotification("com.tinkoff", "− 100.00 ₽ в Магазин.", "Some title")
    ).toBe(null);
    expect(parseNotification("", "− 100.00 ₽ в Магазин.", "Some title")).toBe(
      null
    );
  });

  it("should handle missing title parameter for Raiffeisen", () => {
    // When title is undefined, validation is skipped
    const result = parseNotification(
      "ru.raiffeisennews",
      "− 100.00 ₽ в Магазин.",
      undefined
    );
    expect(result).toEqual({
      merchantName: "Магазин",
      amount: 100.0,
    });
  });

  it("should return null when Raiffeisen parsing fails", () => {
    const result = parseNotification(
      "ru.raiffeisennews",
      "Invalid notification text",
      "Заплатили картой *1234"
    );
    expect(result).toBe(null);
  });

  it("should detect bank application packages and log them", () => {
    const bankPackages = [
      "ru.sberbankmobile",
      "com.idamob.tinkoff.android",
      "ru.vtb24.mobilebanking",
      "ru.alfabank.mobile.android",
      "ru.sovcombank.halvacard",
      "ru.pochtabank.pochtaapp",
      "ru.rosbank.android",
    ];

    bankPackages.forEach((packageName) => {
      consoleSpy.mockClear();
      const result = parseNotification(
        packageName,
        "Some notification text",
        "Some title"
      );
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Package ${packageName} detected - parsing not yet implemented`
      );
    });
  });

  it("should detect fintech application packages and log them", () => {
    const fintechPackages = [
      "ru.yoo.money",
      "com.yandex.bank",
      "ru.nspk.sbp.pay",
      "ru.ozon.fintech.finance",
    ];

    fintechPackages.forEach((packageName) => {
      consoleSpy.mockClear();
      const result = parseNotification(
        packageName,
        "Some notification text",
        "Some title"
      );
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Package ${packageName} detected - parsing not yet implemented`
      );
    });
  });

  it("should detect marketplace application packages and log them", () => {
    const marketplacePackages = [
      "ru.ozon.app.android",
      "com.wildberries.ru",
      "ru.market.android",
      "com.avito.android",
      "ru.aliexpress.buyer",
      "ru.lamoda",
    ];

    marketplacePackages.forEach((packageName) => {
      consoleSpy.mockClear();
      const result = parseNotification(
        packageName,
        "Some notification text",
        "Some title"
      );
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Package ${packageName} detected - parsing not yet implemented`
      );
    });
  });

  it("should detect business application packages and log them", () => {
    const businessPackages = [
      "ru.sberbank.bankingbusiness",
      "com.idamob.tinkoff.business",
      "ru.vtb.mobile.business",
      "ru.alfabank.mobile.android.biz",
      "ru.sovcombank.business",
      "ru.modulebank",
      "ru.tochka.app",
      "ru.openbusiness.app",
      "ru.rosbank.business",
      "ru.uralsib.business",
    ];

    businessPackages.forEach((packageName) => {
      consoleSpy.mockClear();
      const result = parseNotification(
        packageName,
        "Some notification text",
        "Some title"
      );
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith(
        `Package ${packageName} detected - parsing not yet implemented`
      );
    });
  });
});
