// src/components/dashboard/Money.tsx
import React, { useMemo } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { resolveCurrency } from "../../utils/currencies";

interface MoneyProps {
  amount: number;
  currency?: string | null;
  className?: string;
  /** Класс для дробной части и знака валюты (по умолчанию — приглушённые и меньше) */
  minorClassName?: string;
  /** Показывать знак «+» для положительных сумм */
  signed?: boolean;
}

/**
 * Сумма, в которой целая часть — главная, а копейки и знак валюты
 * набраны тише. Так крупные числа читаются быстрее и выглядят аккуратнее.
 */
const Money: React.FC<MoneyProps> = ({
  amount,
  currency,
  className = "",
  minorClassName = "text-[0.72em] font-medium text-gray-400 dark:text-gray-500",
  signed = false,
}) => {
  const { locale } = useLanguage();
  const parts = useMemo(() => {
    const code = resolveCurrency(currency);
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).formatToParts(amount);
    } catch {
      return new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).formatToParts(amount);
    }
  }, [amount, currency, locale]);

  return (
    <span className={`tabular-nums ${className}`.trim()}>
      {signed && amount > 0 && "+"}
      {parts.map((part, i) => {
        const minor =
          part.type === "decimal" ||
          part.type === "fraction" ||
          part.type === "currency" ||
          (part.type === "literal" && parts[i + 1]?.type === "currency") ||
          (part.type === "literal" && parts[i - 1]?.type === "currency");
        return minor ? (
          <span key={i} className={minorClassName}>
            {part.value}
          </span>
        ) : (
          <React.Fragment key={i}>{part.value}</React.Fragment>
        );
      })}
    </span>
  );
};

export default Money;
