import { usePreferredCurrency } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
import { fundsApi, FundsSummary } from "../api/fundsApi";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { getCurrencySymbol } from "../utils/currencies";
import Spinner from "./Spinner";

const TotalFundsWidget: React.FC = () => {
  const { t, locale } = useLanguage();
  const preferredCurrency = usePreferredCurrency();
  const [summary, setSummary] = useState<FundsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let canceled = false;
    setSummary(null);
    setIsLoading(true);
    const fetchSummary = async (): Promise<void> => {
      try {
        const data = await fundsApi.getSummary();
        if (!canceled) setSummary(data);
      } catch (error) {
        console.error("Failed to fetch funds summary", error);
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    fetchSummary();
    return () => { canceled = true; };
  }, [preferredCurrency]);

  if (isLoading) {
    return (
      <div className="card-base p-5 flex justify-center items-center h-40">
        <Spinner />
      </div>
    );
  }

  if (!summary || summary.currency !== preferredCurrency) return (
    <p className="text-sm text-gray-500 dark:text-gray-400">{t("Не удалось загрузить баланс в {1}.", preferredCurrency)}</p>
  );

  const { totalAmount, currency, changeAmount } = summary;
  const currencySymbol = getCurrencySymbol(currency, locale);
  const isPositive = (changeAmount || 0) > 0;
  const isNegative = (changeAmount || 0) < 0;

  const formattedTotal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalAmount);

  const formattedChange = changeAmount
    ? new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: "always",
      }).format(changeAmount)
    : "—";

  return (
    <div className="card-base p-5 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("Общий баланс")}
        </span>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          {isVisible ? (
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeSlashIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-gray-900 dark:text-gray-50">
          {isVisible ? formattedTotal : "••••••"}
        </span>
        <span className="text-xl font-medium text-gray-500 dark:text-gray-400">
          {currencySymbol}
        </span>
      </div>

      {isVisible && (
        <div className="flex items-center gap-2 mt-1">
          {isPositive ? (
            <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
          ) : isNegative ? (
            <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
          ) : (
            <MinusIcon className="w-4 h-4 text-gray-400" />
          )}
          <span
            className={`text-sm font-medium ${
              isPositive
                ? "text-emerald-500"
                : isNegative
                ? "text-red-500"
                : "text-gray-500"
            }`}
          >
            {formattedChange} {currencySymbol}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            {t("за сегодня")}
          </span>
        </div>
      )}
    </div>
  );
};

export default TotalFundsWidget;