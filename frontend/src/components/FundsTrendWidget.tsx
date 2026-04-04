import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowUpRightIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { fundsApi, FundsHistoryPoint } from "../api/fundsApi";
import CustomDailySpendingChart from "./CustomDailySpendingChart";
import { useTheme } from "../context/ThemeContext";
import Modal from "./Modal";
import MobilePanel from "./MobilePanel";

interface FundsTrendWidgetProps {
  timeRange: string;
}

const FundsTrendWidget: React.FC<FundsTrendWidgetProps> = ({ timeRange }) => {
  const { resolvedTheme } = useTheme();
  const [history, setHistory] = useState<FundsHistoryPoint[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Map dashboard timeRange to logic
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    // Mapping based on HomePage SegmentedControl logic
    switch (timeRange) {
      case "1d": // For 1d we show 1w trend actually, or handle differently. Let's force 1w for minimal context
      case "1w":
        start.setDate(now.getDate() - 7);
        break;
      case "1m":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "1y":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default: // Custom or other
        start.setDate(now.getDate() - 30);
    }

    return { startDate: start, endDate: end };
  }, [timeRange]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fundsApi.getHistory({
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        });
        setHistory(data);
      } catch (error) {
        console.error("Failed to load funds history", error);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  const { chartData, chartLabels, chartDates } = useMemo(() => {
    const data = history.map((p) => p.totalAmount);
    const labels = history.map((p) =>
      new Date(p.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      })
    );
    const dates = history.map((p) => p.date);
    return { chartData: data, chartLabels: labels, chartDates: dates };
  }, [history]);

  const hasData = chartData.length > 1;

  // Determine trend direction (simple first vs last)
  const isUp = hasData && chartData[chartData.length - 1] >= chartData[0];
  const trendColor = isUp ? "text-emerald-500" : "text-red-500";
  const trendIcon = isUp ? (
    <ArrowUpRightIcon className={`w-4 h-4 ${trendColor}`} />
  ) : (
    <ArrowUpRightIcon className={`w-4 h-4 ${trendColor} rotate-90`} />
  );

  const ChartContent = ({ heightClass = "h-32" }) => (
    <div className={`relative w-full ${heightClass}`}>
      {hasData ? (
        <CustomDailySpendingChart
          data={chartData}
          labels={chartLabels}
          rawDates={chartDates}
          theme={resolvedTheme}
          startDate={startDate}
          endDate={endDate}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-sm text-gray-400">
          Недостаточно данных для графика
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="card-base p-6 flex flex-col justify-between h-full min-h-[160px]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Динамика средств
            </h3>
            {hasData && (
              <div className="flex items-center gap-1 mt-1">
                {trendIcon}
                <span className={`text-xs font-medium ${trendColor}`}>
                  {isUp ? "Рост" : "Снижение"} за период
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowsPointingOutIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="-mx-2">
          <ChartContent heightClass="h-24" />
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <>
          <Modal
            isOpen={isExpanded}
            onClose={() => setIsExpanded(false)}
            title="История баланса"
            className="hidden md:flex w-full max-w-4xl"
          >
            <div className="p-4">
              <ChartContent heightClass="h-80" />
            </div>
          </Modal>

          <MobilePanel
            isOpen={isExpanded}
            onClose={() => setIsExpanded(false)}
            title="История баланса"
          >
            <div className="p-4 pb-10">
              <ChartContent heightClass="h-64" />
            </div>
          </MobilePanel>
        </>
      )}
    </>
  );
};

export default FundsTrendWidget;
