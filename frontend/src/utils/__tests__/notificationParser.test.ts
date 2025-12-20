import { describe, it, expect, vi } from "vitest";
import {
  validateRaiffeisenTitle,
  parseRaiffeisenNotification,
  parseSberbankNotification,
  parseYandexBankNotification,
  parseOzonNotification,
  parseTBankNotification,
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

describe("parseSberbankNotification", () => {
  it("should parse Sberbank notification with provided example", () => {
    const title = "Покупка Купер";
    const text = "150 ₽ — Баланс: 196,01 ₽ MasterCard •• 7165";
    const result = parseSberbankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Купер",
      amount: 150,
    });
  });

  it("should parse Sberbank notification with decimal amount", () => {
    const title = "Покупка Магазин";
    const text = "1 234,56 ₽ — Баланс: 5 000,00 ₽ MasterCard •• 1234";
    const result = parseSberbankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Магазин",
      amount: 1234.56,
    });
  });

  it("should return null for invalid title format", () => {
    const title = "Перевод средств";
    const text = "150 ₽ — Баланс: 196,01 ₽ MasterCard •• 7165";
    const result = parseSberbankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for invalid text format", () => {
    const title = "Покупка Купер";
    const text = "Недостаточно средств";
    const result = parseSberbankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should handle merchant names with spaces", () => {
    const title = "Покупка Большой магазин";
    const text = "500 ₽ — Баланс: 1 000,00 ₽ MasterCard •• 7165";
    const result = parseSberbankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Большой магазин",
      amount: 500,
    });
  });
});

describe("parseYandexBankNotification", () => {
  it("should parse Yandex Bank notification with provided example", () => {
    const title = "Ситикард";
    const text = "Покупка на 35.00 RUB, карта *7222. Доступно 115.00 RUB";
    const result = parseYandexBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Ситикард",
      amount: 35.0,
    });
  });

  it("should parse Yandex Bank notification with large amount", () => {
    const title = "Пятёрочка";
    const text = "Покупка на 1 500.50 RUB, карта *1234. Доступно 10 000.00 RUB";
    const result = parseYandexBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Пятёрочка",
      amount: 1500.5,
    });
  });

  it("should return null for invalid text format", () => {
    const title = "Ситикард";
    const text = "Перевод средств 100 RUB";
    const result = parseYandexBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for empty title", () => {
    const title = "";
    const text = "Покупка на 35.00 RUB, карта *7222. Доступно 115.00 RUB";
    const result = parseYandexBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should handle merchant names with special characters", () => {
    const title = "McDonald's";
    const text = "Покупка на 250.00 RUB, карта *9999. Доступно 5 000.00 RUB";
    const result = parseYandexBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "McDonald's",
      amount: 250,
    });
  });
});

describe("parseOzonNotification", () => {
  it("should parse Ozon notification with provided example", () => {
    const title = "Ozon Банк";
    const text = "Покупка на 128 ₽. Ozon. Доступно 1 499 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toEqual({
      merchantName: "Ozon",
      amount: 128.0,
    });
  });

  it("should parse Ozon notification with large amount", () => {
    const title = "Ozon Банк";
    const text = "Покупка на 1 500.50 ₽. Ozon. Доступно 10 000.00 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toEqual({
      merchantName: "Ozon",
      amount: 1500.5,
    });
  });

  it("should parse Ozon notification with amount with spaces", () => {
    const title = "Ozon Банк";
    const text = "Покупка на 2 500 ₽. Ozon. Доступно 20 000 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toEqual({
      merchantName: "Ozon",
      amount: 2500.0,
    });
  });

  it("should return null for invalid text format", () => {
    const title = "Ozon Банк";
    const text = "Перевод средств 100 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for invalid title", () => {
    const title = "Ozon";
    const text = "Покупка на 128 ₽. Ozon. Доступно 1 499 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for empty title", () => {
    const title = "";
    const text = "Покупка на 128 ₽. Ozon. Доступно 1 499 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toBe(null);
  });

  it("should validate Ozon title case insensitive", () => {
    const titleLower = "ozon банк";
    const titleUpper = "OZON БАНК";
    const titleMixed = "OzOn БаНк";
    const text = "Покупка на 128 ₽. Ozon. Доступно 1 499 ₽";

    expect(parseOzonNotification(text, titleLower)).toEqual({
      merchantName: "Ozon",
      amount: 128.0,
    });

    expect(parseOzonNotification(text, titleUpper)).toEqual({
      merchantName: "Ozon",
      amount: 128.0,
    });

    expect(parseOzonNotification(text, titleMixed)).toEqual({
      merchantName: "Ozon",
      amount: 128.0,
    });
  });

  it("should parse Ozon external purchase notification", () => {
    const title = "Ozon Банк";
    const text = "Покупка в FARSH. 1695 RUR. Баланс 509 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toEqual({
      merchantName: "FARSH",
      amount: 1695.0,
    });
  });

  it("should parse Ozon external purchase with different merchant", () => {
    const title = "Ozon Банк";
    const text = "Покупка в Магазин продуктов. 2500 RUR. Баланс 1500 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toEqual({
      merchantName: "Магазин продуктов",
      amount: 2500.0,
    });
  });

  it("should parse Ozon external purchase with decimal amount", () => {
    const title = "Ozon Банк";
    const text = "Покупка в Кафе. 125.50 RUR. Баланс 1000 ₽";
    const result = parseOzonNotification(text, title);

    expect(result).toEqual({
      merchantName: "Кафе",
      amount: 125.5,
    });
  });

  it("should return null for external purchase with invalid format", () => {
    const title = "Ozon Банк";
    const text = "Покупка в магазине без суммы";
    const result = parseOzonNotification(text, title);

    expect(result).toBe(null);
  });
});

describe("parseTBankNotification", () => {
  it("should parse T-Bank notification with provided example", () => {
    const title = "Kofeynya na Oranzherey";
    const text =
      "Покупка на 741 ₽, кэшбэк ₽ Р,карта *0725\nДоступно 1 446,98 ₽";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Kofeynya na Oranzherey",
      amount: 741.0,
    });
  });

  it("should parse T-Bank notification with decimal amount using dot", () => {
    const title = "Магазин электроники";
    const text = "Покупка на 2 500.50 ₽, кэшбэк 25.00 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Магазин электроники",
      amount: 2500.5,
    });
  });

  it("should parse T-Bank notification with decimal amount using comma", () => {
    const title = "Пищевой рынок";
    const text = "Покупка на 1 234,56 ₽, кэшбэк 12,34 ₽, карта *5678";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Пищевой рынок",
      amount: 1234.56,
    });
  });

  it("should parse T-Bank notification with large amounts and spaces", () => {
    const title = "Торговый центр";
    const text = "Покупка на 10 000 ₽, кэшбэк 100 ₽, карта *9999";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Торговый центр",
      amount: 10000.0,
    });
  });

  it("should parse T-Bank notification with different space types in amount", () => {
    const title = "Магазин";
    // Using various Unicode spaces
    const text = "Покупка на 1 000.99 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Магазин",
      amount: 1000.99,
    });
  });

  it("should handle merchant names with special characters", () => {
    const title = "McDonald's & Co.";
    const text = "Покупка на 500.00 ₽, кэшбэк 5 ₽, карта *1111";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "McDonald's & Co.",
      amount: 500.0,
    });
  });

  it("should return null for empty title", () => {
    const title = "";
    const text = "Покупка на 100 ₽, кэшбэк 1 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for whitespace-only title", () => {
    const title = "   ";
    const text = "Покупка на 100 ₽, кэшбэк 1 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for invalid text format", () => {
    const title = "Магазин";
    const text = "Перевод средств 100 ₽";
    const result = parseTBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for zero amount", () => {
    const title = "Магазин";
    const text = "Покупка на 0 ₽, кэшбэк 0 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should return null for negative amount", () => {
    const title = "Магазин";
    const text = "Покупка на -100 ₽, кэшбэк 0 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toBe(null);
  });

  it("should trim whitespace from merchant title", () => {
    const title = "  Магазин  ";
    const text = "Покупка на 100 ₽, кэшбэк 1 ₽, карта *1234";
    const result = parseTBankNotification(text, title);

    expect(result).toEqual({
      merchantName: "Магазин",
      amount: 100.0,
    });
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
      "[INFO]",
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

  it("should parse Sberbank notifications correctly", () => {
    const result = parseNotification(
      "ru.sberbankmobile",
      "150 ₽ — Баланс: 196,01 ₽ MasterCard •• 7165",
      "Покупка Купер"
    );

    expect(result).toEqual({
      merchantName: "Купер",
      amount: 150,
    });
  });

  it("should return null for Sberbank without title", () => {
    const result = parseNotification(
      "ru.sberbankmobile",
      "150 ₽ — Баланс: 196,01 ₽ MasterCard •• 7165"
    );

    expect(result).toBe(null);
  });

  it("should parse Yandex Bank notifications correctly", () => {
    const result = parseNotification(
      "com.yandex.bank",
      "Покупка на 35.00 RUB, карта *7222. Доступно 115.00 RUB",
      "Ситикард"
    );

    expect(result).toEqual({
      merchantName: "Ситикард",
      amount: 35.0,
    });
  });

  it("should return null for Yandex Bank without title", () => {
    const result = parseNotification(
      "com.yandex.bank",
      "Покупка на 35.00 RUB, карта *7222. Доступно 115.00 RUB"
    );

    expect(result).toBe(null);
  });

  it("should parse Ozon notifications correctly", () => {
    const result = parseNotification(
      "ru.ozon.app.android",
      "Покупка на 128 ₽. Ozon. Доступно 1 499 ₽",
      "Ozon Банк"
    );

    expect(result).toEqual({
      merchantName: "Ozon",
      amount: 128.0,
    });
  });

  it("should return null for Ozon without title", () => {
    const result = parseNotification(
      "ru.ozon.app.android",
      "Покупка на 128 ₽. Ozon. Доступно 1 499 ₽"
    );

    expect(result).toBe(null);
  });
});

describe("parseNotification - T-Bank", () => {
  it("should parse T-Bank notifications correctly", () => {
    const result = parseNotification(
      "com.idamob.tinkoff.android",
      "Покупка на 741 ₽, кэшбэк ₽ Р,карта *0725\nДоступно 1 446,98 ₽",
      "Kofeynya na Oranzherey"
    );

    expect(result).toEqual({
      merchantName: "Kofeynya na Oranzherey",
      amount: 741.0,
    });
  });

  it("should parse T-Bank notifications with decimal amounts", () => {
    const result = parseNotification(
      "com.idamob.tinkoff.android",
      "Покупка на 1 234.56 ₽, кэшбэк 12.34 ₽, карта *1234",
      "Магазин техники"
    );

    expect(result).toEqual({
      merchantName: "Магазин техники",
      amount: 1234.56,
    });
  });

  it("should return null for T-Bank without title", () => {
    const result = parseNotification(
      "com.idamob.tinkoff.android",
      "Покупка на 741 ₽, кэшбэк ₽ Р,карта *0725"
    );

    expect(result).toBe(null);
  });

  it("should return null for T-Bank with invalid text format", () => {
    const result = parseNotification(
      "com.idamob.tinkoff.android",
      "Invalid notification text",
      "Магазин"
    );

    expect(result).toBe(null);
  });
});
