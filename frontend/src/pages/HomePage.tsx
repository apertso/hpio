// src/pages/HomePage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import PaymentCard from "../components/PaymentCard"; // Для отображения карточек
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import axiosInstance from "../api/axiosInstance"; // Для получения данных
import logger from "../utils/logger";
import useApi from "../hooks/useApi"; // Import useApi
import { useTheme } from "../context/ThemeContext"; // Import useTheme
import { Button } from "../components/Button";
import { DropdownButton } from "../components/DropdownButton";
import { YearSelectorDropdown } from "../components/YearSelectorDropdown";
import Spinner from "../components/Spinner";
import CategoryDistributionBars from "../components/CategoryDistributionBars";
import Scrollbar from "../components/Scrollbar";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmCompletionDateModal from "../components/ConfirmCompletionDateModal"; // Import ConfirmCompletionDateModal
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import Modal from "../components/Modal"; // Add this import

// Импорт компонентов и типов из Chart.js и react-chartjs-2
import { PaymentData } from "../types/paymentData";

// Utility function to format date in local timezone (YYYY-MM-DD)
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

// Define color palettes for charts
const categoryColorsLight = [
  "rgba(255, 99, 132, 0.6)", // Red
  "rgba(54, 162, 235, 0.6)", // Blue
  "rgba(255, 206, 86, 0.6)", // Yellow
  "rgba(75, 192, 192, 0.6)", // Green
  "rgba(153, 102, 255, 0.6)", // Purple
  "rgba(255, 159, 64, 0.6)", // Orange
  "rgba(199, 199, 199, 0.6)", // Gray
  "rgba(255, 99, 132, 0.8)",
  "rgba(54, 162, 235, 0.8)",
  "rgba(255, 206, 86, 0.8)",
];

const categoryColorsDark = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
];

import CustomDailySpendingChart from "../components/CustomDailySpendingChart";
// Интерфейс для данных статистики, получаемых с бэкенда
interface DashboardStats {
  month: string; // Например, '2023-11'
  totalUpcomingAmount: string; // Строка, т.к. DECIMAL с бэкенда
  totalCompletedAmount: string; // Строка
  categoriesDistribution: { id?: string; name: string; amount: number }[]; // id is optional for "No Category"
  dailyPaymentLoad: { date: string; amount: number }[];
  allPaymentsInMonth: PaymentData[]; // Add this field
  // TODO: Добавить другие поля, если бэкенд их возвращает
}

// Define the raw API fetch function for upcoming payments
const fetchUpcomingPaymentsApi = async (): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/payments/upcoming");
  return res.data;
};

// New list item component for mobile view
const UpcomingPaymentListItem: React.FC<{ payment: PaymentData }> = ({
  payment,
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <PaymentIconDisplay payment={payment} sizeClass="h-8 w-8" />
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {payment.title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(payment.dueDate).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "short",
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
          {new Intl.NumberFormat("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(payment.amount)}
          <span className="ml-1 text-base font-normal text-gray-500 dark:text-gray-400">
            ₽
          </span>
        </p>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { resolvedTheme } = useTheme(); // Access the theme
  const { showToast } = useToast(); // Import useToast

  const {
    data: rawUpcomingPayments,
    isLoading: isLoadingPayments,
    error: errorPayments,
    execute: executeFetchUpcomingPayments,
  } = useApi<PaymentData[]>(fetchUpcomingPaymentsApi);

  // State for transformed upcoming payments data
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentData[]>([]);

  // Effect to transform data when raw upcoming payments data changes
  useEffect(() => {
    if (rawUpcomingPayments) {
      // Преобразуем amount из string (DECIMAL) в number при получении
      const payments = rawUpcomingPayments.map((p) => ({
        ...p,
        amount: typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
      }));
      setUpcomingPayments(payments);
      logger.info(
        `Successfully fetched and processed ${payments.length} upcoming payments.`
      );
    } else {
      setUpcomingPayments([]); // Clear payments if raw data is null (e.g., on error)
    }
  }, [rawUpcomingPayments]);

  // Effect to trigger the fetch on mount
  useEffect(() => {
    executeFetchUpcomingPayments();
  }, [executeFetchUpcomingPayments]); // Dependency on executeFetchUpcomingPayments

  // --- Состояние для данных дашборда ---
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  // TODO: Состояние для фильтров дашборда (если будет реализовано)
  // const [filterMonth, setFilterMonth] = useState(new Date()); // Текущий месяц по умолчанию
  // const { user } = useAuth(); // Получаем данные пользователя, если нужно (не напрямую для API, а для логирования/отображения)

  // НОВОЕ: Состояние для выбора периода статистики
  type PeriodType = "month" | "quarter" | "year" | "custom";
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [quarter, setQuarter] = useState(Math.floor(new Date().getMonth() / 3)); // 0-3
  const [customDateFrom, setCustomDateFrom] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const [customDateTo, setCustomDateTo] = useState(new Date());

  // --- Новые состояния для модальных окон и уведомлений ---
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionDateModalState, setCompletionDateModalState] = useState<{
    isOpen: boolean;
    payment: PaymentData | null;
  }>({ isOpen: false, payment: null });
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isConfirming, setIsConfirming] = useState(false);
  const [dailyPaymentsModal, setDailyPaymentsModal] = useState<{
    date: string;
    payments: PaymentData[];
  } | null>(null);

  const { startDate, endDate } = useMemo(() => {
    let startDate, endDate;
    switch (periodType) {
      case "month":
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0);
        break;
      case "quarter":
        startDate = new Date(year, quarter * 3, 1);
        endDate = new Date(year, quarter * 3 + 3, 0);
        break;
      case "year":
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        break;
      case "custom":
      default:
        startDate = customDateFrom;
        endDate = customDateTo;
        break;
    }
    return { startDate, endDate };
  }, [periodType, year, month, quarter, customDateFrom, customDateTo]);

  // --- Функция для загрузки статистики (из Dashboard.tsx) ---
  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    setErrorStats(null);

    const params = {
      startDate: formatDateToLocal(startDate),
      endDate: formatDateToLocal(endDate),
    };

    try {
      const res = await axiosInstance.get("/stats", { params }); // Используем новый эндпоинт с параметрами

      // Преобразование сумм в числа для графиков
      const formattedStats = {
        ...res.data,
        totalUpcomingAmount: parseFloat(res.data.totalUpcomingAmount),
        totalCompletedAmount: parseFloat(res.data.totalCompletedAmount),
        // amounts в массивах categoriesDistribution и dailyPaymentLoad уже number на бэкенде
        allPaymentsInMonth:
          res.data.allPaymentsInMonth?.map((p: PaymentData) => ({
            ...p,
            amount:
              typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
          })) || [],
      };

      setStats(formattedStats);
      logger.info("Successfully fetched dashboard stats.");
    } catch (error: unknown) {
      let errorMessage = "Неизвестная ошибка";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      logger.error("Failed to fetch dashboard stats:", errorMessage);
      setErrorStats("Не удалось загрузить статистику.");
    } finally {
      setIsLoadingStats(false);
    }
  }, [startDate, endDate]); // Update dependency array

  // --- Эффект для загрузки статистики при монтировании компонента (из Dashboard.tsx) ---
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]); // Зависимость от fetchDashboardStats

  const navigate = useNavigate();

  const handleAddPayment = () => {
    navigate("/payments/new");
  };

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  // --- Обработчики действий для карточек платежей ---
  const callCompleteApi = async (paymentId: string, completionDate?: Date) => {
    setIsCompleting(true);
    try {
      const payload = completionDate
        ? { completionDate: completionDate.toISOString().split("T")[0] }
        : {};
      await axiosInstance.put(`/payments/${paymentId}/complete`, payload);
      showToast("Платеж выполнен.", "success");
      executeFetchUpcomingPayments();
      fetchDashboardStats();
    } catch (error) {
      logger.error(`Failed to complete payment ${paymentId}:`, error);
      showToast("Не удалось выполнить платеж.", "error");
    } finally {
      setIsCompleting(false);
      setCompletionDateModalState({ isOpen: false, payment: null });
    }
  };

  const handleCompletePayment = async (payment: PaymentData) => {
    const today = new Date();
    const dueDate = new Date(payment.dueDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (today.getTime() === dueDate.getTime()) {
      callCompleteApi(payment.id);
    } else {
      setCompletionDateModalState({ isOpen: true, payment: payment });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const action = async () => {
      try {
        await axiosInstance.delete(`/payments/${paymentId}`);
        showToast("Платеж перемещен в архив.", "info");
        executeFetchUpcomingPayments();
        fetchDashboardStats();
      } catch (error) {
        logger.error(`Failed to delete payment ${paymentId}:`, error);
        showToast("Не удалось удалить платеж.", "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить платеж",
      message:
        "Вы уверены, что хотите удалить этот платеж? Он будет перемещен в архив.",
    });
  };

  const onConfirmAction = async () => {
    if (confirmModalState.action) {
      setIsConfirming(true);
      await confirmModalState.action();
      setIsConfirming(false);
    }
    setConfirmModalState({
      isOpen: false,
      action: null,
      title: "",
      message: "",
    });
  };

  const handleChartPointClick = (date: string) => {
    if (!stats?.allPaymentsInMonth) return;
    const paymentsForDay = stats.allPaymentsInMonth.filter((p) => {
      const paymentDateKey =
        p.status === "completed" && p.completedAt
          ? new Date(p.completedAt).toISOString().split("T")[0]
          : p.dueDate;
      return paymentDateKey === date;
    });
    setDailyPaymentsModal({ date, payments: paymentsForDay });
  };

  // --- Данные для графика (НОВАЯ, УПРОЩЕННАЯ ВЕРСИЯ) ---
  const { chartData, chartLabels, chartRawDates } = useMemo(() => {
    if (!stats?.dailyPaymentLoad || stats.dailyPaymentLoad.length === 0) {
      return { chartData: [], chartLabels: [], chartRawDates: [] };
    }

    const dataPoints = stats.dailyPaymentLoad.map((d) => d.amount);
    const labels = stats.dailyPaymentLoad.map((d) =>
      new Date(d.date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      })
    );
    const rawDates = stats.dailyPaymentLoad.map((d) => d.date);

    return {
      chartData: dataPoints,
      chartLabels: labels,
      chartRawDates: rawDates,
    };
  }, [stats]);

  const noDailyData = useMemo(() => {
    return (
      !chartData || chartData.length === 0 || chartData.every((v) => v === 0)
    );
  }, [chartData]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  return (
    <>
      <title>Хочу Плачу - Главная</title>
      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Платежи на ближайшие 10 дней
          </h2>
          <Button onClick={handleAddPayment} label="Добавить платеж" />
        </div>

        {/* Отображение состояния загрузки или ошибки */}
        {isLoadingPayments && (
          <div className="flex justify-center items-center h-40">
            <Spinner />
          </div>
        )}
        {errorPayments && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{errorPayments.message}</span>
          </div>
        )}

        {/* Горизонтальная лента платежей */}
        {!isLoadingPayments && !errorPayments && (
          <>
            {upcomingPayments.length > 0 ? (
              <>
                {/* Desktop horizontal scroll */}
                <div className="hidden md:block">
                  <div className="relative">
                    <div
                      ref={scrollContainerRef}
                      className="flex overflow-x-auto pb-4 scrollbar-hide gap-x-4"
                    >
                      {(showAllUpcoming
                        ? upcomingPayments
                        : upcomingPayments.slice(0, 10)
                      ).map((payment) => (
                        <div key={payment.id} className="flex-shrink-0 w-68">
                          <PaymentCard
                            payment={payment}
                            onEdit={() => handleEditPayment(payment.id)}
                            onComplete={() => handleCompletePayment(payment)}
                            onDelete={() => handleDeletePayment(payment.id)}
                          />
                        </div>
                      ))}
                      {!showAllUpcoming && upcomingPayments.length > 10 && (
                        <div className="flex-shrink-0 flex items-center justify-center w-68">
                          <button
                            onClick={() => setShowAllUpcoming(true)}
                            className="p-4 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors w-full h-full font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                          >
                            Показать все
                          </button>
                        </div>
                      )}
                    </div>
                    <Scrollbar
                      containerRef={scrollContainerRef}
                      orientation="horizontal"
                    />
                  </div>
                </div>

                {/* Mobile vertical list */}
                <div className="block md:hidden space-y-2">
                  {(showAllUpcoming
                    ? upcomingPayments
                    : upcomingPayments.slice(0, 5)
                  ).map((payment) => (
                    <UpcomingPaymentListItem
                      key={payment.id}
                      payment={payment}
                    />
                  ))}
                  {!showAllUpcoming && upcomingPayments.length > 5 && (
                    <button
                      onClick={() => setShowAllUpcoming(true)}
                      className="w-full mt-2 p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      Показать все
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full text-center text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                Нет предстоящих или просроченных платежей. Добавьте первый!
              </div>
            )}
          </>
        )}

        {/* --- Блок Дашборда (из Dashboard.tsx) --- */}
        <div className="mt-8">
          {" "}
          {/* Добавляем отступ сверху */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Статистика
          </h2>
          {/* НОВЫЙ БЛОК ВЫБОРА ПЕРИОДА */}
          <div className="flex flex-wrap gap-2 items-center mb-6">
            <DropdownButton
              label={
                periodType === "month"
                  ? "Месяц"
                  : periodType === "quarter"
                  ? "Квартал"
                  : periodType === "year"
                  ? "Год"
                  : "Произвольный"
              }
              options={[
                {
                  label: "Месяц",
                  value: "month",
                  onClick: () => setPeriodType("month"),
                },
                {
                  label: "Квартал",
                  value: "quarter",
                  onClick: () => setPeriodType("quarter"),
                },
                {
                  label: "Год",
                  value: "year",
                  onClick: () => setPeriodType("year"),
                },
                {
                  label: "Произвольный",
                  value: "custom",
                  onClick: () => setPeriodType("custom"),
                },
              ]}
              selectedValue={periodType}
            />
            {/* Month dropdown */}
            {periodType === "month" && (
              <>
                <DropdownButton
                  label={monthNames[month]}
                  options={monthNames.map((name, idx) => ({
                    label: name,
                    value: idx,
                    onClick: () => setMonth(idx),
                  }))}
                  selectedValue={month}
                />
              </>
            )}
            {/* Quarter dropdown */}
            {periodType === "quarter" && (
              <>
                <DropdownButton
                  label={String(quarter + 1)}
                  options={Array.from({ length: 4 }, (_, idx) => ({
                    label: String(idx + 1),
                    value: idx,
                    onClick: () => setQuarter(idx),
                  }))}
                  selectedValue={quarter}
                />
              </>
            )}
            {/* Year input (not for custom) */}
            {periodType !== "custom" && (
              <>
                <YearSelectorDropdown
                  years={Array.from(
                    { length: 21 },
                    (_, i) => new Date().getFullYear() - 10 + i
                  )}
                  selectedYear={year}
                  onChange={setYear}
                />
              </>
            )}
            {/* Custom date range */}
            {periodType === "custom" && (
              <>
                <label className="ml-2">С:</label>
                <input
                  type="date"
                  value={customDateFrom.toISOString().split("T")[0]}
                  onChange={(e) => setCustomDateFrom(new Date(e.target.value))}
                  className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100"
                />
                <label className="ml-2">По:</label>
                <input
                  type="date"
                  value={customDateTo.toISOString().split("T")[0]}
                  onChange={(e) => setCustomDateTo(new Date(e.target.value))}
                  className="border rounded px-2 py-1 dark:bg-gray-700 dark:text-gray-100"
                />
              </>
            )}
          </div>
          {/* Состояния загрузки или ошибки для статистики */}
          {isLoadingStats && (
            <div className="flex justify-center items-center py-10">
              <Spinner />
            </div>
          )}
          {errorStats && (
            <div
              className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              {" "}
              {errorStats}{" "}
            </div>
          )}
          {/* Отображение статистики, если данные загружены */}
          {!isLoadingStats && !errorStats && stats && (
            <div className="space-y-6">
              {/* TODO: Форматировать месяц на русский */}
              {/* Блоки с общими суммами */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-800">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    Предстоящие платежи
                  </p>
                  <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {new Intl.NumberFormat("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(parseFloat(stats.totalUpcomingAmount))}
                    <span className="ml-1 text-2xl font-normal">₽</span>
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-800">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    Выполненные платежи
                  </p>
                  <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(parseFloat(stats.totalCompletedAmount))}
                    <span className="ml-1 text-2xl font-normal">₽</span>
                  </p>
                </div>
                {/* TODO: Добавить другие суммарные показатели, если нужны */}
              </div>
              {/* Блоки с графиками */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Распределение по категориям */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-col">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-6">
                    Распределение по категориям
                  </p>
                  <CategoryDistributionBars
                    data={stats.categoriesDistribution}
                    colors={
                      resolvedTheme === "dark"
                        ? categoryColorsDark
                        : categoryColorsLight
                    }
                  />
                </div>

                {/* График платежной нагрузки по дням */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-col">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Платежная нагрузка по дням
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Кликните на точку на графике, чтобы увидеть детали за день.
                  </p>
                  {noDailyData ? (
                    <div className="flex items-center justify-center h-full text-center text-gray-700 dark:text-gray-300 py-10">
                      Нет данных о платежной нагрузке за этот период.
                    </div>
                  ) : (
                    <div className="relative h-64 w-full">
                      <CustomDailySpendingChart
                        data={chartData}
                        labels={chartLabels}
                        theme={resolvedTheme}
                        rawDates={chartRawDates}
                        onPointClick={handleChartPointClick}
                        startDate={startDate}
                        endDate={endDate}
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* TODO: Добавить другие блоки статистики/графиков */}
            </div>
          )}
          {/* Сообщение, если данных нет после загрузки */}
          {!isLoadingStats && !errorStats && !stats && (
            <div className="text-center text-gray-700 dark:text-gray-300">
              Нет данных статистики для отображения.
            </div>
          )}
        </div>
      </div>
      <ConfirmCompletionDateModal
        isOpen={completionDateModalState.isOpen}
        onClose={() =>
          setCompletionDateModalState({ isOpen: false, payment: null })
        }
        onConfirm={(selectedDate) => {
          if (completionDateModalState.payment) {
            callCompleteApi(completionDateModalState.payment.id, selectedDate);
          }
        }}
        dueDate={
          completionDateModalState.payment
            ? new Date(completionDateModalState.payment.dueDate)
            : new Date()
        }
        isConfirming={isCompleting}
      />
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() =>
          setConfirmModalState({
            isOpen: false,
            action: null,
            title: "",
            message: "",
          })
        }
        onConfirm={onConfirmAction}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isConfirming={isConfirming}
      />
      {/* Modal for Daily Payments */}
      <Modal
        isOpen={!!dailyPaymentsModal}
        onClose={() => setDailyPaymentsModal(null)}
        title={`Платежи за ${
          dailyPaymentsModal?.date
            ? new Date(dailyPaymentsModal.date).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : ""
        }`}
      >
        {dailyPaymentsModal && dailyPaymentsModal.payments.length > 0 ? (
          <ul className="space-y-3">
            {dailyPaymentsModal.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
              >
                <div className="flex items-center gap-3">
                  <PaymentIconDisplay payment={p} sizeClass="h-6 w-6" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {p.title}
                  </span>
                </div>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {new Intl.NumberFormat("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(p.amount)}
                  <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                    ₽
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">
            Нет платежей на эту дату.
          </p>
        )}
      </Modal>
    </>
  );
};

export default HomePage;
