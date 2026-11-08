export interface CurrencyOption {
  value: string;
  label: string;
}

export const DEFAULT_CURRENCY = "RUB";
const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function resolveCurrency(currency?: string | null): string {
  const code = currency?.trim().toUpperCase();
  return code || DEFAULT_CURRENCY;
}

export function formatMoney(
  amount: number,
  locale: string,
  currency?: string | null
): string {
  const code = resolveCurrency(currency);
  const key = `${locale}:${code}`;
  let formatter = moneyFormatters.get(key);
  if (formatter) return formatter.format(amount);

  const digits = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  try {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      ...digits,
    });
  } catch {
    formatter = new Intl.NumberFormat(locale, digits);
  }

  moneyFormatters.set(key, formatter);
  return formatter.format(amount);
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: "RUB", label: "Российский рубль" },
  { value: "USD", label: "Доллар США" },
  { value: "EUR", label: "Евро" },
  { value: "GEL", label: "Грузинский лари" },
  { value: "RSD", label: "Сербский динар" },
  { value: "KZT", label: "Казахстанский тенге" },
  { value: "TRY", label: "Турецкая лира" },
  { value: "BYN", label: "Белорусский рубль" },
  { value: "CNY", label: "Китайский юань" },
];

export const getCurrencySymbol = (currency: string, locale = "ru-RU"): string => {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const symbol = parts.find((part) => part.type === "currency")?.value;
    return symbol || currency;
  } catch {
    return currency;
  }
};
