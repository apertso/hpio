// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from "react";
import PaymentCard from "../components/PaymentCard"; // Для отображения карточек
import PaymentForm from "../components/PaymentForm"; // Наша форма
import Modal from "../components/Modal"; // Наше модальное окно
import axiosInstance from "../api/axiosInstance"; // Для получения данных
import logger from "../utils/logger";
import { useAuth } from "../context/AuthContext"; // Если нужно userId (хотя axiosInstance с ним работает)

// Импорт компонентов и типов из Chart.js и react-chartjs-2
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  PointElement,
  LineElement,
} from "chart.js"; // Импорт нужных элементов
import { Pie, Line } from "react-chartjs-2"; // Или Bar/Line, если нужно

// Регистрация необходимых элементов Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  PointElement,
  LineElement
); // Добавил элементы для Bar и Line графиков

// Интерфейс для данных платежа, получаемых с бэкенда (уточнить при необходимости)
interface PaymentData {
  id: string;
  title: string;
  amount: number; // number, т.к. бэкенд возвращает DECIMAL как string, но мы конвертируем на фронте
  dueDate: string; // YYYY-MM-DD
  status: "upcoming" | "overdue" | "completed" | "deleted"; // Статусы из ТЗ
  isRecurrent: boolean;
  filePath?: string | null; // !!! Добавлено поле для пути к файлу
  fileName?: string | null; // !!! Добавлено поле для имени файла
  // !!! Добавлены поля иконки
  iconType?: "builtin" | "custom" | null;
  builtinIconName?: string | null;
  iconPath?: string | null;
  // TODO: Добавить другие поля: category
}

// Интерфейс для данных статистики, получаемых с бэкенда
interface DashboardStats {
  month: string; // Например, '2023-11'
  totalUpcomingAmount: string; // Строка, т.к. DECIMAL с бэкенда
  totalCompletedAmount: string; // Строка
  categoriesDistribution: { id?: string; name: string; amount: number }[]; // id опционален для "Без категории"
  dailyPaymentLoad: { date: string; amount: number }[];
  // TODO: Добавить другие поля, если бэкенд их возвращает
}

const HomePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | undefined>(
    undefined
  ); // ID платежа для редактирования

  // Состояние для хранения списка платежей, статуса загрузки и ошибки
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentData[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [errorPayments, setErrorPayments] = useState<string | null>(null);

  // --- Состояние для данных дашборда ---
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  // TODO: Состояние для фильтров дашборда (если будет реализовано)
  // const [filterMonth, setFilterMonth] = useState(new Date()); // Текущий месяц по умолчанию

  // const { user } = useAuth(); // Получаем данные пользователя, если нужно (не напрямую для API, а для логирования/отображения)

  // Функция для загрузки предстоящих платежей
  // Используем useCallback, чтобы функция не пересоздавалась при каждом рендере,
  // если она используется как зависимость в useEffect или передается дочерним компонентам
  const fetchUpcomingPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    setErrorPayments(null); // Сбрасываем предыдущие ошибки
    try {
      const res = await axiosInstance.get("/payments/upcoming");
      // Преобразуем amount из string (DECIMAL) в number при получении
      const payments = res.data.map((p: any) => ({
        ...p,
        amount: parseFloat(p.amount), // Преобразуем в число
      }));
      setUpcomingPayments(payments);
      logger.info(`Successfully fetched ${payments.length} upcoming payments.`);
    } catch (error: any) {
      logger.error(
        "Failed to fetch upcoming payments:",
        error.response?.data?.message || error.message
      );
      setErrorPayments("Не удалось загрузить предстоящие платежи.");
    } finally {
      setIsLoadingPayments(false);
    }
  }, []); // Пустой массив зависимостей, т.к. функция не зависит от состояния компонента или пропсов, которые могут меняться

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
    } catch (error: any) {
      logger.error(
        "Failed to fetch dashboard stats:",
        error.response?.data?.message || error.message
      );
      setErrorStats("Не удалось загрузить статистику.");
    } finally {
      setIsLoadingStats(false);
    }
  }, []); // TODO: Добавить в зависимости: filterMonth (если будут фильтры)

  // Эффект для загрузки данных при монтировании компонента
  useEffect(() => {
    fetchUpcomingPayments();
    // NOTE: fetchUpcomingPayments добавлена в зависимости, т.к. она обернута useCallback
  }, [fetchUpcomingPayments]); // Зависимость от fetchUpcomingPayments

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
    fetchUpcomingPayments();
    fetchDashboardStats(); // !!! Добавили перезагрузку статистики
    alert("Платеж успешно сохранен!"); // Временное уведомление
  };

  // --- Данные для графиков (из Dashboard.tsx) ---

  // Данные для круговой диаграммы (распределение по категориям)
  const categoriesChartData = {
    labels: stats?.categoriesDistribution.map((cat) => cat.name) || [], // Названия категорий
    datasets: [
      {
        label: "Сумма",
        data: stats?.categoriesDistribution.map((cat) => cat.amount) || [], // Суммы по категориям
        backgroundColor: [
          // Цвета для секторов (пример)
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
          "rgba(199, 199, 199, 0.6)",
        ],
        borderColor: [
          // Границы секторов
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 159, 64, 1)",
          "rgba(199, 199, 199, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Опции для круговой диаграммы
  const categoriesChartOptions = {
    responsive: true, // Адаптивность
    plugins: {
      legend: {
        position: "right" as const, // Позиция легенды
        labels: {
          color: "rgb(107 114 128)", // Цвет текста легенды (для темной темы)
          // TODO: Адаптировать цвет текста легенды под текущую тему (светлая/темная)
        },
      },
      title: {
        display: true,
        text: "Распределение по категориям",
        color: "rgb(17 24 39)", // Цвет заголовка графика (для светлой темы)
        // TODO: Адаптировать цвет заголовка под текущую тему
      },
      tooltip: {
        // Настройки всплывающих подсказок
        callbacks: {
          label: (context: any) => {
            const label = context.label || "";
            const value = context.raw as number;
            const total = context.chart.data.datasets[0].data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
            return `${label}: ${value.toFixed(2)} (${percentage})`; // Форматирование всплывающей подсказки
          },
        },
      },
    },
    maintainAspectRatio: false, // Отключаем поддержку соотношения сторон для контроля размера
  };

  // Данные для графика платежной нагрузки (по дням)
  const dailyLoadChartData = {
    labels: stats?.dailyPaymentLoad.map((day) => day.date) || [], // Даты
    datasets: [
      {
        label: "Сумма платежей",
        data: stats?.dailyPaymentLoad.map((day) => day.amount) || [], // Суммы по дням
        borderColor: "rgb(54, 162, 235)", // Цвет линии
        backgroundColor: "rgba(54, 162, 235, 0.5)", // Цвет заливки под линией (для Line) или цвета столбиков (для Bar)
        tension: 0.1, // Сглаживание линии (для Line)
        fill: false, // Не заливать область под линией (для Line)
      },
    ],
  };

  // Опции для графика платежной нагрузки
  const dailyLoadChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Скрыть легенду
      },
      title: {
        display: true,
        text: "Платежная нагрузка по дням",
        color: "rgb(17 24 39)", // Цвет заголовка
        // TODO: Адаптировать цвет заголовка и осей под текущую тему
      },
      tooltip: {
        // Настройки всплывающих подсказок
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || "";
            const value = context.raw as number;
            return `${label}: ${value.toFixed(2)}`; // Форматирование
          },
        },
      },
    },
    scales: {
      x: {
        // Ось X (даты)
        title: { display: false, text: "Дата" },
        type: "category" as const, // Тип оси для категорий (дат)
        ticks: { color: "rgb(107 114 128)" }, // Цвет меток оси
      },
      y: {
        // Ось Y (суммы)
        title: { display: true, text: "Сумма", color: "rgb(107 114 128)" },
        ticks: { color: "rgb(107 114 128)" }, // Цвет меток оси
      },
    },
    maintainAspectRatio: false, // Отключаем поддержку соотношения сторон
  };

  // TODO: Адаптировать цвета текста в графиках (заголовки, метки, легенда) под текущую тему (светлая/темная)
  // Можно использовать хук useTheme для получения resolvedTheme и динамически менять цвета в options

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
          <span className="block sm:inline">{errorPayments}</span>
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
              Статистика за {stats.month}
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
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPaymentId ? "Редактировать платеж" : "Добавить платеж"}
      >
        <PaymentForm
          paymentId={editingPaymentId} // Передаем ID для режима редактирования
          onSuccess={handlePaymentSaved} // Обработчик успеха
          onCancel={handleCloseModal} // Обработчик отмены
        />
      </Modal>
    </div>
  );
};

export default HomePage;
