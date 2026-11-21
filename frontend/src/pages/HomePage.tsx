// src/pages/HomePage.tsx
import { useLanguage } from "../context/LanguageContext";
import { useAuth, usePreferredCurrency } from "../context/AuthContext";
import PaymentRowList from "../components/PaymentRowList";
import {
  PageContent,
  PageHeader,
  Panel,
  type PagePrimaryAction,
} from "../components/layout/Page";
import CumulativeSpendingChart from "../components/dashboard/CumulativeSpendingChart";
import CategoryBreakdown from "../components/dashboard/CategoryBreakdown";
import DashboardInsights from "../components/dashboard/DashboardInsights";
import {
  getInsightRangePeriod,
  getPreviousInsightPeriod,
  getSavedInsightRange,
  INSIGHT_RANGES,
  saveInsightRange,
  type InsightRange,
} from "../utils/dashboardInsights";
import DashboardHero from "../components/dashboard/DashboardHero";
import Money from "../components/dashboard/Money";
import { formatCurrencyTotals, formatMoney } from "../utils/currencies";
import { calculateStatsFromPayments, previousCompletedTotal, ratesNoteKey, type DashboardStats } from "../utils/dashboardStats";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import axiosInstance from "../api/axiosInstance"; // Для получения данных
import logger from "../utils/logger";
import useApi from "../hooks/useApi"; // Import useApi
import { useTheme } from "../context/ThemeContext"; // Import useTheme
import { DropdownButton } from "../components/DropdownButton";
import DatePicker from "../components/DatePicker";

import { Link, useNavigate } from "react-router-dom";
import { ArrowRightIcon, CheckCircleIcon as CheckCircleOutlineIcon } from "@heroicons/react/24/outline";
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

import getErrorMessage from "../utils/getErrorMessage";
import {
  paymentMatchesDateKey,
  formatDateToLocal,
  parseCalendarDate,
  isHourlyDateString,
} from "../utils/dateUtils";
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

// Подписи периодов блока «Наблюдения»
const insightRangeLabels: Record<InsightRange, string> = {
  "1w": "Эта неделя",
  "1m": "Этот месяц",
  "1y": "Этот год",
};

const dashboardTimeRangeOptions: SegmentedControlOption<TimeRangeOption>[] = [
  { value: "1d", label: "День" },
  { value: "1w", label: "Неделя" },
  { value: "1m", label: "Месяц" },
  { value: "1y", label: "Год" },
];

import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
import { isIncomeAndCardsEnabled } from "../utils/featureFlags";
import TotalFundsWidget from "../components/TotalFundsWidget"; // <-- New
import FundsTrendWidget from "../components/FundsTrendWidget"; // <-- New
// Define the raw API fetch function for upcoming payments
const fetchUpcomingPaymentsApi = async (
  days: number
): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/payments/upcoming", {
    params: { days },
  });
  return res.data;
};

import DeleteRecurringPaymentModal from "../components/DeleteRecurringPaymentModal";
import MobilePanel from "../components/MobilePanel";
import MobileActionBar from "../components/MobileActionBar";
// Иконки меню действий на мобильных — единый контурный набор
import {
  CheckCircleIcon as CheckOutlineIcon,
  PencilSquareIcon as PencilOutlineIcon,
  TrashIcon as TrashOutlineIcon,
} from "@heroicons/react/24/outline";



// Inside HomePage component, before UpcomingPaymentListItem
const MobileActionsOverlay: React.FC<{
  payment: PaymentData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onComplete: (payment: PaymentData) => void;
  onDelete: (payment: PaymentData) => void;
}> = ({ payment, shouldClose, onClose, onEdit, onComplete, onDelete }) => {
  const { t } = useLanguage();
  if (!payment) return null;

  const actions = [
    { label: t("Изменить"), icon: PencilOutlineIcon, handler: () => onEdit(payment.id) },
    {
      label: t("Выполнить"),
      icon: CheckOutlineIcon,
      handler: () => onComplete(payment),
    },
    { label: t("Удалить"), icon: TrashOutlineIcon, tone: "destructive" as const, handler: () => onDelete(payment) },
  ];

  return (
    <MobilePanel
      isOpen={!!payment}
      onClose={onClose}
      title=""
      shouldClose={shouldClose}
      enableBackdropClick={false}
    >
      <MobileActionBar actions={actions} onAfterSelect={onClose} />
    </MobilePanel>
  );
};

interface DashboardDemo {
  upcoming: PaymentData[];
  completed: PaymentData[];
  today: Date;
  currency: string;
  /**
   * Предпросмотр в макете телефона: блок «К оплате» обтекает плавающую кнопку меню,
   * как в мобильном приложении (кнопку рисует сам макет).
   */
  floatingMenuButton?: boolean;
}

const HomePage: React.FC<{ demo?: DashboardDemo }> = ({ demo }) => {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const preferredCurrency = usePreferredCurrency();
  const { resolvedTheme } = useTheme(); // Access the theme
  const { showToast } = useToast(); // Import useToast
  const { resetKey } = useReset();
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("dashboard");
  const currency = demo?.currency ?? preferredCurrency;
  const incomeAndCardsEnabled = !demo && isIncomeAndCardsEnabled();

  useEffect(() => {
    // На главной название страницы не показываем: раздел и так понятен по навигации
    if (!demo) setPageTitle("");
  }, [demo, setPageTitle, t]);

  const [upcomingDays, setUpcomingDays] = useState<3 | 7 | 10 | 14 | 21>(10);

  const {
    data: rawUpcomingPayments,
    isLoading: isLoadingPayments,
    error: errorPayments,
    execute: executeFetchUpcomingPayments,
  } = useApi(fetchUpcomingPaymentsApi);

  // State for transformed upcoming payments data
  const [fetchedUpcomingPayments, setUpcomingPayments] = useState<PaymentData[]>([]);
  const upcomingPayments = demo?.upcoming ?? fetchedUpcomingPayments;
  // Отслеживаем первую успешную загрузку, чтобы избежать мигания «Нет данных» до получения первых данных
  const [hasFetchedPayments, setHasLoadedPaymentsOnce] = useState(false);
  const hasLoadedPaymentsOnce = Boolean(demo) || hasFetchedPayments;

  // Effect to transform data when raw upcoming payments data changes
  useEffect(() => {
    if (demo) return;
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
        const dueDate = parseCalendarDate(p.dueDate);
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
  }, [demo, rawUpcomingPayments, upcomingDays]);

  // Effect to trigger the fetch on mount and when upcomingDays changes
  useEffect(() => {
    if (!demo) executeFetchUpcomingPayments(upcomingDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, upcomingDays, resetKey]); // Removed executeFetchUpcomingPayments to prevent infinite loop

  // --- Состояние для данных дашборда ---
  const [fetchedStats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(!demo);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  // TODO: Состояние для фильтров дашборда (если будет реализовано)
  // const [filterMonth, setFilterMonth] = useState(new Date()); // Текущий месяц по умолчанию

  // НОВОЕ: Состояние для выбора периода статистики с сегментированным контролом
  const [timeRange, setTimeRange] = useState<TimeRangeOption>(() =>
    demo ? "1m" : getInitialTimeRange()
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

  // Какое распределение показывать в блоке категорий
  const [breakdownType, setBreakdownType] = useState<"expense" | "income">("expense");

  // Фильтр списка ближайших: "overdue" или конкретная дата YYYY-MM-DD
  const [dueFilter, setDueFilter] = useState<string | null>(null);
  const filteredUpcoming = useMemo(() => {
    if (!dueFilter) return upcomingPayments;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return upcomingPayments.filter((p) => {
      const due = parseCalendarDate(p.dueDate);
      if (dueFilter === "overdue") {
        return p.status === "overdue" || due < todayStart;
      }
      return p.status !== "overdue" && formatDateToLocal(due) === dueFilter;
    });
  }, [dueFilter, upcomingPayments]);


  const { startDate, endDate } = useMemo(() => {
    if (demo) {
      // Демо: календарный месяц, как при выбранном периоде «Месяц»
      const { today } = demo;
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate, endDate };
    }
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
        case "1w": {
          // Start from Monday of current week
          const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const monday = new Date(now);
          monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          monday.setHours(0, 0, 0, 0);
          startDate = monday;
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        }
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
    demo,
    timeRange,
    periodType,
    year,
    month,
    quarter,
    customDateFrom,
    customDateTo,
  ]);

  // Демо: как и сервер, учитываем в плане предстоящие платежи периода
  const demoStats = useMemo(
    () => demo ? calculateStatsFromPayments([...demo.completed, ...demo.upcoming], startDate, endDate, demo.currency) : null,
    [demo, startDate, endDate],
  );
  // Данные, загруженные для другой валюты профиля, не показываем под новой подписью.
  const stats = demoStats ?? (fetchedStats?.currency === currency ? fetchedStats : null);

  // --- Наблюдения: свой период, независимый от статистики ---
  const [insightsRange, setInsightsRange] = useState<InsightRange>(() =>
    demo ? "1m" : getSavedInsightRange()
  );
  const insightsPeriod = useMemo(
    () => getInsightRangePeriod(insightsRange, demo?.today ?? new Date()),
    [insightsRange, demo],
  );
  const insightsPreviousPeriod = useMemo(
    () => getPreviousInsightPeriod(insightsRange, insightsPeriod.startDate, insightsPeriod.endDate),
    [insightsRange, insightsPeriod],
  );
  const [fetchedInsightsStats, setInsightsStats] = useState<DashboardStats | null>(null);
  const [fetchedInsightsPreviousTotal, setInsightsPreviousTotal] = useState<number | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(!demo);
  const insightsAbortControllerRef = useRef<AbortController | null>(null);

  // Демо: наблюдения и итог прошлого периода считаем по тем же демо-данным
  const demoInsights = useMemo(() => {
    if (!demo) return null;
    return {
      stats: calculateStatsFromPayments([...demo.completed, ...demo.upcoming], insightsPeriod.startDate, insightsPeriod.endDate, demo.currency),
      previousTotal: insightsPreviousPeriod
        ? Number(calculateStatsFromPayments(demo.completed, insightsPreviousPeriod.startDate, insightsPreviousPeriod.endDate, demo.currency).totalCompletedAmount)
        : null,
    };
  }, [demo, insightsPeriod, insightsPreviousPeriod]);
  const insightsStats = demoInsights
    ? demoInsights.stats
    : fetchedInsightsStats?.currency === currency ? fetchedInsightsStats : null;
  const insightsPreviousTotal = demoInsights ? demoInsights.previousTotal : fetchedInsightsPreviousTotal;

  const handleInsightsRangeChange = useCallback((range: InsightRange): void => {
    setInsightsRange(range);
    if (!demo) saveInsightRange(range);
  }, [demo]);

  // Загрузка данных для наблюдений: текущий период и итог предыдущего для сравнения
  const fetchInsightsStats = useCallback(async (): Promise<void> => {
    insightsAbortControllerRef.current?.abort();
    const controller = new AbortController();
    insightsAbortControllerRef.current = controller;
    setIsLoadingInsights(true);

    const toParams = (period: { startDate: Date; endDate: Date }): { startDate: string; endDate: string } => ({
      startDate: formatDateToLocal(period.startDate),
      endDate: formatDateToLocal(period.endDate),
    });

    try {
      const [currentResult, previousResult] = await Promise.allSettled([
        axiosInstance.get<DashboardStats>("/stats", { params: toParams(insightsPeriod), signal: controller.signal }),
        insightsPreviousPeriod
          ? axiosInstance.get<DashboardStats>("/stats", { params: toParams(insightsPreviousPeriod), signal: controller.signal })
          : Promise.resolve(null),
      ]);
      if (controller.signal.aborted) return;
      if (currentResult.status === "rejected") throw currentResult.reason;
      setInsightsStats(currentResult.value.data);
      // Итог прошлого периода сервер уже пересчитал по курсам на даты оплат.
      setInsightsPreviousTotal(
        previousResult.status === "fulfilled" && previousResult.value
          ? previousCompletedTotal(previousResult.value.data, currency)
          : null
      );
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      logger.error("Failed to fetch insights stats:", error instanceof Error ? error.message : String(error));
      // Без сети считаем наблюдения по офлайн-данным
      try {
        const { syncService } = await import("../utils/syncService");
        const offlineData = await syncService.getOfflineData();
        if (controller.signal.aborted) return;
        const payments = offlineData.payments ?? [];
        setInsightsStats(calculateStatsFromPayments(payments, insightsPeriod.startDate, insightsPeriod.endDate, currency));
        setInsightsPreviousTotal(insightsPreviousPeriod
          ? previousCompletedTotal(calculateStatsFromPayments(payments, insightsPreviousPeriod.startDate, insightsPreviousPeriod.endDate, currency), currency)
          : null);
      } catch (offlineError) {
        logger.error("Failed to calculate insights from offline data:", offlineError);
        setInsightsStats(null);
        setInsightsPreviousTotal(null);
      }
    } finally {
      if (insightsAbortControllerRef.current === controller) {
        insightsAbortControllerRef.current = null;
        setIsLoadingInsights(false);
      }
    }
  }, [insightsPeriod, insightsPreviousPeriod, currency]);

  useEffect(() => {
    if (!demo) fetchInsightsStats();
  }, [demo, fetchInsightsStats]);

  // Отменяем запрос наблюдений при размонтировании
  useEffect(() => () => insightsAbortControllerRef.current?.abort(), []);

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

      // Валюта и пользователь входят в ключ: при их смене тот же период загружается заново.
      const rangeKey = `${user?.id}_${currency}_${params.startDate}_${params.endDate}`;
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
        const res = await axiosInstance.get<DashboardStats>("/stats", { params, signal: controller.signal });
        if (controller.signal.aborted) return;

        const formattedStats = {
          ...res.data,
          allPaymentsInMonth:
            res.data.allPaymentsInMonth?.map((p) => ({
              ...p,
              amount:
                typeof p.amount === "string" ? parseFloat(p.amount) : p.amount,
            })) || [],
        };

        setStats(formattedStats);
        lastSuccessfulStatsKeyRef.current = rangeKey;
        logger.info("Successfully fetched dashboard stats.");
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
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

        let errorMessage = t("Неизвестная ошибка");
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
          if (controller.signal.aborted) return;

          if (offlineData.payments && offlineData.payments.length > 0) {
            const calculatedStats = calculateStatsFromPayments(
              offlineData.payments,
              startDate,
              endDate,
              currency
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

        setErrorStats(t("Не удалось загрузить статистику."));
        setStats(null);
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
    [startDate, endDate, currency, user?.id, t]
  );

  // --- Эффекты для загрузки и сброса статистики ---

  // Эффект для загрузки статистики при изменении фильтров
  useEffect(() => {
    if (!demo) fetchDashboardStats();
  }, [demo, fetchDashboardStats]);

  // Эффект для сброса фильтров на текущую дату при монтировании или по триггеру сброса
  useEffect(() => {
    if (demo) return;
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
  }, [demo, resetKey]);

  // Эффект для синхронизации timeRange с periodType (для обратной совместимости с advanced filters)
  const periodSyncKey = `${periodType}|${year}|${month}|${customDateFrom.getTime()}|${customDateTo.getTime()}`;
  const initialPeriodSyncKeyRef = useRef<string | null>(periodSyncKey);
  useEffect(() => {
    // Пропускаем синхронизацию если изменение пришло от segmented control
    if (lastChangeFromSegmentedControl.current) {
      return;
    }
    // При первом рендере период берётся из сохранённого timeRange — не перезаписываем его
    // значениями по умолчанию (иначе сначала грузится один период, а потом другой)
    if (initialPeriodSyncKeyRef.current !== null) {
      if (initialPeriodSyncKeyRef.current === periodSyncKey) return;
      initialPeriodSyncKeyRef.current = null;
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
  }, [periodType, year, month, customDateFrom, customDateTo, timeRange, periodSyncKey]);

  // Эффект для сохранения timeRange в localStorage при изменении
  useEffect(() => {
    if (!demo) localStorage.setItem("dashboard-time-range", timeRange);
  }, [demo, timeRange]);

  const navigate = useNavigate();
  // Компактная главная на мобильных: блок «К оплате» обтекает кнопку меню
  const wrapMenuButton = !demo || Boolean(demo.floatingMenuButton);
  const addPaymentAction: PagePrimaryAction = {
    label: t("Добавить платеж"),
    onClick: () => navigate("/payments/new"),
  };

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  // Скачивание вложений из списка платежей
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
      showToast(t("Не удалось скачать файл: {1}", errorMessage), "error");
    }
  };

  const closeMobilePanel = useCallback(() => {
    setShouldCloseMobilePanel(true);
  }, []);

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

  // Открытие платежа из списка ближайших: на тач-экранах — панель действий, на десктопе — редактирование
  const handleUpcomingOpen = (paymentId: string): void => {
    const isTouchLayout = window.matchMedia("(max-width: 767px)").matches;
    if (!isTouchLayout) {
      handleEditPayment(paymentId);
      return;
    }
    if (selectedMobilePaymentId === paymentId) {
      closeMobilePanel();
      return;
    }
    const nextPayment = upcomingPayments.find((p) => p.id === paymentId);
    if (!nextPayment || nextPayment.isVirtual) return;
    setShouldCloseMobilePanel(false);
    setMobileActionsPayment(nextPayment);
  };

  // --- Обработчики действий для карточек платежей ---
  const callCompleteApi = async (paymentId: string, completionDate?: Date) => {
    setIsCompleting(true);
    try {
      const payload = completionDate
        ? { completionDate: completionDate.toISOString().split("T")[0] }
        : {};
      await axiosInstance.put(`/payments/${paymentId}/complete`, payload);
      showToast(t("Платеж выполнен."), "success");
      executeFetchUpcomingPayments(upcomingDays);
      fetchDashboardStats({ force: true });
      fetchInsightsStats();
    } catch (error) {
      logger.error(`Failed to complete payment ${paymentId}:`, error);
      showToast(
        t("Не удалось выполнить платеж: {1}", t(getErrorMessage(error))),
        "error"
      );
    } finally {
      setIsCompleting(false);
      setCompletionDateModalState({ isOpen: false, payment: null });
    }
  };

  const handleCompletePayment = async (payment: PaymentData) => {
    const today = new Date();
    const dueDate = parseCalendarDate(payment.dueDate);
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
        showToast(t("Платеж перемещен в архив."), "info");
        executeFetchUpcomingPayments(upcomingDays);
        fetchDashboardStats({ force: true });
        fetchInsightsStats();
      } catch (error: unknown) {
        showToast(t("Ошибка удаления: {1}", t(getErrorMessage(error))), "error");
      } finally {
        // No error toast here, handled by catch in the modal
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: t("Удалить платеж"),
      message:
        t("Вы уверены, что хотите удалить этот платеж? Он будет перемещен в архив."),
    });
  };

  const handleDeleteInstance = async () => {
    if (!deleteRecurringModalState.payment) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(
        `/payments/${deleteRecurringModalState.payment.id}`
      );
      showToast(t("Платеж перемещен в архив."), "info");
      executeFetchUpcomingPayments(upcomingDays);
      fetchDashboardStats({ force: true });
      fetchInsightsStats();
    } catch (error: unknown) {
      showToast(t("Ошибка удаления: {1}", t(getErrorMessage(error))), "error");
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
      showToast(t("Серия платежей была деактивирована."), "success");
      executeFetchUpcomingPayments(upcomingDays);
      fetchDashboardStats({ force: true });
      fetchInsightsStats();
    } catch (error: unknown) {
      showToast(t("Ошибка удаления серии: {1}", t(getErrorMessage(error))), "error");
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
  const { isHourly } = useMemo(() => {
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
        return date.toLocaleString(locale, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return date.toLocaleDateString(locale, {
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
  }, [stats, locale]);



  const dayOptions = [
    { label: t("3 дня"), value: 3 },
    { label: t("7 дней"), value: 7 },
    { label: t("10 дней"), value: 10 },
    { label: t("14 дней"), value: 14 },
    { label: t("21 день"), value: 21 },
  ];

  // Переключение периода статистики (день/неделя/месяц/год)
  const handleTimeRangeChange = (option: TimeRangeOption): void => {
                const now = new Date();
                lastChangeFromSegmentedControl.current = true;
                setTimeRange(option);

                switch (option) {
                  case "1d": {
                    setPeriodType("custom");
                    // Start from today
                    setCustomDateFrom(
                      new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    );
                    setCustomDateTo(
                      new Date(now.getFullYear(), now.getMonth(), now.getDate())
                    );
                    break;
                  }
                  case "1w": {
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
                  }
                  case "1m": {
                    setPeriodType("month");
                    // Use current month from the 1st day
                    setMonth(now.getMonth());
                    setYear(now.getFullYear());
                    break;
                  }
                  case "1y": {
                    setPeriodType("year");
                    // Use current year from the 1st day
                    setYear(now.getFullYear());
                    break;
                  }
                }

                // Reset the flag after a short delay
                setTimeout(() => {
                  lastChangeFromSegmentedControl.current = false;
                }, 0);
  };

  return (
    <>
      {!demo && <PageMeta {...metadata} />}

      <div className="dark:text-gray-100">
        {!demo && (
          <>
            <h1 className="sr-only">{t("Главная")}</h1>
            {/* Без заголовка и без полосы шапки: на мобильных кнопка меню остаётся слева сверху,
                а блок «К оплате» обтекает её; на десктопе кнопка добавления — рядом с суммой. */}
            <PageHeader
              primaryAction={addPaymentAction}
              desktopBar={false}
              mobileBar={wrapMenuButton ? "floating" : "bar"}
            />
          </>
        )}

        <PageContent>
          {/* Центрированная область: с планшета — основная колонка и боковая справа */}
          <div className="mx-auto max-w-[1080px] space-y-12 md:pt-2 md:pb-8">
            {/* Сумма к оплате, ближайшие платежи и наблюдения справа */}
            <div className="grid grid-cols-1 items-start gap-x-6 gap-y-12 md:grid-cols-[minmax(0,1fr)_220px] app-lg:gap-x-10 app-lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="order-1 md:col-start-1 md:row-start-1">
              {/* Сумма к оплате */}
              <DashboardHero
                action={demo ? undefined : addPaymentAction}
                wrapMenuButton={wrapMenuButton}
                upcoming={upcomingPayments}
                windowLabel={dayOptions.find((o) => o.value === upcomingDays)!.label}
                currency={currency}
                activeFilter={dueFilter}
                onFilter={setDueFilter}
                onOpenPayment={handleEditPayment}
                isLoading={!hasLoadedPaymentsOnce && !errorPayments}
              />
              </div>
              {/* Наблюдения: начинаются вровень с суммой к оплате и идут рядом со списком */}
              <div className="order-3 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
                <DashboardInsights
                  stats={insightsStats}
                  startDate={insightsPeriod.startDate}
                  endDate={insightsPeriod.endDate}
                  previousPeriod={insightsPreviousPeriod}
                  previousTotal={insightsPreviousTotal}
                  timezone={demo ? undefined : user?.timezone}
                  currency={currency}
                  theme={resolvedTheme}
                  onOpenPayment={handleEditPayment}
                  isLoading={isLoadingInsights}
                  actions={
                    <DropdownButton
                      className="h-6 rounded-md px-1.5 text-xs font-medium text-gray-500 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors"
                      aria-label={t("Период наблюдений")}
                      label={t(insightRangeLabels[insightsRange])}
                      options={INSIGHT_RANGES.map((range) => ({
                        label: t(insightRangeLabels[range]),
                        value: range,
                        onClick: () => handleInsightsRangeChange(range),
                      }))}
                      selectedValue={insightsRange}
                    />
                  }
                />
              </div>
              {/* Ближайшие платежи */}
              <Panel
                className="order-2 md:col-start-1 md:row-start-2"
                variant="plain"
                title={t("Ближайшие платежи")}
                actions={
                  <>
                    <DropdownButton
                      className="h-7 rounded-md px-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors"
                      label={dayOptions.find((o) => o.value === upcomingDays)!.label}
                      options={dayOptions.map((opt) => ({
                        label: opt.label,
                        value: opt.value,
                        onClick: () =>
                          setUpcomingDays(opt.value as 3 | 7 | 10 | 14 | 21),
                      }))}
                      selectedValue={upcomingDays}
                    />
                    <Link
                      to="/payments"
                      className="hidden h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 md:inline-flex cursor-pointer"
                    >
                      {t("Все платежи")}
                      <ArrowRightIcon className="size-3" />
                    </Link>
                  </>
                }
              >
                {dueFilter && (
                  <div className="mb-2 flex h-9 items-center justify-between gap-2 rounded-md bg-gray-50 px-3 text-xs dark:bg-white/[0.03]">
                    <span className="text-gray-600 dark:text-gray-300">
                      {dueFilter === "overdue"
                        ? t("Показаны просроченные платежи")
                        : t("Показаны платежи на сегодня")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDueFilter(null)}
                      className="font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer"
                    >
                      {t("Показать все")}
                    </button>
                  </div>
                )}
                {!hasLoadedPaymentsOnce && !errorPayments && (
                  <div className="ui-skeleton-delayed">
                    <PaymentRowList payments={[]} mode="active" inset="plain" isLoading emptyMessage="" onOpen={handleEditPayment} />
                  </div>
                )}
                {errorPayments && !isLoadingPayments && (
                  <div className="md:p-4">
                    <div className="ui-alert-error" role="alert">
                      <span className="block sm:inline">{errorPayments.message}</span>
                    </div>
                  </div>
                )}

                {/* Не рендерим пустое состояние, пока не было хотя бы одной успешной загрузки */}
                {!errorPayments && hasLoadedPaymentsOnce && (
                  <div className={`ui-fade-in ui-dim-transition ${isLoadingPayments ? "ui-refreshing" : ""}`}>
                    {upcomingPayments.length > 0 ? (
                      // Один список для всех экранов: строки, сгруппированные по сроку
                      <div ref={mobileListRef}>
                        <PaymentRowList
                          payments={filteredUpcoming}
                          groupLimit={dueFilter ? undefined : 3}
                          mode="active"
                          inset="plain"
                          emptyMessage={t("Нет предстоящих или просроченных платежей.")}
                          onOpen={handleUpcomingOpen}
                          onComplete={handleCompletePayment}
                          onDelete={handleDeletePayment}
                          onDownloadFile={handleDownloadFile}
                          selectedId={selectedMobilePaymentId}
                        />
                      </div>
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-1 px-6 text-center">
                        <CheckCircleOutlineIcon className="mb-1 size-6 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("Нет предстоящих или просроченных платежей.")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Panel>
              {/* Высота блока совпадает с высотой списка слева */}
            </div>

            {/* Статистика за выбранный период */}
            <section className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {t("Статистика")}
                </h2>
                <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto">
                  <DatePicker
                    mode="range"
                    startDate={startDate}
                    endDate={endDate}
                    onRangeChange={handleStatsRangeChange}
                    variant="compact"
                    label={t("Период")}
                  />
                  <SegmentedControl
                    className="flex-shrink-0"
                    options={dashboardTimeRangeOptions.map((option) => ({ ...option, label: t(option.label) }))}
                    optionClassName="!px-1.5 md:!px-2.5"
                    selected={timeRange}
                    onChange={handleTimeRangeChange}
                  />
                </div>
              </div>

              {stats && !stats.conversionUnavailable && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t(ratesNoteKey(stats), currency)}
                </p>
              )}

              {errorStats && (
                <div className="ui-alert-error" role="alert">
                  {errorStats}
                </div>
              )}

              {stats?.conversionUnavailable ? (
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300" role="status">
                  <p>{t("Пересчёт в {1} недоступен. Показаны суммы в исходных валютах.", currency)}</p>
                  <p className="flex flex-wrap gap-x-2"><span>{t("Расходы за период")}:</span><span className="tabular-nums">{formatCurrencyTotals(stats.originalTotals.completed, locale) || "—"}</span></p>
                  <p className="flex flex-wrap gap-x-2"><span>{t("К оплате")}:</span><span className="tabular-nums">{formatCurrencyTotals(stats.originalTotals.upcoming, locale) || "—"}</span></p>
                  {incomeAndCardsEnabled && <p className="flex flex-wrap gap-x-2"><span>{t("Доходы")}:</span><span className="tabular-nums">{formatCurrencyTotals(stats.originalTotals.income, locale) || "—"}</span></p>}
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-[minmax(0,1fr)_220px] app-lg:gap-x-10 app-lg:grid-cols-[minmax(0,1fr)_300px]">
                {/* Расходы: итоги периода и график */}
                <Panel variant="plain">
                  {!stats ? (
                    !errorStats && (
                      <div className="ui-skeleton-delayed" aria-busy="true">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("Расходы за период")}</p>
                        <div className="mt-0.5 flex h-8 items-center">
                          <div className="h-6 w-60 rounded-sm bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
                        </div>
                        <div className="mt-3 h-1 w-64 max-w-full rounded-full bg-gray-100 dark:bg-white/[0.07]" />
                        <div className="mt-6 h-60 rounded-md bg-gray-100/70 animate-pulse dark:bg-white/[0.03] md:h-64" />
                      </div>
                    )
                  ) : (
                    <div className={`ui-fade-in ui-dim-transition ${isLoadingStats ? "ui-refreshing" : ""}`}>
                      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("Расходы за период")}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                            <Money
                              amount={Number(stats.totalCompletedAmount)}
                              currency={currency}
                              className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {t("из")}{" "}
                              {formatMoney(
                                Number(stats.totalCompletedAmount) + Number(stats.totalUpcomingAmount),
                                locale,
                                currency
                              )}{" "}
                              {t("запланировано")}
                            </span>
                          </p>
                          {(() => {
                            const paid = Number(stats.totalCompletedAmount) || 0;
                            const planned = paid + (Number(stats.totalUpcomingAmount) || 0);
                            const share = planned > 0 ? (paid / planned) * 100 : 0;
                            return (
                              <div className="mt-3 h-1 w-64 max-w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.07]">
                                <div
                                  className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                            );
                          })()}
                        </div>
                        {incomeAndCardsEnabled && (
                          <div className="flex flex-wrap gap-x-6 gap-y-2 pb-0.5">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t("Доходы")}</p>
                              {stats.totalIncomeAmount === null ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t("Нет данных о доходах за этот период.")}</span>
                              ) : <Money
                                amount={Number(stats.totalIncomeAmount)}
                                currency={currency}
                                className="mt-0.5 block text-sm font-semibold text-gray-900 dark:text-gray-50"
                              />}
                            </div>
                            {(() => {
                              if (stats.totalIncomeAmount === null) return null;
                              const balance =
                                Number(stats.totalIncomeAmount) -
                                Number(stats.totalCompletedAmount);
                              return (
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("Баланс")}</p>
                                  <Money
                                    amount={balance}
                                    signed
                                    currency={currency}
                                    className={`mt-0.5 block text-sm font-semibold ${balance >= 0 ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                                  />
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 h-60 md:h-64">
                        {!stats.allPaymentsInMonth || stats.allPaymentsInMonth.length === 0 ? (
                          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[var(--ui-border-strong)] text-sm text-gray-500 dark:text-gray-400">
                            {t("Нет данных о платежной нагрузке за этот период.")}
                          </div>
                        ) : (
                          <CumulativeSpendingChart
                            className="h-full"
                            payments={stats.allPaymentsInMonth}
                            startDate={startDate}
                            endDate={endDate}
                            currency={currency}
                            onSelectDate={handleChartPointClick}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </Panel>

                {/* Распределение по категориям */}
                <Panel
                  variant="plain"
                  title={t("По категориям")}
                  actions={
                    incomeAndCardsEnabled ? (
                      <SegmentedControl
                        options={[
                          { value: "expense", label: t("Расходы") },
                          { value: "income", label: t("Доходы") },
                        ]}
                        selected={breakdownType}
                        onChange={(value) => setBreakdownType(value as "expense" | "income")}
                        optionClassName="!h-6 !px-2 !text-xs"
                      />
                    ) : undefined
                  }
                  bodyClassName="pt-2"
                >
                  {!stats ? (
                    !errorStats && (
                      <div className="ui-skeleton-delayed" aria-busy="true">
                        <div className="h-2 rounded-full bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
                        <ul className="mt-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="flex h-8 items-center gap-2.5">
                              <span className="size-2 rounded-[3px] bg-gray-200 dark:bg-white/[0.08]" />
                              <span className="h-3 w-28 rounded-sm bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
                              <span className="ml-auto h-3 w-20 rounded-sm bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  ) : (
                    <div className={`ui-fade-in ui-dim-transition ${isLoadingStats ? "ui-refreshing" : ""}`}>
                    <CategoryBreakdown
                      data={
                        breakdownType === "income"
                          ? stats.incomeCategoriesDistribution
                          : stats.categoriesDistribution
                      }
                      currency={currency}
                      theme={resolvedTheme}
                      emptyMessage={
                        breakdownType === "income"
                          ? t("Нет данных о доходах за этот период.")
                          : t("Нет данных по категориям за этот период.")
                      }
                    />
                    </div>
                  )}
                </Panel>
              </div>
              )}

              {/* Обзор средств (при включённых доходах и источниках) */}
              {incomeAndCardsEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
                  <TotalFundsWidget />
                  <FundsTrendWidget timeRange={timeRange} />
                </div>
              )}
            </section>
          </div>
        </PageContent>
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
            ? parseCalendarDate(completionDateModalState.payment.dueDate)
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
            title={t("Платежи за {1}", dailyPaymentsModal?.date
                ? new Date(dailyPaymentsModal.date).toLocaleString(
                    locale,
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
                : "")}
            className="hidden md:flex"
          >
            {dailyPaymentsModal.payments.length > 0 ? (
              <ul className="space-y-1.5">
                {dailyPaymentsModal.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-3 h-11 rounded-md border border-[var(--ui-border)]"
                  >
                    <div className="flex items-center gap-3">
                      <PaymentIconDisplay payment={p} sizeClass="h-6 w-6" />
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {p.title}
                      </span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(p.amount, locale, p.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("Нет платежей на эту дату.")}
              </p>
            )}
          </Modal>
          <MobilePanel
            isOpen
            onClose={() => setDailyPaymentsModal(null)}
            title={t("Платежи за {1}", dailyPaymentsModal?.date
                ? new Date(dailyPaymentsModal.date).toLocaleString(
                    locale,
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
                : "")}
          >
            {dailyPaymentsModal.payments.length > 0 ? (
              <ul className="space-y-1.5">
                {dailyPaymentsModal.payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-3 h-11 rounded-md border border-[var(--ui-border)]"
                  >
                    <div className="flex items-center gap-3">
                      <PaymentIconDisplay payment={p} sizeClass="h-6 w-6" />
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {p.title}
                      </span>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {formatMoney(p.amount, locale, p.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("Нет платежей на эту дату.")}
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
        title={t("Выбрать период")}
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
