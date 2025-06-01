// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import PaymentCard from "../components/PaymentCard"; // Для отображения карточек
import PaymentForm from "../components/PaymentForm"; // Наша форма
import axiosInstance from "../api/axiosInstance"; // Для получения данных
import logger from "../utils/logger";
import useApi from "../hooks/useApi"; // Import useApi
import { useTheme } from "../context/ThemeContext"; // Import useTheme

// Импорт компонентов и типов из Chart.js и react-chartjs-2
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
  ChartOptions,
  TooltipItem,
} from "chart.js"; // Импорт нужных элементов
import { Pie, Line } from "react-chartjs-2"; // Или Bar/Line, если нужно
import { PaymentData } from "../types/paymentData";

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

// Регистрация необходимых элементов Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

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

  // --- Функция для загрузки статистики (из Dashboard.tsx) ---
  const fetchDashboardStats = useCallback(async () => {
    setIsLoadingStats(true);
    setErrorStats(null);
    try {
      // TODO: Передать параметры фильтрации, если они будут
      // const month = filterMonth.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
      // const res = await axiosInstance.get('/stats', { params: { month } }); // Пример с параметром месяца
      const res = await axiosInstance.get("/stats/current-month"); // Получаем только текущий месяц по фиксированному эндпоинту

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
  }, []); // TODO: Добавить в зависимости: filterMonth (если будут фильтры)

  // --- Эффект для загрузки статистики при монтировании компонента (из Dashboard.tsx) ---
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]); // Зависимость от fetchDashboardStats

  const formattedMonth = useMemo(() => {
    if (!stats || !stats.month) return "";
    const [year, month] = stats.month.split("-");
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }, [stats]);

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

  // --- Данные для графиков (из Dashboard.tsx) ---

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

  // Данные для круговой диаграммы (распределение по категориям)
  const categoriesChartData = useMemo(() => {
    const backgroundColors =
      resolvedTheme === "dark" ? categoryColorsDark : categoryColorsLight;
    return {
      labels: stats?.categoriesDistribution.map((cat) => cat.name) || [], // Названия категорий
      datasets: [
        {
          label: "Сумма",
          data: stats?.categoriesDistribution.map((cat) => cat.amount) || [], // Суммы по категориям
          backgroundColor: backgroundColors.slice(
            0,
            stats?.categoriesDistribution.length || 0
          ), // Use appropriate colors
          borderColor:
            resolvedTheme === "dark" ? "rgb(31, 41, 55)" : "rgb(255, 255, 255)", // Example: dark:border-gray-800, light:border-white
          borderWidth: 1,
        },
      ],
    };
  }, [stats, resolvedTheme]);

  // Опции для круговой диаграммы
  const categoriesChartOptions: ChartOptions<"pie"> = useMemo(
    () => ({
      responsive: true, // Адаптивность
      plugins: {
        legend: {
          position: "right" as const, // Позиция легенды
          labels: {
            color:
              resolvedTheme === "dark"
                ? "rgb(209, 213, 219)"
                : "rgb(55, 65, 81)", // Dynamic color
          },
        },
        title: {
          display: true,
          text: "Распределение по категориям",
          color:
            resolvedTheme === "dark" ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)", // Dynamic color
        },
        tooltip: {
          bodyColor:
            resolvedTheme === "dark" ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)",
          titleColor:
            resolvedTheme === "dark" ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)",
          callbacks: {
            label: (context: TooltipItem<"pie">) => {
              const label = context.label || "";
              const value = typeof context.raw === "number" ? context.raw : 0;
              const dataset = context.chart.data.datasets[context.datasetIndex];
              // Accept Chart.js data types: number | { raw: number } | { y: number } | [number, number]
              const total = Array.isArray(dataset.data)
                ? dataset.data.reduce((sum: number, v: unknown) => {
                    if (typeof v === "number") return sum + v;
                    if (v && typeof v === "object") {
                      // Use type assertion to a generic object
                      const obj = v as Record<string, unknown>;
                      if ("raw" in obj && typeof obj.raw === "number")
                        return sum + obj.raw;
                      if ("y" in obj && typeof obj.y === "number")
                        return sum + obj.y;
                    }
                    if (Array.isArray(v) && typeof v[1] === "number")
                      return sum + v[1];
                    return sum;
                  }, 0)
                : 0;
              const percentage =
                typeof total === "number" && total > 0
                  ? ((value / total) * 100).toFixed(1) + "%"
                  : "0%";
              return `${label}: ${value.toFixed(2)} (${percentage})`;
            },
          },
        },
      },
      maintainAspectRatio: false, // Отключаем поддержку соотношения сторон для контроля размера
    }),
    [resolvedTheme]
  );

  // Данные для графика платежной нагрузки (по дням)
  const dailyLoadChartData = useMemo(() => {
    return {
      labels:
        stats?.dailyPaymentLoad.map((d) =>
          new Date(d.date).toLocaleDateString([], {
            day: "numeric",
            month: "short",
          })
        ) || [],
      datasets: [
        {
          label: "Сумма платежей",
          data: stats?.dailyPaymentLoad.map((d) => d.amount) || [],
          fill: false,
          borderColor:
            resolvedTheme === "dark" ? "rgb(59, 130, 246)" : "rgb(37, 99, 235)", // Dynamic color
          backgroundColor:
            resolvedTheme === "dark" ? "rgb(59, 130, 246)" : "rgb(37, 99, 235)", // For points
          tension: 0.1,
        },
      ],
    };
  }, [stats, resolvedTheme]);

  // Опции для графика платежной нагрузки
  const dailyLoadChartOptions: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      plugins: {
        legend: {
          display: false, // Скрыть легенду
        },
        title: {
          display: true,
          text: "Платежная нагрузка по дням",
          color:
            resolvedTheme === "dark" ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)", // Dynamic color
        },
        tooltip: {
          bodyColor:
            resolvedTheme === "dark" ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)",
          titleColor:
            resolvedTheme === "dark" ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)",
          callbacks: {
            label: (context: TooltipItem<"line">) => {
              const label = context.dataset.label || "";
              const value = typeof context.raw === "number" ? context.raw : 0;
              return `${label}: ${value.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          // Ось X (даты)
          title: {
            display: true,
            text: "Дата",
            color:
              resolvedTheme === "dark"
                ? "rgb(156, 163, 175)"
                : "rgb(107, 114, 128)",
          }, // Dynamic color
          type: "category" as const, // Тип оси для категорий (дат)
          ticks: {
            color:
              resolvedTheme === "dark"
                ? "rgb(156, 163, 175)"
                : "rgb(107, 114, 128)",
          }, // Dynamic color
          grid: {
            color:
              resolvedTheme === "dark"
                ? "rgba(107, 114, 128, 0.3)"
                : "rgba(209, 213, 219, 0.5)",
          }, // Lighter grid lines for dark
        },
        y: {
          // Ось Y (суммы)
          title: {
            display: true,
            text: "Сумма",
            color:
              resolvedTheme === "dark"
                ? "rgb(156, 163, 175)"
                : "rgb(107, 114, 128)",
          }, // Dynamic color
          ticks: {
            color:
              resolvedTheme === "dark"
                ? "rgb(156, 163, 175)"
                : "rgb(107, 114, 128)",
          }, // Dynamic color
          grid: {
            color:
              resolvedTheme === "dark"
                ? "rgba(107, 114, 128, 0.3)"
                : "rgba(209, 213, 219, 0.5)",
          },
        },
      },
      maintainAspectRatio: false, // Отключаем поддержку соотношения сторон
    }),
    [resolvedTheme]
  );

  // Если нет данных для графика (например, нет платежей в этом месяце)
  const noCategoriesData =
    !stats?.categoriesDistribution ||
    stats.categoriesDistribution.length === 0 ||
    stats.categoriesDistribution.every((cat) => cat.amount === 0);
  const noDailyData =
    !stats?.dailyPaymentLoad ||
    stats.dailyPaymentLoad.length === 0 ||
    stats.dailyPaymentLoad.every((day) => day.amount === 0);

  return (
    <>
      <title>Мои Платежи - Главная</title>
      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Платежи на ближайшие 10 дней
          </h2>
          <button
            onClick={() => handleOpenModal()} // Открываем модалку для создания (без ID)
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            Добавить платеж
          </button>
        </div>

        {/* Отображение состояния загрузки или ошибки */}
        {isLoadingPayments && (
          <div className="text-center text-gray-700 dark:text-gray-300">
            Загрузка платежей... {/* TODO: Добавить спиннер */}
          </div>
        )}
        {errorPayments && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{errorPayments.message}</span>
          </div>
        )}

        {/* Горизонтальная лента платежей */}
        {/* Условие для отображения ленты только при успешной загрузке и отсутствии ошибок */}
        {!isLoadingPayments && !errorPayments && (
          <div className="flex overflow-x-auto pb-4 -mx-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700">
            {" "}
            {/* Tailwind классы для стилизации скроллбара */}
            {upcomingPayments.length > 0 ? (
              upcomingPayments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment} // Передаем реальные данные
                  onClick={() => handleOpenModal(payment.id)} // Открываем модалку редактирования с реальным ID
                  colorClass="text-white"
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
          {/* Состояния загрузки или ошибки для статистики */}
          {isLoadingStats && (
            <div className="text-center text-gray-700 dark:text-gray-300">
              Загрузка статистики... {/* TODO: Добавить спиннер */}
            </div>
          )}
          {errorStats && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              {" "}
              {errorStats}{" "}
            </div>
          )}
          {/* Отображение статистики, если данные загружены */}
          {!isLoadingStats && !errorStats && stats && (
            <div className="space-y-6">
              {/* Заголовок текущего месяца */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Статистика за {formattedMonth}
              </h3>{" "}
              {/* TODO: Форматировать месяц на русский */}
              {/* Блоки с общими суммами */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6">
                  <p className="text-lg font-medium text-gray-500 dark:text-gray-300">
                    Предстоящие платежи (месяц)
                  </p>
                  <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {/* TODO: Форматировать сумму */}
                    {parseFloat(stats.totalUpcomingAmount).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6">
                  <p className="text-lg font-medium text-gray-500 dark:text-gray-300">
                    Выполненные платежи (месяц)
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
                {/* Круговая диаграмма (распределение по категориям) */}
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6 flex flex-col items-center">
                  {noCategoriesData ? (
                    <div className="text-center text-gray-700 dark:text-gray-300 py-10">
                      Нет данных по категориям за этот месяц.
                    </div>
                  ) : (
                    // Высота контейнера для графика
                    <div className="relative h-80 w-full">
                      {" "}
                      {/* Задаем фиксированную высоту */}
                      <Pie
                        data={categoriesChartData}
                        options={categoriesChartOptions}
                      />
                    </div>
                  )}
                </div>

                {/* График платежной нагрузки по дням */}
                <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-6 flex flex-col items-center">
                  {noDailyData ? (
                    <div className="text-center text-gray-700 dark:text-gray-300 py-10">
                      Нет данных о платежной нагрузке за этот месяц.
                    </div>
                  ) : (
                    // Высота контейнера для графика
                    <div className="relative h-80 w-full">
                      {" "}
                      {/* Задаем фиксированную высоту */}
                      {/* Используем Line график для платежной нагрузки */}
                      <Line
                        data={dailyLoadChartData}
                        options={dailyLoadChartOptions}
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
