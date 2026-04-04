export interface CurrencyOption {
  value: string;
  label: string;
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

export const getCurrencySymbol = (currency: string): string => {
  try {
    const parts = new Intl.NumberFormat("ru-RU", {
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
