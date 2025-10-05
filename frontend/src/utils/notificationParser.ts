export interface ParsedPayment {
  merchantName: string;
  amount: number;
  cardLast4?: string;
  rawText: string;
}

const RAIFFEISEN_REGEX =
  /Заплатили картой \*(\d{4}) ([\+\-])(\d{1,3})\s*(\d{1,3})\.(\d{2}) ₽ в (.+?)\./i;

export function parseRaiffeisenNotification(
  text: string
): ParsedPayment | null {
  try {
    const match = text.match(RAIFFEISEN_REGEX);
    if (!match) {
      return null;
    }

    const [, cardLast4, sign, thousands, rubles, kopecks, merchantName] = match;

    const amountStr = `${thousands}${rubles}.${kopecks}`;
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount <= 0) {
      return null;
    }

    return {
      merchantName: merchantName.trim(),
      amount: sign === "-" ? amount : -amount,
      cardLast4,
      rawText: text,
    };
  } catch (error) {
    console.error("Error parsing Raiffeisen notification:", error);
    return null;
  }
}

export function parseNotification(
  packageName: string,
  text: string
): ParsedPayment | null {
  switch (packageName) {
    case "ru.raiffeisennews":
      return parseRaiffeisenNotification(text);
    default:
      return null;
  }
}
