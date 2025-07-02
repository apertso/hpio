// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaymentCard from "../components/PaymentCard"; // Для отображения карточек
import PaymentForm from "../components/PaymentForm"; // Наша форма
import axiosInstance from "../api/axiosInstance"; // Для получения данных
import logger from "../utils/logger";
import useApi from "../hooks/useApi"; // Import useApi
import { useTheme } from "../context/ThemeContext"; // Import useTheme
import { Button } from "../components/Button";
import { DropdownButton } from "../components/DropdownButton";
import { YearSelectorDropdown } from "../components/YearSelectorDropdown";
import Spinner from "../components/Spinner";
import CategoryDistributionBars from "../components/CategoryDistributionBars";

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
  "#374151", // gray-700
  "#4B5563", // gray-600
  "#6B7280", // gray-500
  "#9CA3AF", // gray-400
  "#D1D5DB", // gray-300
  "#4F46E5", // indigo-600
  "#7C3AED", // violet-600
  "#DB2777", // pink-600
  "#F472B6", // pink-400
  "#FBBF24", // amber-400
];

import CustomDailySpendingChart from "../components/CustomDailySpendingChart";
// Интерфейс для данных статистики, получаемых с бэкенда
interface DashboardStats {
  month: string; // Например, '2023-11'
  totalUpcomingAmount: string; // Строка, т.к. DECIMAL с бэкенда
  totalCompletedAmount: string; // Строка
  categoriesDistribution: { id?: string; name: string; amount: number }[]; // id is optional for "No Category"
  dailyPaymentLoad: { date: string; amount: number }[];
  // TODO: Добавить другие поля, если бэкенд их возвращает
}

// Define the raw API fetch function for upcoming payments
const fetchUpcomingPaymentsApi = async (): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/payments/upcoming");
  return res.data;
};

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | undefined>(
    undefined
  ); // ID платежа для редактирования
  const { resolvedTheme } = useTheme(); // Access the theme

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

  // --- Функция для загрузки статистики (из Dashboard.tsx) ---
  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    setErrorStats(null);

    // НОВОЕ: Логика для определения startDate и endDate
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
        startDate = customDateFrom;
        endDate = customDateTo;
        break;
    }

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
  }, [periodType, year, month, quarter, customDateFrom, customDateTo]);

  // --- Эффект для загрузки статистики при монтировании компонента (из Dashboard.tsx) ---
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]); // Зависимость от fetchDashboardStats

  const handleOpenModal = (paymentId?: string) => {
    setEditingPaymentId(paymentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPaymentId(undefined);
    // TODO: Возможно, сбросить форму после закрытия модалки, если она не сбрасывается автоматически reset() при изменении paymentId
  };

  // Обработчик успешного сохранения платежа
  const handlePaymentSaved = () => {
    handleCloseModal();
    // После сохранения платежа, перезагружаем список предстоящих платежей И статистику
    executeFetchUpcomingPayments();
    fetchDashboardStats(); // !!! Добавили перезагрузку статистики
    alert("Платеж успешно сохранен!"); // Временное уведомление
  };

  // --- Обработчики действий для карточек платежей ---
  const handleCompletePayment = async (paymentId: string) => {
    if (
      window.confirm(
        "Вы уверены, что хотите отметить этот платеж как выполненный?"
      )
    ) {
      try {
        await axiosInstance.put(`/payments/${paymentId}/complete`);
        alert("Платеж выполнен.");
        executeFetchUpcomingPayments();
        fetchDashboardStats();
      } catch (error) {
        logger.error(`Failed to complete payment ${paymentId}:`, error);
        alert("Не удалось выполнить платеж.");
      }
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (
      window.confirm(
        "Вы уверены, что хотите удалить этот платеж? Он будет перемещен в архив."
      )
    ) {
      try {
        await axiosInstance.delete(`/payments/${paymentId}`);
        alert("Платеж перемещен в архив.");
        executeFetchUpcomingPayments();
        fetchDashboardStats();
      } catch (error) {
        logger.error(`Failed to delete payment ${paymentId}:`, error);
        alert("Не удалось удалить платеж.");
      }
    }
  };

  // --- Данные для графика (НОВАЯ, УПРОЩЕННАЯ ВЕРСИЯ) ---
  const { chartData, chartLabels } = useMemo(() => {
    if (!stats?.dailyPaymentLoad || stats.dailyPaymentLoad.length === 0) {
      return { chartData: [], chartLabels: [] };
    }

    const dataPoints = stats.dailyPaymentLoad.map((d) => d.amount);
    const labels = stats.dailyPaymentLoad.map((d) =>
      new Date(d.date).toLocaleDateString([], {
        day: "numeric",
        month: "short",
      })
    );

    return { chartData: dataPoints, chartLabels: labels };
  }, [stats]);

  const noDailyData = useMemo(() => {
    return (
      !chartData || chartData.length === 0 || chartData.every((v) => v === 0)
    );
  }, [chartData]);

  return (
    <>
      <title>Хочу Плачу - Главная</title>
      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Платежи на ближайшие 10 дней
          </h2>
          <Button onClick={() => handleOpenModal()} label="Добавить платеж" />
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
        {/* Условие для отображения ленты только при успешной загрузке и отсутствии ошибок */}
        {!isLoadingPayments && !errorPayments && (
          <div className="flex pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700 gap-x-4">
            {" "}
            {/* Tailwind классы для стилизации скроллбара */}
            {upcomingPayments.length > 0 ? (
              upcomingPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onEdit={() => handleOpenModal(payment.id)}
                  onComplete={() => handleCompletePayment(payment.id)}
                  onDelete={() => handleDeletePayment(payment.id)}
                />
              ))
            ) : (
              <div className="flex-none w-full text-center text-gray-700 dark:text-gray-300 p-4">
                Нет предстоящих или просроченных платежей. Добавьте первый!
              </div>
            )}
          </div>
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
                { label: "Месяц", onClick: () => setPeriodType("month") },
                { label: "Квартал", onClick: () => setPeriodType("quarter") },
                { label: "Год", onClick: () => setPeriodType("year") },
                {
                  label: "Произвольный",
                  onClick: () => setPeriodType("custom"),
                },
              ]}
            />
            {/* Month dropdown */}
            {periodType === "month" && (
              <>
                <DropdownButton
                  label={monthNames[month]}
                  options={monthNames.map((name, idx) => ({
                    label: name,
                    onClick: () => setMonth(idx),
                  }))}
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
                    onClick: () => setQuarter(idx),
                  }))}
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
                    {/* TODO: Форматировать сумму */}
                    {parseFloat(stats.totalUpcomingAmount).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-800">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    Выполненные платежи
                  </p>
                  <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
                    {/* TODO: Форматировать сумму */}
                    {parseFloat(stats.totalCompletedAmount).toFixed(2)}
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
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">
                    Платежная нагрузка по дням
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

        {/* Модальное окно с формой */}
        <PaymentForm
          isOpen={isModalOpen} // Pass isOpen state
          onClose={handleCloseModal} // Обработчик отмены
          paymentId={editingPaymentId} // Передаем ID для режима редактирования
          onSuccess={handlePaymentSaved} // Обработчик успеха
        />
      </div>
    </>
  );
};

export default HomePage;
