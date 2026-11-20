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

export interface CurrencyTotal {
  currency: string;
  amount: number;
}

export function groupCurrencyTotals(
  items: { amount: number | string; currency?: string | null }[]
): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const currency = resolveCurrency(item.currency);
    totals.set(currency, (totals.get(currency) || 0) + Number(item.amount));
  }
  return Array.from(totals, ([currency, amount]) => ({ currency, amount }));
}

export function formatCurrencyTotals(
  items: { amount: number | string; currency?: string | null }[],
  locale: string
): string {
  return groupCurrencyTotals(items).map(({ amount, currency }) => formatMoney(amount, locale, currency)).join(" + ");
}

export function convertCurrency(
  amount: number,
  from: string | null | undefined,
  to: string,
  rates: Record<string, number>
): number | null {
  if (!Number.isFinite(amount)) return null;
  const source = resolveCurrency(from).toLowerCase();
  const target = resolveCurrency(to).toLowerCase();
  if (source === target) return amount;
  const sourceRate = source === "usd" ? 1 : rates[source];
  const targetRate = target === "usd" ? 1 : rates[target];
  if (!Number.isFinite(sourceRate) || sourceRate <= 0 ||
      !Number.isFinite(targetRate) || targetRate <= 0) return null;
  const result = amount / sourceRate * targetRate;
  return Number.isFinite(result) ? result : null;
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
