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
import { YearSelectorDropdown } from "../components/YearSelectorDropdown";
import CategoryDistributionBars from "../components/CategoryDistributionBars";

import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmCompletionDateModal from "../components/ConfirmCompletionDateModal"; // Import ConfirmCompletionDateModal
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import Modal from "../components/Modal"; // Add this import
import { useReset } from "../context/ResetContext";

// Импорт компонентов и типов из Chart.js и react-chartjs-2
import { PaymentData } from "../types/paymentData";
import getErrorMessage from "../utils/getErrorMessage";
// Icons for list items are handled inside PaymentListCard
// import { ArrowPathIcon, CalendarDaysIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

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
} from "@heroicons/react/24/solid";
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
      showCloseButton={false}
      shouldClose={shouldClose}
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
  categories: any[],
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
  } = useApi<PaymentData[]>(fetchUpcomingPaymentsApi);

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

      // Try to calculate stats from offline data
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
      setIsLoadingStats(false);
    }
  }, [startDate, endDate]); // Update dependency array

  // --- Эффекты для загрузки и сброса статистики ---

  // Эффект для загрузки статистики при изменении фильтров
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Эффект для сброса фильтров на текущую дату при монтировании или по триггеру сброса
  useEffect(() => {
    setUpcomingDays(10);
    setPeriodType("month");
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth());
    setQuarter(Math.floor(new Date().getMonth() / 3));
    // TODO: Should be reseted as well, but they don't work properly
    // setCustomDateFrom(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    // setCustomDateTo(new Date());
  }, [resetKey]); // Зависимость только от resetKey

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
      fetchDashboardStats();
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
        fetchDashboardStats();
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
      fetchDashboardStats();
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
      fetchDashboardStats();
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

  const dayOptions = [
    { label: "3 дня", value: 3 },
    { label: "7 дней", value: 7 },
    { label: "10 дней", value: 10 },
    { label: "14 дней", value: 14 },
    { label: "21 день", value: 21 },
  ];

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Ближайшие платежи
            </h2>
            <DropdownButton
              className="text-lg font-semibold text-gray-500 dark:text-gray-400"
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
                    className="flex-shrink-0 w-68 h-40 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse"
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
                      className="flex overflow-x-auto pb-4 gap-x-4"
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
                            onDelete={() => handleDeletePayment(payment)}
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
                  </div>
                </div>

                {/* Mobile vertical list */}
                <div
                  ref={mobileListRef}
                  onClick={handleMobileListClick}
                  className="block md:hidden space-y-2"
                >
                  {(showAllUpcoming
                    ? upcomingPayments
                    : upcomingPayments.slice(0, 5)
                  ).map((payment) => {
                    const isSelected = selectedMobilePaymentId === payment.id;
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
                      />
                    );
                  })}
                  {!showAllUpcoming && upcomingPayments.length > 5 && (
                    <button
                      onClick={() => setShowAllUpcoming(true)}
                      className="w-full mt-1 p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
                    >
                      Показать все
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
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
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
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-800">
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
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-800">
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
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 md:gap-6">
                {/* Распределение по категориям */}
                <div className="lg:col-span-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-col min-h-80">
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
                <div className="lg:col-span-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-6 flex flex-col h-full min-h-80">
                  <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Платежная нагрузка по дням
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Кликните на точку на графике, чтобы увидеть детали за день.
                  </p>
                  {noDailyData ? (
                    <div className="flex items-center justify-center flex-1 text-center text-gray-700 dark:text-gray-300">
                      Нет данных о платежной нагрузке за этот период.
                    </div>
                  ) : (
                    <div className="relative flex-1 w-full">
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
                ? new Date(dailyPaymentsModal.date).toLocaleDateString(
                    "ru-RU",
                    {
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
                ? new Date(dailyPaymentsModal.date).toLocaleDateString(
                    "ru-RU",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }
                  )
                : ""
            }`}
            showCloseButton
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
    </>
  );
};

export default HomePage;
