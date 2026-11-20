import { parseCalendarDate } from "../utils/dateUtils";
import PaymentRowList from "../components/PaymentRowList";
import ToolbarSearch from "../components/ToolbarSearch";
import { Panel } from "../components/layout/Page";
import { localizedCategoryName } from "../utils/categoryLabel";
// src/pages/PaymentsPage.tsx
import { useLanguage } from "../context/LanguageContext";
import React, { useState, useEffect, useRef, useMemo } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import useApi from "../hooks/useApi";
import { Button } from "../components/Button";
import { PaymentData } from "../types/paymentData";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import ConfirmCompletionDateModal from "../components/ConfirmCompletionDateModal";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import ConfirmModal from "../components/ConfirmModal";
import DeleteRecurringPaymentModal from "../components/DeleteRecurringPaymentModal";
import getErrorMessage from "../utils/getErrorMessage";
import SegmentedControl, {
  SegmentedControlOption,
} from "../components/SegmentedControl";
import {
  PencilIcon as PencilSolidIcon,
  CheckCircleIcon as CheckSolidIcon,
  TrashIcon as TrashSolidIcon,
  ArrowPathIcon as ArrowPathSolidIcon,
} from "@heroicons/react/24/solid";
import { AdjustmentsHorizontalIcon, PlusIcon } from "@heroicons/react/24/outline";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";
import AdvancedFiltersPanel from "../components/AdvancedFiltersPanel";
import Select from "../components/Select";
import useCategories from "../hooks/useCategories";
import useDebounce from "../hooks/useDebounce";

type PaymentTabType = "all" | "active" | "archive" | "trash";

const paymentFilterOptions: SegmentedControlOption<PaymentTabType>[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Ожидаемые" },
  { value: "archive", label: "Выполненные" },

  { value: "trash", label: "Корзина" },
];

interface FilterState {
  search: string;
  categoryId: string | null;
  isRecurring: "all" | "true" | "false";
  hasFile: "all" | "true" | "false";
}

const initialFilterState: FilterState = {
  search: "",
  categoryId: null,
  isRecurring: "all",
  hasFile: "all",
};

const PAYMENTS_STATE_STORAGE_KEY = "paymentsPageState";
const NO_CATEGORY_FILTER_VALUE = "__NO_CATEGORY__";
const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";
const PAYMENT_BATCH_SIZE = 48;

const isBooleanFilterValue = (
  value: unknown
): value is FilterState["isRecurring"] => {
  return value === "all" || value === "true" || value === "false";
};

const getStoredFilterState = (): FilterState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PAYMENTS_STATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const filters = (parsed as { filters?: Partial<FilterState> }).filters;
    if (!filters || typeof filters !== "object") {
      return null;
    }

    const search = typeof filters.search === "string" ? filters.search : "";
    const categoryId =
      typeof filters.categoryId === "string"
        ? filters.categoryId
        : filters.categoryId === null
        ? null
        : null;
    const isRecurring = isBooleanFilterValue(filters.isRecurring)
      ? filters.isRecurring
      : "all";
    const hasFile = isBooleanFilterValue(filters.hasFile)
      ? filters.hasFile
      : "all";

    return {
      search,
      categoryId,
      isRecurring,
      hasFile,
    };
  } catch (error) {
    logger.error("Failed to read saved payments filters", error);
    return null;
  }
};

type MobileActionsOverlayProps = {
  payment: PaymentData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onComplete: (payment: PaymentData) => void;
  onDelete: (payment: PaymentData) => void;
  onRestore: (payment: PaymentData) => void;
  onPermanentDelete: (id: string) => void;
  activeTab: PaymentTabType;
};

const MobileActionsOverlay = ({
  payment,
  shouldClose,
  onClose,
  onEdit,
  onComplete,
  onDelete,
  onRestore,
  onPermanentDelete,
  activeTab,
}: MobileActionsOverlayProps) => {
  const { t } = useLanguage();
  if (!payment) return null;

  const isArchiveOrTrash = activeTab === "archive" || activeTab === "trash";

  const actions = isArchiveOrTrash
    ? [
        {
          label: t("Изменить"),
          icon: PencilSolidIcon,
          handler: () => onEdit(payment.id),
        },
        {
          label: t("Восстановить"),
          icon: ArrowPathSolidIcon,
          handler: () => onRestore(payment),
        },
        {
          label: t("Удалить"),
          icon: TrashSolidIcon,
          handler: () => onPermanentDelete(payment.id),
        },
      ]
    : [
        {
          label: t("Изменить"),
          icon: PencilSolidIcon,
          handler: () => onEdit(payment.id),
        },
        {
          label: t("Выполнить"),
          icon: CheckSolidIcon,
          handler: () => onComplete(payment),
        },
        {
          label: t("Удалить"),
          icon: TrashSolidIcon,
          handler: () => onDelete(payment),
        },
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
            className="flex flex-col items-center justify-center gap-1.5 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-lg transition-colors w-24 cursor-pointer"
          >
            <action.icon className="size-5 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </MobilePanel>
  );
};
const fetchAllPaymentsApi = async (
  params?: Record<string, unknown>
): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/payments/list", { params });
  return res.data;
};

const fetchArchivedPaymentsApi = async (
  params?: Record<string, unknown>
): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/archive", { params });
  return res.data;
};

const PaymentsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("payments");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as PaymentTabType) || "active";
  const [paymentWindow, setPaymentWindow] = useState({
    tab: activeTab,
    limit: PAYMENT_BATCH_SIZE,
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [activeFilters, setActiveFilters] = useState<FilterState>(
    () => getStoredFilterState() || initialFilterState
  );
  const [draftFilters, setDraftFilters] = useState(activeFilters);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(
    () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  );
  const { categories } = useCategories("expense");

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const updateViewport = (): void => setIsDesktopViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateViewport);
    updateViewport();
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const debouncedSearch = useDebounce(activeFilters.search, 500);

  const activeFilterCount = [
    activeFilters.categoryId,
    activeFilters.isRecurring !== "all",
    activeFilters.hasFile !== "all",
  ].filter(Boolean).length;

  useEffect(() => {
    setPageTitle(t("Платежи"));
  }, [setPageTitle, t]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        PAYMENTS_STATE_STORAGE_KEY,
        JSON.stringify({ filters: activeFilters })
      );
    } catch (error) {
      logger.error("Failed to store payments filters", error);
    }
  }, [activeFilters]);

  const applyDraftFilters = () => {
    setActiveFilters(draftFilters);
    setIsFilterPanelOpen(false);
  };

  const cancelDraftFilters = () => {
    setDraftFilters(activeFilters);
    setIsFilterPanelOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters({
      ...initialFilterState,
      search: activeFilters.search,
    });
  };

  const {
    data: rawActivePayments,
    isLoading: isLoadingActive,
    error: errorActive,
    execute: executeFetchActivePayments,
  } = useApi(fetchAllPaymentsApi);

  const {
    data: rawArchivedPayments,
    isLoading: isLoadingArchived,
    error: errorArchived,
    execute: executeFetchArchivedPayments,
  } = useApi(fetchArchivedPaymentsApi);

  const [activePayments, setActivePayments] = useState<PaymentData[]>([]);
  const [archivedPayments, setArchivedPayments] = useState<PaymentData[]>([]);

  const [isCompleting, setIsCompleting] = useState(false);
  const [isClearingTrash, setIsClearingTrash] = useState(false);
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

  if (paymentWindow.tab !== activeTab) {
    setPaymentWindow({ tab: activeTab, limit: PAYMENT_BATCH_SIZE });
    setMobileActionsPayment(null);
    setShouldCloseMobilePanel(false);
  }

  useEffect(() => {
    if (rawActivePayments) {
      let payments = rawActivePayments.map((p: unknown) => {
        const payment = p as PaymentData;
        return {
          ...payment,
          amount:
            typeof payment.amount === "string"
              ? parseFloat(payment.amount)
              : payment.amount,
        };
      });

      payments = payments.filter(
        (p) => p.status !== "completed" && p.status !== "deleted"
      );

      payments = payments.sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
      });

      setActivePayments(payments);
      logger.info(
        `Successfully fetched and processed ${payments.length} active payments.`
      );
    } else {
      setActivePayments([]);
    }
  }, [rawActivePayments]);

  useEffect(() => {
    if (rawArchivedPayments) {
      let payments = rawArchivedPayments.map((p: unknown) => {
        const payment = p as PaymentData;
        return {
          ...payment,
          amount:
            typeof payment.amount === "string"
              ? parseFloat(payment.amount)
              : payment.amount,
        };
      });

      payments = payments.filter(
        (p) => p.status === "completed" || p.status === "deleted"
      );

      payments = payments.sort((a, b) => {
        const completedA = a.completedAt
          ? new Date(a.completedAt).getTime()
          : 0;
        const completedB = b.completedAt
          ? new Date(b.completedAt).getTime()
          : 0;
        if (completedA !== completedB) {
          return completedB - completedA;
        }
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdB - createdA;
      });

      setArchivedPayments(payments);
      logger.info(
        `Successfully fetched and processed ${payments.length} archived payments.`
      );
    } else {
      setArchivedPayments([]);
    }
  }, [rawArchivedPayments]);

  // Очистка поиска применяется сразу, ввод — с задержкой
  const effectiveSearch = activeFilters.search ? debouncedSearch : "";
  const { categoryId, isRecurring, hasFile } = activeFilters;

  // Зависим только от примитивов: новый объект фильтров с теми же значениями не должен вызывать повторный запрос
  const fetchParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (effectiveSearch) params.search = effectiveSearch;
    if (categoryId) params.categoryId = categoryId;
    if (isRecurring !== "all") params.isRecurring = isRecurring;
    if (hasFile !== "all") params.hasFile = hasFile;
    return params;
  }, [effectiveSearch, categoryId, isRecurring, hasFile]);

  useEffect(() => {
    executeFetchActivePayments(fetchParams);
    executeFetchArchivedPayments(fetchParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchParams]);

  const allPayments = useMemo(() => {
    const combined = [...activePayments, ...archivedPayments];
    return combined.sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return dateB - dateA;
    });
  }, [activePayments, archivedPayments]);

  const trashPayments = useMemo(
    () => archivedPayments.filter((p) => p.status === "deleted"),
    [archivedPayments]
  );
  const trashCount = trashPayments.length;

  const displayedPayments = useMemo(() => {
    switch (activeTab) {
      case "all":
        return allPayments;
      case "active":
        return activePayments;
      case "archive":
        return archivedPayments.filter((p) => p.status === "completed");
      case "trash":
        return trashPayments;
      default:
        return activePayments;
    }
  }, [activeTab, allPayments, activePayments, archivedPayments, trashPayments]);

  const isLoading =
    activeTab === "all"
      ? isLoadingActive || isLoadingArchived
      : activeTab === "active"
      ? isLoadingActive
      : isLoadingArchived;

  // Скелетон показываем только при первой загрузке, чтобы при обновлении данных список не прыгал
  const hasLoadedData =
    activeTab === "all"
      ? rawActivePayments !== null && rawArchivedPayments !== null
      : activeTab === "active"
      ? rawActivePayments !== null
      : rawArchivedPayments !== null;
  const showLoadingSkeleton = isLoading && !hasLoadedData;

  const error =
    activeTab === "all"
      ? errorActive || errorArchived
      : activeTab === "active"
      ? errorActive
      : errorArchived;

  const visiblePayments = displayedPayments.slice(0, paymentWindow.limit);
  const canShowMore =
    !isLoading && !error && visiblePayments.length < displayedPayments.length;
  const showMorePayments = React.useCallback((): void => {
    setPaymentWindow((current) =>
      current === paymentWindow
        ? { ...current, limit: current.limit + PAYMENT_BATCH_SIZE }
        : current
    );
  }, [paymentWindow]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!canShowMore || !target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) showMorePayments();
      },
      // Подгружаем следующую порцию заранее, примерно за два экрана до конца списка.
      // При малом запасе нижний край панели успевал показаться при быстрой прокрутке
      // до отрисовки новых строк — на мгновение мелькала тёмная полоса фона страницы.
      { root: target.closest("main"), rootMargin: "0px 0px 1600px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [canShowMore, showMorePayments]);

  const navigate = useNavigate();

  const refetchData = React.useCallback(() => {
    executeFetchActivePayments(fetchParams);
    executeFetchArchivedPayments(fetchParams);
  }, [executeFetchActivePayments, executeFetchArchivedPayments, fetchParams]);

  const callCompleteApi = async (paymentId: string, completionDate?: Date) => {
    setIsCompleting(true);
    try {
      const payload = completionDate
        ? { completionDate: completionDate.toISOString().split("T")[0] }
        : {};
      await axiosInstance.put(`/payments/${paymentId}/complete`, payload);
      showToast(t("Платеж выполнен."), "success");
      refetchData();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Failed to complete payment ${paymentId}:`, errorMessage);
      showToast(t("Не удалось выполнить платеж: {1}", errorMessage), "error");
    } finally {
      setIsCompleting(false);
      setCompletionDateModalState({ isOpen: false, payment: null });
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
        logger.info(`Payment soft-deleted: ${payment.id}`);
        showToast(t("Платеж перемещен в корзину."), "info");
        refetchData();
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.error(
          `Failed to soft-delete payment ${payment.id}:`,
          errorMessage
        );
        showToast(t("Не удалось удалить платеж: {1}", errorMessage), "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: t("Удалить платеж"),
      message: t("Вы уверены, что хотите удалить платеж (переместить в корзину)?"),
    });
  };

  const handleDeleteInstance = async () => {
    if (!deleteRecurringModalState.payment) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(
        `/payments/${deleteRecurringModalState.payment.id}`
      );
      logger.info(
        `Payment instance soft-deleted: ${deleteRecurringModalState.payment.id}`
      );
      showToast(t("Платеж перемещен в корзину."), "info");
      refetchData();
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
      logger.info(
        `Series deactivated: ${deleteRecurringModalState.payment.seriesId}`
      );
      showToast(t("Серия платежей была деактивирована."), "success");
      refetchData();
    } catch (error: unknown) {
      showToast(t("Ошибка удаления серии: {1}", t(getErrorMessage(error))), "error");
    } finally {
      setIsDeleting(false);
      setDeleteRecurringModalState({ isOpen: false, payment: null });
    }
  };

  const callRestoreApi = async (
    paymentId: string,
    reactivateSeries = false
  ) => {
    try {
      await axiosInstance.put(`/archive/${paymentId}/restore`, {
        reactivateSeries,
      });
      logger.info(`Payment restored: ${paymentId}`);
      refetchData();
      showToast(t("Платеж успешно восстановлен."), "success");
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Failed to restore payment ${paymentId}:`, errorMessage);
      showToast(t("Не удалось восстановить платеж: {1}", errorMessage), "error");
    }
  };

  const handleRestorePayment = (payment: PaymentData) => {
    const action = () => callRestoreApi(payment.id);

    setConfirmModalState({
      isOpen: true,
      action,
      title: t("Восстановить платеж"),
      message:
        t("Вы уверены, что хотите восстановить этот платеж? Он вернется в список активных."),
    });
  };

  const handlePermanentDeletePayment = (paymentId: string) => {
    const action = async () => {
      try {
        await axiosInstance.delete(`/archive/${paymentId}/permanent`);
        logger.info(`Payment permanently deleted: ${paymentId}`);
        refetchData();
        showToast(t("Платеж полностью удален."), "info");
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.error(
          `Failed to permanently delete payment ${paymentId}:`,
          errorMessage
        );
        showToast(
          t("Не удалось полностью удалить платеж: {1}", errorMessage),
          "error"
        );
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: t("Полностью удалить платеж"),
      message:
        t("Внимание! Это действие необратимо и удалит все связанные файлы."),
    });
  };

  const performClearTrash = React.useCallback(async () => {
    setIsClearingTrash(true);
    try {
      await axiosInstance.delete("/archive/trash");
      showToast(t("Корзина была очищена."), "success");
      refetchData();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error("Failed to clear trash:", errorMessage);
      showToast(t("Не удалось очистить корзину: {1}", errorMessage), "error");
    } finally {
      setIsClearingTrash(false);
    }
  }, [refetchData, showToast, t]);

  const handleClearTrashRequest = React.useCallback(() => {
    if (trashCount === 0) {
      return;
    }
    setConfirmModalState({
      isOpen: true,
      action: performClearTrash,
      title: t("Очистить корзину"),
      message:
        t("Вы уверены, что хотите удалить все платежи из корзины? Это действие необратимо."),
    });
  }, [trashCount, performClearTrash, t]);

  const handleAddPayment = () => {
    if (activeTab === "archive") {
      navigate("/payments/new?markAsCompleted=true");
    } else {
      navigate("/payments/new");
    }
  };

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  const closeMobilePanel = React.useCallback(() => {
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

  // Тап по карточке на мобильных: открывает панель действий (повторный тап — закрывает)
  const handleMobileOpen = (paymentId: string): void => {
    if (selectedMobilePaymentId === paymentId) {
      closeMobilePanel();
      return;
    }
    const nextPayment = displayedPayments.find((p) => p.id === paymentId);
    if (!nextPayment) return;
    setShouldCloseMobilePanel(false);
    setMobileActionsPayment(nextPayment);
  };

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
      const errorMessage = getErrorMessage(error);
      logger.error(
        `Failed to download file for payment ${paymentId}:`,
        errorMessage
      );
      showToast(t("Не удалось скачать файл: {1}", errorMessage), "error");
    }
  };

  const handleTabChange = (tab: PaymentTabType): void => {
    if (tab !== activeTab) setSearchParams({ tab });
  };

  const isArchiveOrTrash = activeTab === "archive" || activeTab === "trash";

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "all":
        return t("Нет платежей");
      case "active":
        return t("Нет активных платежей");
      case "archive":
        return t("Архив пуст");
      case "trash":
        return t("Корзина пуста");
      default:
        return t("Нет платежей");
    }
  };

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <h1 className="sr-only hidden md:block">{t("Платежи")}</h1>

        <div className="flex flex-wrap items-end gap-x-4 border-b border-[var(--ui-border)] md:px-6">
          <SegmentedControl
            variant="tabs"
            ariaLabel={t("Статус")}
            options={paymentFilterOptions.map((option) => ({ ...option, label: t(option.label) }))}
            selected={activeTab}
            onChange={handleTabChange}
            className="min-h-11 w-full border-b border-[var(--ui-border)] px-3 md:min-h-[3.375rem] md:w-auto md:border-b-0 md:px-0"
          />
          <div className="ml-auto flex min-h-12 w-full max-w-full flex-wrap items-center justify-end gap-2 px-3 py-2 md:min-h-[3.375rem] md:w-auto md:flex-nowrap md:px-0 md:py-0">
            <ToolbarSearch
              value={activeFilters.search}
              onChange={(search) => setActiveFilters((prev) => ({ ...prev, search }))}
              expanded={isSearchVisible}
              onExpandedChange={setIsSearchVisible}
              placeholder={t("Поиск по названию...")}
            />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(activeFilters);
                  setIsFilterPanelOpen(true);
                }}
                aria-label={activeFilterCount ? `${t("Фильтры")} (${activeFilterCount})` : t("Фильтры")}
                aria-haspopup="dialog"
                aria-expanded={isFilterPanelOpen}
                title={t("Фильтры")}
                className={`flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                  activeFilterCount > 0 || isFilterPanelOpen
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
                }`}
              >
                <AdjustmentsHorizontalIcon className="size-4" aria-hidden="true" />
              </button>
              <span className="mx-0.5 h-4 w-px bg-[var(--ui-border)]" aria-hidden="true" />
              {activeTab === "trash" ? (
                <Button
                  onClick={handleClearTrashRequest}
                  label={t("Очистить корзину")}
                  icon={<TrashSolidIcon />}
                  variant="destructive"
                  disabled={isClearingTrash || trashCount === 0}
                />
              ) : (
                <Button
                  onClick={handleAddPayment}
                  label={t("Добавить платеж")}
                  icon={<PlusIcon />}
                />
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="px-3 pt-4 md:px-6">
            <div className="ui-alert-error" role="alert">
              <span className="block sm:inline">{error.message}</span>
            </div>
          </div>
        )}

        {!error && (
          <>
            {isDesktopViewport && (
              <div className="px-6 pt-5">
                <Panel>
                  <PaymentRowList
                    payments={visiblePayments}
                    mode={activeTab === "archive" ? "archive" : activeTab === "trash" ? "trash" : activeTab === "all" ? "all" : "active"}
                    isLoading={showLoadingSkeleton}
                    emptyMessage={getEmptyMessage()}
                    onOpen={handleEditPayment}
                    onComplete={handleCompletePayment}
                    onDelete={handleDeletePayment}
                    onRestore={handleRestorePayment}
                    onPermanentDelete={handlePermanentDeletePayment}
                    onDownloadFile={handleDownloadFile}
                    inset="panel"
                    showColumnHeader
                    groupLimit={isArchiveOrTrash ? undefined : 5}
                  />
                </Panel>
              </div>
            )}
            {!isDesktopViewport && (
              // Мобильные: тот же список, что и на десктопе, в виде карточек
              <div ref={mobileListRef} className="px-3 py-3">
                <PaymentRowList
                  payments={visiblePayments}
                  mode={activeTab === "archive" ? "archive" : activeTab === "trash" ? "trash" : activeTab === "all" ? "all" : "active"}
                  isLoading={showLoadingSkeleton}
                  emptyMessage={getEmptyMessage()}
                  onOpen={handleMobileOpen}
                  onDownloadFile={handleDownloadFile}
                  inset="plain"
                  groupLimit={isArchiveOrTrash ? undefined : 5}
                  selectedId={selectedMobilePaymentId}
                />
              </div>
            )}
            {canShowMore && (
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="small"
                  label={t("Показать больше")}
                  onClick={showMorePayments}
                />
              </div>
            )}
          </>
        )}
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
        confirmText={t("Да, подтвердить")}
        isConfirming={isConfirming}
      />
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
        onRestore={handleRestorePayment}
        onPermanentDelete={handlePermanentDeletePayment}
        activeTab={activeTab}
      />
      <AdvancedFiltersPanel
        isOpen={isFilterPanelOpen}
        onClose={cancelDraftFilters}
        title={t("Фильтрация")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
              {t("Категория")}
            </label>
            <Select
              options={[
                { value: null, label: t("Все категории") },
                { value: NO_CATEGORY_FILTER_VALUE, label: t("Без категории") },
                ...(categories?.map((c) => ({
                  value: c.id,
                  label: localizedCategoryName(c, language),
                })) || []),
              ]}
              value={draftFilters.categoryId}
              onChange={(val) =>
                setDraftFilters((prev) => ({ ...prev, categoryId: val }))
              }
              placeholder={t("Выберите категорию")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
              {t("Повторение")}
            </label>
            <SegmentedControl
              options={[
                { value: "all", label: t("Все") },
                { value: "true", label: t("Повторяющиеся") },
                { value: "false", label: t("Разовые") },
              ]}
              selected={draftFilters.isRecurring}
              onChange={(val) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  isRecurring: val as FilterState["isRecurring"],
                }))
              }
              className="w-full"
              optionClassName="flex-1 justify-center"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1.5">
              {t("Наличие файла")}
            </label>
            <SegmentedControl
              options={[
                { value: "all", label: t("Все") },
                { value: "true", label: t("С файлом") },
                { value: "false", label: t("Без файла") },
              ]}
              selected={draftFilters.hasFile}
              onChange={(val) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  hasFile: val as FilterState["hasFile"],
                }))
              }
              className="w-full"
              optionClassName="flex-1 justify-center"
            />
          </div>
          <div className="flex flex-col gap-3 mt-6 md:hidden">
            <Button
              variant="primary"
              size="large"
              onClick={applyDraftFilters}
              label={t("Применить")}
              className="w-full"
            />
            <Button
              variant="ghost"
              onClick={cancelDraftFilters}
              label={t("Отмена")}
              className="w-full"
            />
            <button
              type="button"
              onClick={resetDraftFilters}
              className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium py-2 text-left cursor-pointer"
            >
              {t("Сбросить все фильтры")}
            </button>
          </div>
          <div className="hidden md:flex justify-between items-center pt-4 border-t border-[var(--ui-border)]">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              {t("Сбросить")}
            </button>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={cancelDraftFilters}
                label={t("Отмена")}
              />
              <Button
                variant="primary"
                onClick={applyDraftFilters}
                label={t("Применить")}
              />
            </div>
          </div>
        </div>
      </AdvancedFiltersPanel>
    </>
  );
};

export default PaymentsPage;
