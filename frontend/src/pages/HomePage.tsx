// src/pages/HomePage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import PaymentCard from "../components/PaymentCard"; // Для отображения карточек
import PaymentListCard from "../components/PaymentListCard";
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import axiosInstance from "../api/axiosInstance"; // Для получения данных
import logger from "../utils/logger";
import useApi from "../hooks/useApi"; // Import useApi
import { useTheme } from "../context/ThemeContext"; // Import useTheme
import { Button } from "../components/Button";
import { DropdownButton } from "../components/DropdownButton";
import CategoryDistributionBars from "../components/CategoryDistributionBars";
import DatePicker from "../components/DatePicker";

import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmCompletionDateModal from "../components/ConfirmCompletionDateModal"; // Import ConfirmCompletionDateModal
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import Modal from "../components/Modal"; // Add this import
import { useReset } from "../context/ResetContext";
import SegmentedControl, {
  SegmentedControlOption,
  TimeRangeOption,
} from "../components/SegmentedControl";
import AdvancedFiltersPanel from "../components/AdvancedFiltersPanel";
import PeriodSelector from "../components/PeriodSelector";

// Импорт компонентов и типов из Chart.js и react-chartjs-2
import { PaymentData } from "../types/paymentData";

interface Category {
  id: string;
  name: string;
  builtinIconName?: string | null;
}
import getErrorMessage from "../utils/getErrorMessage";
import {
  paymentMatchesDateKey,
  formatDateToLocal,
  isHourlyDateString,
} from "../utils/dateUtils";
// Icons for list items are handled inside PaymentListCard
// import { ArrowPathIcon, CalendarDaysIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

const monthNamesGenitive = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const formatUpcomingDateHeading = (dateString: string): string => {
  const targetDate = new Date(dateString);
  if (Number.isNaN(targetDate.getTime())) {
    return dateString;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalizedTarget = new Date(targetDate);
  normalizedTarget.setHours(0, 0, 0, 0);

  const diffInMs = normalizedTarget.getTime() - today.getTime();
  const diffInDays = Math.round(diffInMs / (24 * 60 * 60 * 1000));

  if (diffInDays === 0) {
    return "Сегодня";
  }
  if (diffInDays === 1) {
    return "Завтра";
  }
  if (diffInDays === -1) {
    return "Вчера";
  }

  const day = normalizedTarget.getDate().toString();
  const monthName = monthNamesGenitive[normalizedTarget.getMonth()];
  return `${day} ${monthName}`;
};

// Define color palettes for charts
const categoryColorsLight = [
  "#FF6384", // Red
  "#36A2EB", // Blue
  "#FFCE56", // Yellow
  "#4BC0C0", // Teal/Green
  "#9966FF", // Purple
  "#FF9F40", // Orange
  "#9CA3AF", // Gray
  "#EC4899", // Pink
  "#10B981", // Emerald
  "#6366F1", // Indigo
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

const getInitialTimeRange = (): TimeRangeOption => {
  if (typeof window === "undefined") {
    return "1d";
  }

  const savedTimeRange = localStorage.getItem("dashboard-time-range");
  const allowedRanges: TimeRangeOption[] = ["1d", "1w", "1m", "1y", "custom"];

  if (
    savedTimeRange &&
    allowedRanges.includes(savedTimeRange as TimeRangeOption)
  ) {
    return savedTimeRange as TimeRangeOption;
  }

  return "1d";
};

const dashboardTimeRangeOptions: SegmentedControlOption<TimeRangeOption>[] = [
  { value: "1d", label: "День" },
  { value: "1w", label: "Неделя" },
  { value: "1m", label: "Месяц" },
  { value: "1y", label: "Год" },
];

import CustomDailySpendingChart from "../components/CustomDailySpendingChart";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
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
const fetchUpcomingPaymentsApi = async (
  days: number
): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/payments/upcoming", {
    params: { days },
  });
  return res.data;
};

import {
  PencilIcon,
  CheckCircleIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { ChevronDownIcon } from "../components/ChevronDownIcon";
import { ChevronUpIcon } from "../components/ChevronUpIcon";
import DeleteRecurringPaymentModal from "../components/DeleteRecurringPaymentModal";
import MobilePanel from "../components/MobilePanel";

// Recurrence and status formatting moved to PaymentListCard

// Inside HomePage component, before UpcomingPaymentListItem
const MobileActionsOverlay: React.FC<{
  payment: PaymentData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onComplete: (payment: PaymentData) => void;
  onDelete: (payment: PaymentData) => void;
}> = ({ payment, shouldClose, onClose, onEdit, onComplete, onDelete }) => {
  if (!payment) return null;

  const actions = [
    { label: "Изменить", icon: PencilIcon, handler: () => onEdit(payment.id) },
    {
      label: "Выполнить",
      icon: CheckCircleIcon,
      handler: () => onComplete(payment),
    },
    { label: "Удалить", icon: TrashIcon, handler: () => onDelete(payment) },
  ];

  return (
    <MobilePanel
      isOpen={!!payment}
      onClose={onClose}
      title=""
      shouldClose={shouldClose}
      enableBackdropClick={false}
    >
      <div className="flex justify-around items-center">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              action.handler();
              onClose();
            }}
            className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm">{action.label}</span>
          </button>
        ))}
      </div>
    </MobilePanel>
  );
};

// Deprecated: UpcomingPaymentListItem replaced by generic PaymentListCard

// Helper function to calculate stats from offline payments
const calculateStatsFromPayments = (
  payments: PaymentData[],
  categories: Category[],
  startDate: Date,
  endDate: Date
): DashboardStats => {
  // Filter payments within the date range
  const filteredPayments = payments.filter((p) => {
    const paymentDate =
      p.status === "completed" && p.completedAt
        ? new Date(p.completedAt)
        : new Date(p.dueDate);
    return paymentDate >= startDate && paymentDate <= endDate;
  });

  // Calculate total amounts
  const totalUpcomingAmount = filteredPayments
    .filter((p) => p.status === "upcoming" || p.status === "overdue")
    .reduce(
      (sum, p) =>
        sum + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount),
      0
    );

  const totalCompletedAmount = filteredPayments
    .filter((p) => p.status === "completed")
    .reduce(
      (sum, p) =>
        sum + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount),
      0
    );

  // Calculate categories distribution
  const categoryMap = new Map<
    string,
    { id?: string; name: string; amount: number }
  >();
  filteredPayments.forEach((p) => {
    const amount =
      typeof p.amount === "string" ? parseFloat(p.amount) : p.amount;
    if (p.category) {
      const existing = categoryMap.get(p.category.id);
      if (existing) {
        existing.amount += amount;
      } else {
        categoryMap.set(p.category.id, {
          id: p.category.id,
          name: p.category.name,
          amount: amount,
        });
      }
    } else {
      const existing = categoryMap.get("no-category");
      if (existing) {
        existing.amount += amount;
      } else {
        categoryMap.set("no-category", {
          name: "Без категории",
          amount: amount,
        });
      }
    }
  });
  const categoriesDistribution = Array.from(categoryMap.values());

  // Calculate daily payment load
  const dailyMap = new Map<string, number>();
  filteredPayments.forEach((p) => {
    const dateKey =
      p.status === "completed" && p.completedAt
        ? new Date(p.completedAt).toISOString().split("T")[0]
        : p.dueDate;
    const amount =
      typeof p.amount === "string" ? parseFloat(p.amount) : p.amount;
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + amount);
  });

  const dailyPaymentLoad = Array.from(dailyMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    month: `${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1
    ).padStart(2, "0")}`,
    totalUpcomingAmount: totalUpcomingAmount.toString(),
    totalCompletedAmount: totalCompletedAmount.toString(),
    categoriesDistribution,
    dailyPaymentLoad,
    allPaymentsInMonth: filteredPayments,
  };
};

const HomePage: React.FC = () => {
  const { resolvedTheme } = useTheme(); // Access the theme
  const { showToast } = useToast(); // Import useToast
  const { resetKey } = useReset();
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("dashboard");

  useEffect(() => {
    setPageTitle("Главная");
  }, [setPageTitle]);

  const [upcomingDays, setUpcomingDays] = useState<3 | 7 | 10 | 14 | 21>(10);

  const {
    data: rawUpcomingPayments,
    isLoading: isLoadingPayments,
    error: errorPayments,
    execute: executeFetchUpcomingPayments,
  } = useApi<PaymentData[]>((...args: unknown[]) =>
    fetchUpcomingPaymentsApi(args[0] as number)
  );

  // State for transformed upcoming payments data
  const [upcomingPayments, setUpcomingPayments] = useState<PaymentData[]>([]);
  // Отслеживаем первую успешную загрузку, чтобы избежать мигания «Нет данных» до получения первых данных
  const [hasLoadedPaymentsOnce, setHasLoadedPaymentsOnce] = useState(false);

  // Effect to transform data when raw upcoming payments data changes
  useEffect(() => {
    if (rawUpcomingPayments) {
      // Преобразуем amount из string (DECIMAL) в number при получении
      let payments = rawUpcomingPayments.map((p) => ({
        ...p,
        amount: typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
      }));

      // Filter for upcoming/overdue payments within the date range
      // (in case offline data contains all payments)
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + upcomingDays);

      payments = payments.filter((p) => {
        if (p.status !== "upcoming" && p.status !== "overdue") {
          return false;
        }
        const dueDate = new Date(p.dueDate);
        return dueDate <= futureDate;
      });

      setUpcomingPayments(payments);
      setHasLoadedPaymentsOnce(true);
      logger.info(
        `Successfully fetched and processed ${payments.length} upcoming payments.`
      );
    } else {
      // Не помечаем как loaded на null (ошибка/отмена) - чтобы не показать "нет данных" ложно
      setUpcomingPayments([]); // Clear payments if raw data is null (e.g., on error)
    }
  }, [rawUpcomingPayments, upcomingDays]);

  // Effect to trigger the fetch on mount and when upcomingDays changes
  useEffect(() => {
    executeFetchUpcomingPayments(upcomingDays);
  }, [upcomingDays, resetKey]); // Removed executeFetchUpcomingPayments to prevent infinite loop

  // --- Состояние для данных дашборда ---
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  // TODO: Состояние для фильтров дашборда (если будет реализовано)
  // const [filterMonth, setFilterMonth] = useState(new Date()); // Текущий месяц по умолчанию
  // const { user } = useAuth(); // Получаем данные пользователя, если нужно (не напрямую для API, а для логирования/отображения)

  // НОВОЕ: Состояние для выбора периода статистики с сегментированным контролом
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(() =>
    getInitialTimeRange()
  );
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const lastChangeFromSegmentedControl = useRef(false);
  const statsAbortControllerRef = useRef<AbortController | null>(null);
  const statsRequestKeyRef = useRef<string | null>(null);
  const lastSuccessfulStatsKeyRef = useRef<string | null>(null);
  const statsRequestIdRef = useRef(0);
  const hasAppliedInitialResetRef = useRef(false);

  // Legacy state for advanced filters (when using произвольный/custom)
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
  const [deleteRecurringModalState, setDeleteRecurringModalState] = useState<{
    isOpen: boolean;
    payment: PaymentData | null;
  }>({ isOpen: false, payment: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileActionsPayment, setMobileActionsPayment] =
    useState<PaymentData | null>(null);
  const [shouldCloseMobilePanel, setShouldCloseMobilePanel] = useState(false);
  const selectedMobilePaymentId = mobileActionsPayment?.id ?? null;
  const mobileListRef = useRef<HTMLDivElement | null>(null);

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const mobilePaymentsToRender = useMemo(() => {
    return showAllUpcoming ? upcomingPayments : upcomingPayments.slice(0, 5);
  }, [showAllUpcoming, upcomingPayments]);

  const desktopPaymentsToRender = useMemo(() => {
    return showAllUpcoming ? upcomingPayments : upcomingPayments.slice(0, 10);
  }, [showAllUpcoming, upcomingPayments]);

  const groupedDesktopPayments = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      payments: PaymentData[];
    }[] = [];
    const groupIndexMap = new Map<string, number>();

    desktopPaymentsToRender.forEach((payment) => {
      const dateKey = payment.dueDate;
      const existingIndex = groupIndexMap.get(dateKey);

      if (existingIndex !== undefined) {
        groups[existingIndex].payments.push(payment);
        return;
      }

      const label = formatUpcomingDateHeading(dateKey);
      groupIndexMap.set(dateKey, groups.length);
      groups.push({
        key: dateKey,
        label,
        payments: [payment],
      });
    });

    return groups;
  }, [desktopPaymentsToRender]);

  const groupedMobilePayments = useMemo(() => {
    const groups: {
      key: string;
      label: string;
      year: number | null;
      payments: PaymentData[];
    }[] = [];
    const groupIndexMap = new Map<string, number>();

    mobilePaymentsToRender.forEach((payment) => {
      const dateKey = payment.dueDate;

      const existingIndex = groupIndexMap.get(dateKey);

      if (existingIndex !== undefined) {
        groups[existingIndex].payments.push(payment);
        return;
      }

      const label = formatUpcomingDateHeading(dateKey);
      const targetDate = new Date(dateKey);
      const year = Number.isNaN(targetDate.getTime())
        ? null
        : targetDate.getFullYear();

      groupIndexMap.set(dateKey, groups.length);
      groups.push({
        key: dateKey,
        label,
        year,
        payments: [payment],
      });
    });

    return groups;
  }, [mobilePaymentsToRender]);

  const hasMultipleYears = useMemo(() => {
    const uniqueYears = new Set<number>();
    groupedMobilePayments.forEach(({ year }) => {
      if (year !== null) {
        uniqueYears.add(year);
      }
    });
    return uniqueYears.size > 1;
  }, [groupedMobilePayments]);

  const { startDate, endDate } = useMemo(() => {
    let startDate, endDate;
    const now = new Date();

    // Always use calendar periods for predefined ranges
    if (timeRange !== "custom") {
      switch (timeRange) {
        case "1d":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "1w":
          // Start from Monday of current week
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const monday = new Date(now);
          monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          monday.setHours(0, 0, 0, 0);
          startDate = monday;
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "1m":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case "1y":
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = customDateFrom;
          endDate = customDateTo;
      }
    } else {
      // Use the traditional periodType logic
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
    }
    return { startDate, endDate };
  }, [
    timeRange,
    periodType,
    year,
    month,
    quarter,
    customDateFrom,
    customDateTo,
  ]);

  const handleStatsRangeChange = useCallback(
    ([nextStart, nextEnd]: [Date | null, Date | null]) => {
      if (!nextStart || !nextEnd) {
        return;
      }

      setPeriodType("custom");
      setCustomDateFrom(nextStart);
      setCustomDateTo(nextEnd);
      setTimeRange("custom");
    },
    [setPeriodType, setCustomDateFrom, setCustomDateTo, setTimeRange]
  );

  // --- Функция для загрузки статистики (из Dashboard.tsx) ---

  const fetchDashboardStats = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const params = {
        startDate: formatDateToLocal(startDate),
        endDate: formatDateToLocal(endDate),
      };

      const rangeKey = `${params.startDate}_${params.endDate}`;
      const isSameRangeInFlight =
        statsRequestKeyRef.current === rangeKey &&
        statsAbortControllerRef.current !== null;
      const isSameRangeLoaded =
        statsAbortControllerRef.current === null &&
        lastSuccessfulStatsKeyRef.current === rangeKey;

      if (!force && (isSameRangeInFlight || isSameRangeLoaded)) {
        return;
      }

      if (statsAbortControllerRef.current) {
        statsAbortControllerRef.current.abort();
      }

      const controller = new AbortController();
      statsAbortControllerRef.current = controller;
      statsRequestKeyRef.current = rangeKey;
      const requestId = statsRequestIdRef.current + 1;
      statsRequestIdRef.current = requestId;

      setIsLoadingStats(true);
      setErrorStats(null);

      try {
        const res = await axiosInstance.get("/stats", {
          params,
          signal: controller.signal,
        });

        const formattedStats = {
          ...res.data,
          totalUpcomingAmount: parseFloat(res.data.totalUpcomingAmount),
          totalCompletedAmount: parseFloat(res.data.totalCompletedAmount),
          allPaymentsInMonth:
            res.data.allPaymentsInMonth?.map((p: PaymentData) => ({
              ...p,
              amount:
                typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
            })) || [],
        };

        setStats(formattedStats);
        lastSuccessfulStatsKeyRef.current = rangeKey;
        logger.info("Successfully fetched dashboard stats.");
      } catch (error: unknown) {
        const isAbortError =
          (error instanceof DOMException && error.name === "AbortError") ||
          (typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "ERR_CANCELED");

        if (isAbortError) {
          logger.info("Dashboard stats request was canceled.");
          return;
        }

        let errorMessage = "Неизвестная ошибка";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }
        logger.error("Failed to fetch dashboard stats:", errorMessage);

        try {
          logger.info("Attempting to calculate stats from offline data...");
          const { syncService } = await import("../utils/syncService");
          const offlineData = await syncService.getOfflineData();

          if (offlineData.payments && offlineData.payments.length > 0) {
            const calculatedStats = calculateStatsFromPayments(
              offlineData.payments,
              offlineData.categories || [],
              startDate,
              endDate
            );
            setStats(calculatedStats);
            setErrorStats(null);
            logger.info("Successfully calculated stats from offline data.");
            return;
          }
        } catch (offlineError) {
          logger.error(
            "Failed to calculate stats from offline data:",
            offlineError
          );
        }

        setErrorStats("Не удалось загрузить статистику.");
      } finally {
        if (statsAbortControllerRef.current === controller) {
          statsAbortControllerRef.current = null;
        }
        if (statsRequestKeyRef.current === rangeKey) {
          statsRequestKeyRef.current = null;
        }
        if (statsRequestIdRef.current === requestId) {
          setIsLoadingStats(false);
        }
      }
    },
    [startDate, endDate]
  );

  // --- Эффекты для загрузки и сброса статистики ---

  // Эффект для загрузки статистики при изменении фильтров
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Эффект для сброса фильтров на текущую дату при монтировании или по триггеру сброса
  useEffect(() => {
    if (!hasAppliedInitialResetRef.current) {
      hasAppliedInitialResetRef.current = true;
      return;
    }

    setUpcomingDays(10);
    setTimeRange("1d");
    // Always use calendar periods for date calculations
    setPeriodType("month");
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth());
    setQuarter(Math.floor(new Date().getMonth() / 3));
    // TODO: Should be reseted as well, but they don't work properly
    // setCustomDateFrom(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    // setCustomDateTo(new Date());
  }, [resetKey]); // Зависимость только от resetKey

  // Эффект для загрузки timeRange из localStorage при монтировании
  // Эффект для синхронизации timeRange с periodType (для обратной совместимости с advanced filters)
  useEffect(() => {
    // Пропускаем синхронизацию если изменение пришло от segmented control
    if (lastChangeFromSegmentedControl.current) {
      return;
    }

    // Определяем соответствующий timeRange на основе текущего periodType
    let derivedTimeRange: TimeRangeOption = "custom";

    const now = new Date();
    if (
      periodType === "month" &&
      month === now.getMonth() &&
      year === now.getFullYear()
    ) {
      derivedTimeRange = "1m";
    } else if (periodType === "year" && year === now.getFullYear()) {
      derivedTimeRange = "1y";
    } else if (periodType === "custom") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      if (
        customDateFrom.getTime() === today.getTime() &&
        customDateTo.getTime() === today.getTime()
      ) {
        derivedTimeRange = "1d";
      } else if (
        customDateFrom.getTime() === lastWeek.getTime() &&
        customDateTo.getTime() === today.getTime()
      ) {
        derivedTimeRange = "1w";
      } else {
        derivedTimeRange = "custom";
      }
    }

    if (derivedTimeRange !== timeRange) {
      setTimeRange(derivedTimeRange);
    }
  }, [periodType, year, month, customDateFrom, customDateTo]);

  // Эффект для сохранения timeRange в localStorage при изменении
  useEffect(() => {
    localStorage.setItem("dashboard-time-range", timeRange);
  }, [timeRange]);

  const navigate = useNavigate();

  const handleAddPayment = () => {
    navigate("/payments/new");
  };

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  // File download for attachments shown in PaymentListCard
  const handleDownloadFile = async (paymentId: string, fileName: string) => {
    try {
      const res = await axiosInstance.get(`/files/payment/${paymentId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      logger.info(`File downloaded for payment ${paymentId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `Failed to download file for payment ${paymentId}:`,
        errorMessage
      );
      showToast(`Не удалось скачать файл: ${errorMessage}`, "error");
    }
  };

  const closeMobilePanel = () => {
    setShouldCloseMobilePanel(true);
  };

  useEffect(() => {
    if (!selectedMobilePaymentId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      if (mobileListRef.current?.contains(target)) {
        return;
      }

      if (target.closest("[data-mobile-panel-content]")) {
        return;
      }

      closeMobilePanel();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [selectedMobilePaymentId, closeMobilePanel]);

  const handleMobilePanelClosed = () => {
    setMobileActionsPayment(null);
    setShouldCloseMobilePanel(false);
  };

  const handleMobileListClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLElement)) return;

    const itemElement = event.target.closest<HTMLElement>(
      "[data-mobile-list-item-id]"
    );

    if (itemElement?.dataset.mobileListItemId) {
      const { mobileListItemId } = itemElement.dataset;

      if (selectedMobilePaymentId === mobileListItemId) {
        closeMobilePanel();
        return;
      }

      const nextPayment = upcomingPayments.find(
        (paymentItem) => paymentItem.id === mobileListItemId
      );

      if (!nextPayment || nextPayment.isVirtual) {
        return;
      }

      setShouldCloseMobilePanel(false);
      setMobileActionsPayment(nextPayment);
      return;
    }

    if (event.target === event.currentTarget && selectedMobilePaymentId) {
      closeMobilePanel();
    }
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
      executeFetchUpcomingPayments(upcomingDays);
      fetchDashboardStats({ force: true });
    } catch (error) {
      logger.error(`Failed to complete payment ${paymentId}:`, error);
      showToast(
        `Не удалось выполнить платеж: ${getErrorMessage(error)}`,
        "error"
      );
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

  const handleDeletePayment = async (payment: PaymentData) => {
    if (
      payment.seriesId &&
      (payment.status === "upcoming" || payment.status === "overdue")
    ) {
      setDeleteRecurringModalState({ isOpen: true, payment: payment });
      return;
    }

    const action = async () => {
      try {
        await axiosInstance.delete(`/payments/${payment.id}`);
        showToast("Платеж перемещен в архив.", "info");
        executeFetchUpcomingPayments(upcomingDays);
        fetchDashboardStats({ force: true });
      } catch (error: unknown) {
        showToast(`Ошибка удаления: ${getErrorMessage(error)}`, "error");
      } finally {
        // No error toast here, handled by catch in the modal
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

  const handleDeleteInstance = async () => {
    if (!deleteRecurringModalState.payment) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(
        `/payments/${deleteRecurringModalState.payment.id}`
      );
      showToast("Платеж перемещен в архив.", "info");
      executeFetchUpcomingPayments(upcomingDays);
      fetchDashboardStats({ force: true });
    } catch (error: unknown) {
      showToast(`Ошибка удаления: ${getErrorMessage(error)}`, "error");
    } finally {
      setIsDeleting(false);
      setDeleteRecurringModalState({ isOpen: false, payment: null });
    }
  };

  const handleDeleteSeries = async () => {
    if (!deleteRecurringModalState.payment?.seriesId) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(
        `/series/${deleteRecurringModalState.payment.seriesId}`
      );
      showToast("Серия платежей была деактивирована.", "success");
      executeFetchUpcomingPayments(upcomingDays);
      fetchDashboardStats({ force: true });
    } catch (error: unknown) {
      showToast(`Ошибка удаления серии: ${getErrorMessage(error)}`, "error");
    } finally {
      setIsDeleting(false);
      setDeleteRecurringModalState({ isOpen: false, payment: null });
    }
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

    const paymentsForDay = stats.allPaymentsInMonth.filter((p) =>
      paymentMatchesDateKey(p, date)
    );
    setDailyPaymentsModal({ date, payments: paymentsForDay });
  };

  // --- Данные для графика (НОВАЯ, УПРОЩЕННАЯ ВЕРСИЯ) ---
  const { chartData, chartLabels, chartRawDates, isHourly } = useMemo(() => {
    if (!stats?.dailyPaymentLoad || stats.dailyPaymentLoad.length === 0) {
      return {
        chartData: [],
        chartLabels: [],
        chartRawDates: [],
        isHourly: false,
      };
    }

    const dataPoints = stats.dailyPaymentLoad.map((d) => d.amount);

    // Проверяем, если данные по часам (содержат компонент времени)
    const isHourly = stats.dailyPaymentLoad.some((d) =>
      isHourlyDateString(d.date)
    );

    const labels = stats.dailyPaymentLoad.map((d) => {
      const date = new Date(d.date);
      if (isHourly) {
        return date.toLocaleString("ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return date.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        });
      }
    });
    const rawDates = stats.dailyPaymentLoad.map((d) => d.date);

    return {
      chartData: dataPoints,
      chartLabels: labels,
      chartRawDates: rawDates,
      isHourly,
    };
  }, [stats]);

  const noDailyData = useMemo(() => {
    return (
      !chartData || chartData.length === 0 || chartData.every((v) => v === 0)
    );
  }, [chartData]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const dayOptions = [
    { label: "3 дня", value: 3 },
    { label: "7 дней", value: 7 },
    { label: "10 дней", value: 10 },
    { label: "14 дней", value: 14 },
    { label: "21 день", value: 21 },
  ];

  let lastRenderedMobileYear: number | null = null;

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Ближайшие платежи
            </h2>
            <DropdownButton
              className="text-sm font-medium text-gray-500 dark:text-gray-400"
              label={dayOptions.find((o) => o.value === upcomingDays)!.label}
              options={dayOptions.map((opt) => ({
                label: opt.label,
                value: opt.value,
                onClick: () =>
                  setUpcomingDays(opt.value as 3 | 7 | 10 | 14 | 21),
              }))}
              selectedValue={upcomingDays}
            />
          </div>
          <Button
            onClick={handleAddPayment}
            label="Добавить платеж"
            icon={<PlusIcon className="w-4 h-4" />}
            className="hidden md:inline-flex"
          />
        </div>

        {/* Отображение состояния загрузки или ошибки */}
        {isLoadingPayments && (
          // Стабильный скелетон фиксированной высоты, чтобы не было скачков и "нет данных" до загрузки
          <div className="w-full">
            <div className="hidden md:block">
              <div className="flex gap-4 pb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-72 h-40 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse"
                  />
                ))}
              </div>
            </div>
            <div className="block md:hidden space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full h-24 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}
        {errorPayments && hasLoadedPaymentsOnce && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{errorPayments.message}</span>
          </div>
        )}

        {/* Горизонтальная лента платежей */}
        {/* Не рендерим пустое состояние, пока не было хотя бы одной успешной загрузки */}
        {!isLoadingPayments && !errorPayments && hasLoadedPaymentsOnce && (
          <>
            {upcomingPayments.length > 0 ? (
              <>
                {/* Desktop horizontal scroll */}
                <div className="hidden md:block">
                  <div className="relative">
                    <div
                      ref={scrollContainerRef}
                      className="flex overflow-x-auto p-4 pb-10 gap-x-8"
                    >
                      {groupedDesktopPayments.map((group) => (
                        <div
                          key={group.key}
                          className="flex-shrink-0 flex flex-col gap-3"
                        >
                          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {group.label}
                          </h4>
                          <div className="flex gap-4">
                            {group.payments.map((payment) => (
                              <div
                                key={payment.id}
                                className="flex-shrink-0 w-72"
                              >
                                <PaymentCard
                                  payment={payment}
                                  onEdit={() => handleEditPayment(payment.id)}
                                  onComplete={() =>
                                    handleCompletePayment(payment)
                                  }
                                  onDelete={() => handleDeletePayment(payment)}
                                  hideDate
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {upcomingPayments.length > 10 && (
                        <div className="flex-shrink-0 flex flex-col gap-3">
                          <div className="h-5" aria-hidden="true"></div>
                          <div className="w-72 h-40">
                            <button
                              onClick={() =>
                                setShowAllUpcoming((prev) => !prev)
                              }
                              className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full h-full font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center justify-center gap-2"
                            >
                              {showAllUpcoming ? "Свернуть" : "Показать больше"}
                              {showAllUpcoming ? (
                                <ChevronUpIcon />
                              ) : (
                                <ChevronDownIcon />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile vertical list */}
                <div
                  ref={mobileListRef}
                  onClick={handleMobileListClick}
                  className="block md:hidden space-y-3"
                >
                  {groupedMobilePayments.map(
                    ({ key, label, year, payments }) => {
                      const shouldRenderYearHeader =
                        hasMultipleYears &&
                        year !== null &&
                        year !== lastRenderedMobileYear;

                      if (shouldRenderYearHeader) {
                        lastRenderedMobileYear = year;
                      }

                      return (
                        <div key={key} className="space-y-2">
                          {shouldRenderYearHeader && (
                            <div className="pt-4 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
                              {year}
                            </div>
                          )}
                          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 pl-4">
                            {label}
                          </div>
                          {payments.map((payment) => {
                            const isSelected =
                              selectedMobilePaymentId === payment.id;
                            const cardStateClasses = [
                              "transition-all duration-200",
                              isSelected
                                ? "border-gray-400 shadow-md relative z-50"
                                : "",
                            ]
                              .filter((cls) => cls)
                              .join(" ");
                            return (
                              <PaymentListCard
                                key={payment.id}
                                payment={payment}
                                context="home"
                                onDownloadFile={handleDownloadFile}
                                className={cardStateClasses}
                                hideDate
                              />
                            );
                          })}
                        </div>
                      );
                    }
                  )}
                  {upcomingPayments.length > 5 && (
                    <button
                      onClick={() => setShowAllUpcoming((prev) => !prev)}
                      className="w-full mt-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer flex items-center justify-center gap-2"
                    >
                      {showAllUpcoming ? "Свернуть" : "Показать больше"}
                      {showAllUpcoming ? (
                        <ChevronUpIcon />
                      ) : (
                        <ChevronDownIcon />
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : hasLoadedPaymentsOnce ? (
              // Показ "нет данных" только после подтвержденной успешной загрузки
              <div className="w-full h-44 pb-4 text-gray-700 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col sm:flex-row items-center justify-center text-center sm:text-left">
                <span className="text-lg font-medium sm:mr-6">
                  Нет предстоящих или просроченных платежей.
                </span>
              </div>
            ) : null}
          </>
        )}

        {/* --- Блок Дашборда (из Dashboard.tsx) --- */}
        <div className="mt-8">
          {" "}
          {/* Добавляем отступ сверху */}
          <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-6">
            Статистика
          </h2>
          {/* НОВЫЙ БЛОК ВЫБОРА ПЕРИОДА */}
          <div className="flex flex-wrap items-center gap-2 md:gap-6 mb-6">
            <DatePicker
              mode="range"
              startDate={startDate}
              endDate={endDate}
              onRangeChange={handleStatsRangeChange}
              variant="compact"
              label="Период"
            />
            <SegmentedControl
              className="flex-shrink-0"
              options={dashboardTimeRangeOptions}
              optionClassName="!px-2 md:!px-4"
              selected={timeRange}
              onChange={(option) => {
                const now = new Date();
                lastChangeFromSegmentedControl.current = true;
                setTimeRange(option);

                switch (option) {
                  case "1d":
                    setPeriodType("custom");
                    // Start from today
                    setCustomDateFrom(
                      new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    );
                    setCustomDateTo(
                      new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    );
                    break;
                  case "1w":
                    setPeriodType("custom");
                    // Start from Monday of current week
                    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const monday = new Date(now);
                    monday.setDate(
                      now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
                    );
                    monday.setHours(0, 0, 0, 0);
                    setCustomDateFrom(monday);
                    setCustomDateTo(
                      new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    );
                    break;
                  case "1m":
                    setPeriodType("month");
                    // Use current month from the 1st day
                    setMonth(now.getMonth());
                    setYear(now.getFullYear());
                    break;
                  case "1y":
                    setPeriodType("year");
                    // Use current year from the 1st day
                    setYear(now.getFullYear());
                    break;
                }

                // Reset the flag after a short delay
                setTimeout(() => {
                  lastChangeFromSegmentedControl.current = false;
                }, 0);
              }}
            />
          </div>
          {/* Состояния загрузки или ошибки для статистики */}
          {isLoadingStats && (
            // Стабильный скелетон для блока статистики чтобы избежать мигания
            <div className="space-y-2 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800 animate-pulse"
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800 animate-pulse" />
                <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-800 animate-pulse" />
              </div>
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
            <div className="space-y-2 md:space-y-6">
              {/* TODO: Форматировать месяц на русский */}
              {/* Блоки с общими суммами */}
              <div className="grid grid-cols-2 gap-2 md:gap-6">
                <div className="card-base p-6">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    <span className="md:hidden">Предстоящие</span>
                    <span className="hidden md:inline">
                      Предстоящие платежи
                    </span>
                  </p>
                  <p className="mt-1 text-xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {new Intl.NumberFormat("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(parseFloat(stats.totalUpcomingAmount))}
                    <span className="ml-1 text-lg md:text-2xl font-normal">
                      ₽
                    </span>
                  </p>
                </div>
                <div className="card-base p-6">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                    <span className="md:hidden">Выполненные</span>
                    <span className="hidden md:inline">
                      Выполненные платежи
                    </span>
                  </p>
                  <p className="mt-1 text-xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                    {new Intl.NumberFormat("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(parseFloat(stats.totalCompletedAmount))}
                    <span className="ml-1 text-lg md:text-2xl font-normal">
                      ₽
                    </span>
                  </p>
                </div>
                {/* TODO: Добавить другие суммарные показатели, если нужны */}
              </div>
              {/* Блоки с графиками */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Распределение по категориям */}
                <div className="lg:col-span-2 card-base p-6 flex flex-col min-h-80">
                  <p className="text-base font-medium text-gray-900 dark:text-white mb-6">
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

                {/* График платежной нагрузки по дням/часам */}
                <div className="lg:col-span-3 card-base p-6 flex flex-col h-full min-h-80 max-h-[360px]">
                  <div className="mb-6">
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      Платежная нагрузка {isHourly ? "по часам" : "по дням"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Кликните на точку на графике, чтобы увидеть детали
                    </p>
                  </div>
                  {noDailyData ? (
                    <div className="flex items-center justify-center flex-1 text-center text-gray-500 dark:text-gray-400 text-sm">
                      Нет данных о платежной нагрузке за этот период.
                    </div>
                  ) : (
                    <div className="relative flex-1 w-full min-h-[200px] max-h-[360px] min-h-0">
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
      {dailyPaymentsModal && (
        <>
          <Modal
            isOpen
            onClose={() => setDailyPaymentsModal(null)}
            title={`Платежи за ${
              dailyPaymentsModal?.date
                ? new Date(dailyPaymentsModal.date).toLocaleString(
                    "ru-RU",
                    isHourly
                      ? {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      : {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                  )
                : ""
            }`}
            className="hidden md:flex"
          >
            {dailyPaymentsModal.payments.length > 0 ? (
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
          <MobilePanel
            isOpen
            onClose={() => setDailyPaymentsModal(null)}
            title={`Платежи за ${
              dailyPaymentsModal?.date
                ? new Date(dailyPaymentsModal.date).toLocaleString(
                    "ru-RU",
                    isHourly
                      ? {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      : {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                  )
                : ""
            }`}
          >
            {dailyPaymentsModal.payments.length > 0 ? (
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
          </MobilePanel>
        </>
      )}
      <DeleteRecurringPaymentModal
        isOpen={deleteRecurringModalState.isOpen}
        onClose={() =>
          setDeleteRecurringModalState({ isOpen: false, payment: null })
        }
        onDeleteInstance={handleDeleteInstance}
        onDeleteSeries={handleDeleteSeries}
        isProcessing={isDeleting}
      />
      <MobileActionsOverlay
        payment={mobileActionsPayment}
        shouldClose={shouldCloseMobilePanel}
        onClose={handleMobilePanelClosed}
        onEdit={handleEditPayment}
        onComplete={handleCompletePayment}
        onDelete={handleDeletePayment}
      />
      <AdvancedFiltersPanel
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        title="Выбрать период"
      >
        <PeriodSelector
          initialDateRange={[customDateFrom, customDateTo]}
          onApply={([startDate, endDate]) => {
            setCustomDateFrom(startDate);
            setCustomDateTo(endDate);
            setIsAdvancedFiltersOpen(false);
          }}
          onCancel={() => setIsAdvancedFiltersOpen(false)}
        />
      </AdvancedFiltersPanel>
    </>
  );
};

export default HomePage;
