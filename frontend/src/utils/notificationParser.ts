export interface ParsedPayment {
  merchantName: string;
  amount: number;
}

export type NotificationType = "payment" | "refund" | "transfer" | "other";

export function detectNotificationType(message: string): NotificationType {
  const text = message.toLowerCase();

  if (/\b(пополнен|зачислен|получен|возврат|refunded|returned)\b/.test(text))
    return "refund";

  if (/\b(перевод|transfer|отправлен|получателю)\b/.test(text))
    return "transfer";

  if (
    /\b(покупка|оплата|заплатили|списание|платеж|transaction|purchase|payment)\b/.test(
      text
    )
  ) {
    return "payment";
  }

  return "other";
}

const RAIFFEISEN_TITLE_REGEX = /^Заплатили (картой|со счета)\s+\*\d{4}$/i;
const RAIFFEISEN_TEXT_REGEX =
  /[-−]\s?(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*)\.(\d{2}) ₽ в ([^.]+)\.?/i;

const SBERBANK_TITLE_REGEX = /^Покупка\s+(.+)$/i;
const SBERBANK_TEXT_REGEX =
  /^(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*(?:,\d{2})?)\s*₽/i;

const YANDEX_BANK_TEXT_REGEX =
  /^Покупка на\s+(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*(?:\.\d{2})?)\s+RUB/i;

const OZON_TITLE_REGEX = /^Ozon Банк$/i;
const OZON_TEXT_REGEX =
  /Покупка на\s+(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*(?:\.\d{2})?)\s+₽/i;
const OZON_EXTERNAL_PURCHASE_REGEX =
  /Покупка в\s+([^\.]+)\.\s+(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*(?:\.\d{2})?)\s+RUR/i;

const TBANK_TEXT_REGEX =
  /Покупка на\s+(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*(?:[.,]\d{2})?)\s+₽/i;

/**
 * Проверяет, соответствует ли заголовок уведомления ожидаемому шаблону Raiffeisen
 */
export function validateRaiffeisenTitle(title: string): boolean {
  return RAIFFEISEN_TITLE_REGEX.test(title);
}

/**
 * Проверяет, соответствует ли заголовок уведомления ожидаемому шаблону Ozon
 */
export function validateOzonTitle(title: string): boolean {
  return OZON_TITLE_REGEX.test(title);
}

export function parseRaiffeisenNotification(
  text: string
): ParsedPayment | null {
  try {
    const match = text.match(RAIFFEISEN_TEXT_REGEX);
    if (!match) {
      return null;
    }

    const [, amountStr, kopecks, merchantName] = match;

    const amount = parseFloat(
      `${amountStr.replace(/[ \u00A0\u202F]/g, "")}.${kopecks}`
    );

    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    return {
      merchantName: merchantName.trim(),
      amount,
    };
  } catch (error) {
    console.error("Error parsing Raiffeisen notification:", error);
    return null;
  }
}

export function parseSberbankNotification(
  text: string,
  title: string
): ParsedPayment | null {
  try {
    const titleMatch = title.match(SBERBANK_TITLE_REGEX);
    if (!titleMatch) {
      return null;
    }

    const merchantName = titleMatch[1].trim();

    const textMatch = text.match(SBERBANK_TEXT_REGEX);
    if (!textMatch) {
      return null;
    }

    const amountStr = textMatch[1];
    const amount = parseFloat(
      amountStr.replace(/[ \u00A0\u202F]/g, "").replace(",", ".")
    );

    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    return {
      merchantName,
      amount,
    };
  } catch (error) {
    console.error("Error parsing Sberbank notification:", error);
    return null;
  }
}

export function parseYandexBankNotification(
  text: string,
  title: string
): ParsedPayment | null {
  try {
    const merchantName = title.trim();
    if (!merchantName) {
      return null;
    }

    const textMatch = text.match(YANDEX_BANK_TEXT_REGEX);
    if (!textMatch) {
      return null;
    }

    const amountStr = textMatch[1];
    const amount = parseFloat(amountStr.replace(/[ \u00A0\u202F]/g, ""));

    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    return {
      merchantName,
      amount,
    };
  } catch (error) {
    console.error("Error parsing Yandex Bank notification:", error);
    return null;
  }
}

export function parseOzonNotification(
  text: string,
  title: string
): ParsedPayment | null {
  try {
    if (!validateOzonTitle(title)) {
      return null;
    }

    // Сначала пытаемся сопоставить прямые покупки на Ozon
    const ozonMatch = text.match(OZON_TEXT_REGEX);
    if (ozonMatch) {
      const amountStr = ozonMatch[1];
      const amount = parseFloat(amountStr.replace(/[ \u00A0\u202F]/g, ""));

      if (isNaN(amount) || amount <= 0) {
        return null;
      }

      return {
        merchantName: "Ozon",
        amount,
      };
    }

    // Пытаемся сопоставить внешние покупки с картой Ozon
    const externalMatch = text.match(OZON_EXTERNAL_PURCHASE_REGEX);
    if (externalMatch) {
      const merchantName = externalMatch[1].trim();
      const amountStr = externalMatch[2];
      const amount = parseFloat(amountStr.replace(/[ \u00A0\u202F]/g, ""));

      if (isNaN(amount) || amount <= 0 || !merchantName) {
        return null;
      }

      return {
        merchantName,
        amount,
      };
    }

    return null;
  } catch (error) {
    console.error("Error parsing Ozon notification:", error);
    return null;
  }
}

export function parseTBankNotification(
  text: string,
  title: string
): ParsedPayment | null {
  try {
    const merchantName = title.trim();
    if (!merchantName) {
      return null;
    }

    const textMatch = text.match(TBANK_TEXT_REGEX);
    if (!textMatch) {
      return null;
    }

    const amountStr = textMatch[1];
    const amount = parseFloat(
      amountStr.replace(/[ \u00A0\u202F]/g, "").replace(",", ".")
    );

    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    return {
      merchantName,
      amount,
    };
  } catch (error) {
    console.error("Error parsing T-Bank notification:", error);
    return null;
  }
}

export function parseNotification(
  packageName: string,
  text: string,
  title?: string
): ParsedPayment | null {
  if (packageName === "ru.sberbankmobile") {
    if (!title) {
      return null;
    }
    return parseSberbankNotification(text, title);
  }

  if (packageName === "com.yandex.bank") {
    if (!title) {
      return null;
    }
    return parseYandexBankNotification(text, title);
  }

  if (packageName === "ru.ozon.app.android") {
    if (!title) {
      return null;
    }
    return parseOzonNotification(text, title);
  }

  if (packageName === "com.idamob.tinkoff.android") {
    if (!title) {
      return null;
    }
    return parseTBankNotification(text, title);
  }

  if (
    packageName !== "com.android.shell" &&
    packageName !== "ru.raiffeisennews"
  ) {
    return null;
  }
  if (title && !validateRaiffeisenTitle(title)) {
    console.log("Raiffeisen notification title:", title);
    return null;
  }
  return parseRaiffeisenNotification(text);
}
