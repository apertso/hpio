export interface ParsedPayment {
  merchantName: string;
  amount: number;
}

const RAIFFEISEN_TITLE_REGEX = /^Заплатили (картой|со счета)\s+\*\d{4}$/i;
const RAIFFEISEN_TEXT_REGEX =
  /[-−]\s?(\d{1,3}(?:[ \u00A0\u202F]?\d{3})*)\.(\d{2}) ₽ в ([^.]+)\.?/i;

/**
 * Validates if the notification title matches the expected Raiffeisen pattern
 */
export function validateRaiffeisenTitle(title: string): boolean {
  return RAIFFEISEN_TITLE_REGEX.test(title);
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

export function parseNotification(
  packageName: string,
  text: string,
  title?: string
): ParsedPayment | null {
  switch (packageName) {
    case "com.android.shell":
    case "ru.raiffeisennews":
      if (title && !validateRaiffeisenTitle(title)) {
        console.log("Raiffeisen notification title:", title);
        return null;
      }
      return parseRaiffeisenNotification(text);
    // Bank applications
    case "ru.sberbankmobile":
    case "com.idamob.tinkoff.android":
    case "ru.vtb24.mobilebanking":
    case "ru.alfabank.mobile.android":
    case "ru.sovcombank.halvacard":
    case "ru.pochtabank.pochtaapp":
    case "ru.rosbank.android":
    // Fintech applications
    case "ru.yoo.money":
    case "com.yandex.bank":
    case "ru.nspk.sbp.pay":
    case "ru.ozon.fintech.finance":
    // Marketplace applications
    case "ru.ozon.app.android":
    case "com.wildberries.ru":
    case "ru.market.android":
    case "com.avito.android":
    case "ru.aliexpress.buyer":
    case "ru.lamoda":
    // Business applications
    case "ru.sberbank.bankingbusiness":
    case "com.idamob.tinkoff.business":
    case "ru.vtb.mobile.business":
    case "ru.alfabank.mobile.android.biz":
    case "ru.sovcombank.business":
    case "ru.modulebank":
    case "ru.tochka.app":
    case "ru.openbusiness.app":
    case "ru.rosbank.business":
    case "ru.uralsib.business":
      // Package detected but parsing not yet implemented
      console.log(
        `Package ${packageName} detected - parsing not yet implemented`
      );
      return null;
    default:
      return null;
  }
}
