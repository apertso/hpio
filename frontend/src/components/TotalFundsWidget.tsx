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
  const [summary, setSummary] = useState<FundsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await fundsApi.getSummary();
        setSummary(data);
      } catch (error) {
        console.error("Failed to fetch funds summary", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div className="card-base p-6 flex justify-center items-center h-40">
        <Spinner />
      </div>
    );
  }

  if (!summary) return null;

  const { totalAmount, currency, changeAmount } = summary;
  const currencySymbol = getCurrencySymbol(currency);
  const isPositive = (changeAmount || 0) > 0;
  const isNegative = (changeAmount || 0) < 0;

  const formattedTotal = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalAmount);

  const formattedChange = changeAmount
    ? new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        signDisplay: "always",
      }).format(changeAmount)
    : "—";

  return (
    <div className="card-base p-6 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Общий баланс
        </span>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {isVisible ? (
            <EyeIcon className="w-4 h-4" />
          ) : (
            <EyeSlashIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
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
            за сегодня
          </span>
        </div>
      )}
    </div>
  );
};

export default TotalFundsWidget;