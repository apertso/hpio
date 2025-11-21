// src/pages/PaymentsPage.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import PaymentListCard from "../components/PaymentListCard";
import useApi from "../hooks/useApi";
import { Button } from "../components/Button";
import { PaymentData } from "../types/paymentData";
import PaymentsTable from "../components/PaymentsTable";
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
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";
import ArchiveTable from "../components/ArchiveTable";
import { Input } from "../components/Input";
import AdvancedFiltersPanel from "../components/AdvancedFiltersPanel";
import Select from "../components/Select";
import useCategories from "../hooks/useCategories";
import useDebounce from "../hooks/useDebounce";

type PaymentTabType = "all" | "active" | "archive" | "trash";

const paymentFilterOptions: SegmentedControlOption<PaymentTabType>[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "archive", label: "Архив" },
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
  if (!payment) return null;

  const isArchiveOrTrash = activeTab === "archive" || activeTab === "trash";

  const actions = isArchiveOrTrash
    ? [
        {
          label: "Изменить",
          icon: PencilSolidIcon,
          handler: () => onEdit(payment.id),
        },
        {
          label: "Восстановить",
          icon: ArrowPathSolidIcon,
          handler: () => onRestore(payment),
        },
        {
          label: "Удалить",
          icon: TrashSolidIcon,
          handler: () => onPermanentDelete(payment.id),
        },
      ]
    : [
        {
          label: "Изменить",
          icon: PencilSolidIcon,
          handler: () => onEdit(payment.id),
        },
        {
          label: "Выполнить",
          icon: CheckSolidIcon,
          handler: () => onComplete(payment),
        },
        {
          label: "Удалить",
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
  const { showToast } = useToast();
  const { setPageTitle, setHeaderRightAction } = usePageTitle();
  const metadata = getPageMetadata("payments");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as PaymentTabType) || "active";

  const [activeFilters, setActiveFilters] = useState<FilterState>(
    initialFilterState
  );
  const [draftFilters, setDraftFilters] = useState<FilterState>(
    initialFilterState
  );
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const { categories } = useCategories();

  const debouncedSearch = useDebounce(activeFilters.search, 500);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.categoryId) count++;
    if (activeFilters.isRecurring !== "all") count++;
    if (activeFilters.hasFile !== "all") count++;
    return count;
  }, [activeFilters]);

  useEffect(() => {
    setPageTitle("Платежи");
  }, [setPageTitle]);

  useEffect(() => {
    const filterIndicatorCount = [
      activeFilters.categoryId,
      activeFilters.isRecurring !== "all",
      activeFilters.hasFile !== "all",
    ].filter(Boolean).length;

    setHeaderRightAction(
      <>
        <button
          type="button"
          onClick={() => setIsSearchVisible((prev) => !prev)}
          className={`p-2 rounded-full transition-colors ${
            isSearchVisible
              ? "bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          } cursor-pointer`}
        >
          <MagnifyingGlassIcon className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraftFilters(activeFilters);
            setIsFilterPanelOpen(true);
          }}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 relative cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
        >
          <FunnelIcon className="w-6 h-6" />
          {filterIndicatorCount > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
          )}
        </button>
      </>
    );

    return () => setHeaderRightAction(null);
  }, [activeFilters, isSearchVisible, setHeaderRightAction]);

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
  } = useApi<PaymentData[]>((params) =>
    fetchAllPaymentsApi(params as Record<string, unknown>)
  );

  const {
    data: rawArchivedPayments,
    isLoading: isLoadingArchived,
    error: errorArchived,
    execute: executeFetchArchivedPayments,
  } = useApi<PaymentData[]>((params) =>
    fetchArchivedPaymentsApi(params as Record<string, unknown>)
  );

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

  const fetchParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (activeFilters.categoryId) params.categoryId = activeFilters.categoryId;
    if (activeFilters.isRecurring !== "all")
      params.isRecurring = activeFilters.isRecurring;
    if (activeFilters.hasFile !== "all") params.hasFile = activeFilters.hasFile;
    return params;
  }, [debouncedSearch, activeFilters]);

  useEffect(() => {
    executeFetchActivePayments(fetchParams);
    executeFetchArchivedPayments(fetchParams);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hasItems = activeTab === "trash" ? trashCount > 0 : false;
    window.dispatchEvent(
      new CustomEvent("payments:trash-state", { detail: { hasItems } })
    );
  }, [activeTab, trashCount]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("payments:trash-state", {
            detail: { hasItems: false },
          })
        );
      }
    };
  }, []);

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

  const error =
    activeTab === "all"
      ? errorActive || errorArchived
      : activeTab === "active"
      ? errorActive
      : errorArchived;

  const navigate = useNavigate();

  const refetchData = () => {
    executeFetchActivePayments(fetchParams);
    executeFetchArchivedPayments(fetchParams);
  };

  const callCompleteApi = async (paymentId: string, completionDate?: Date) => {
    setIsCompleting(true);
    try {
      const payload = completionDate
        ? { completionDate: completionDate.toISOString().split("T")[0] }
        : {};
      await axiosInstance.put(`/payments/${paymentId}/complete`, payload);
      showToast("Платеж выполнен.", "success");
      refetchData();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Failed to complete payment ${paymentId}:`, errorMessage);
      showToast(`Не удалось выполнить платеж: ${errorMessage}`, "error");
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
        logger.info(`Payment soft-deleted: ${payment.id}`);
        showToast("Платеж перемещен в корзину.", "info");
        refetchData();
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.error(
          `Failed to soft-delete payment ${payment.id}:`,
          errorMessage
        );
        showToast(`Не удалось удалить платеж: ${errorMessage}`, "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить платеж",
      message: "Вы уверены, что хотите удалить платеж (переместить в корзину)?",
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
      showToast("Платеж перемещен в корзину.", "info");
      refetchData();
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
      logger.info(
        `Series deactivated: ${deleteRecurringModalState.payment.seriesId}`
      );
      showToast("Серия платежей была деактивирована.", "success");
      refetchData();
    } catch (error: unknown) {
      showToast(`Ошибка удаления серии: ${getErrorMessage(error)}`, "error");
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
      showToast("Платеж успешно восстановлен.", "success");
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Failed to restore payment ${paymentId}:`, errorMessage);
      showToast(`Не удалось восстановить платеж: ${errorMessage}`, "error");
    }
  };

  const handleRestorePayment = (payment: PaymentData) => {
    const action = () => callRestoreApi(payment.id);

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Восстановить платеж",
      message:
        "Вы уверены, что хотите восстановить этот платеж? Он вернется в список активных.",
    });
  };

  const handlePermanentDeletePayment = (paymentId: string) => {
    const action = async () => {
      try {
        await axiosInstance.delete(`/archive/${paymentId}/permanent`);
        logger.info(`Payment permanently deleted: ${paymentId}`);
        refetchData();
        showToast("Платеж полностью удален.", "info");
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.error(
          `Failed to permanently delete payment ${paymentId}:`,
          errorMessage
        );
        showToast(
          `Не удалось полностью удалить платеж: ${errorMessage}`,
          "error"
        );
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Полностью удалить платеж",
      message:
        "Внимание! Это действие необратимо и удалит все связанные файлы.",
    });
  };

  const performClearTrash = async () => {
    setIsClearingTrash(true);
    try {
      await axiosInstance.delete("/archive/trash");
      showToast("Корзина была очищена.", "success");
      refetchData();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error("Failed to clear trash:", errorMessage);
      showToast(`Не удалось очистить корзину: ${errorMessage}`, "error");
    } finally {
      setIsClearingTrash(false);
    }
  };

  const handleClearTrashRequest = () => {
    if (trashCount === 0) {
      return;
    }
    setConfirmModalState({
      isOpen: true,
      action: performClearTrash,
      title: "Очистить корзину",
      message:
        "Вы уверены, что хотите удалить все платежи из корзины? Это действие необратимо.",
    });
  };

  useEffect(() => {
    if (typeof window === "undefined" || activeTab !== "trash") {
      return;
    }

    const handler = () => {
      handleClearTrashRequest();
    };

    window.addEventListener("payments:clear-trash-request", handler);

    return () => {
      window.removeEventListener("payments:clear-trash-request", handler);
    };
  }, [activeTab, handleClearTrashRequest]);

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

      const nextPayment = displayedPayments.find(
        (paymentItem) => paymentItem.id === mobileListItemId
      );

      if (nextPayment) {
        setShouldCloseMobilePanel(false);
        setMobileActionsPayment(nextPayment);
      }
      return;
    }

    if (event.target === event.currentTarget && selectedMobilePaymentId) {
      closeMobilePanel();
    }
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
      showToast(`Не удалось скачать файл: ${errorMessage}`, "error");
    }
  };

  const handleTabChange = (tab: PaymentTabType) => {
    setSearchParams({ tab });
  };

  const isArchiveOrTrash = activeTab === "archive" || activeTab === "trash";

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "all":
        return "Нет платежей";
      case "active":
        return "Нет активных платежей";
      case "archive":
        return "Архив пуст";
      case "trash":
        return "Корзина пуста";
      default:
        return "Нет платежей";
    }
  };

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Платежи
            </h2>
            <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
              <div className="relative max-w-xs w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  placeholder="Поиск..."
                  className="pl-9 py-2 text-sm w-full"
                  value={activeFilters.search}
                  onChange={(e) =>
                    setActiveFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                />
                {activeFilters.search && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveFilters((prev) => ({ ...prev, search: "" }))
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(activeFilters);
                  setIsFilterPanelOpen(true);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                  activeFilterCount > 0
                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <FunnelIcon className="w-4 h-4" />
                Фильтры
              </button>
              {activeTab === "trash" ? (
                <Button
                  onClick={handleClearTrashRequest}
                  label="Очистить корзину"
                  icon={<TrashSolidIcon className="w-4 h-4" />}
                  variant="destructive"
                  disabled={isClearingTrash || trashCount === 0}
                />
              ) : (
                <Button
                  onClick={handleAddPayment}
                  label="Добавить платеж"
                  icon={<PlusIcon className="w-4 h-4" />}
                />
              )}
            </div>
          </div>
          {isSearchVisible && (
            <div className="md:hidden relative transition-all">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                autoFocus
                placeholder="Поиск по названию..."
                className="pl-9 py-2 text-sm w-full"
                value={activeFilters.search}
                onChange={(e) =>
                  setActiveFilters((prev) => ({
                    ...prev,
                    search: e.target.value,
                  }))
                }
              />
              {activeFilters.search && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveFilters((prev) => ({ ...prev, search: "" }))
                  }
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 cursor-pointer"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex justify-center md:justify-start">
            <SegmentedControl
              options={paymentFilterOptions}
              selected={activeTab}
              onChange={handleTabChange}
              className="w-full md:w-auto"
              optionClassName="flex-1 md:flex-none justify-center"
            />
          </div>
        </div>

        {error && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{error.message}</span>
          </div>
        )}

        {!error && (
          <>
            <div className="hidden md:block overflow-x-auto card-base">
              {isArchiveOrTrash ? (
                <ArchiveTable
                  data={displayedPayments}
                  isLoading={isLoading}
                  onEdit={handleEditPayment}
                  onRestore={handleRestorePayment}
                  onPermanentDelete={handlePermanentDeletePayment}
                  onDownloadFile={handleDownloadFile}
                  emptyMessage={getEmptyMessage()}
                />
              ) : (
                <PaymentsTable
                  data={displayedPayments}
                  isLoading={isLoading}
                  onEdit={handleEditPayment}
                  onComplete={handleCompletePayment}
                  onDelete={handleDeletePayment}
                  onDownloadFile={handleDownloadFile}
                  emptyMessage={getEmptyMessage()}
                />
              )}
            </div>
            {!isLoading && (
              <div
                ref={mobileListRef}
                onClick={handleMobileListClick}
                className="block md:hidden space-y-2"
              >
                {displayedPayments.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {getEmptyMessage()}
                  </div>
                ) : (
                  displayedPayments.map((payment) => {
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
                        context={isArchiveOrTrash ? "archive" : "payments"}
                        onDownloadFile={handleDownloadFile}
                        className={cardStateClasses}
                      />
                    );
                  })
                )}
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
        confirmText="Да, подтвердить"
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
        title="Фильтрация"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Категория
            </label>
            <Select
              options={[
                { value: null, label: "Все категории" },
                ...(categories?.map((c) => ({ value: c.id, label: c.name })) || []),
              ]}
              value={draftFilters.categoryId}
              onChange={(val) =>
                setDraftFilters((prev) => ({ ...prev, categoryId: val }))
              }
              placeholder="Выберите категорию"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Повторение
            </label>
            <SegmentedControl
              options={[
                { value: "all", label: "Все" },
                { value: "true", label: "Повторяющиеся" },
                { value: "false", label: "Разовые" },
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Наличие файла
            </label>
            <SegmentedControl
              options={[
                { value: "all", label: "Все" },
                { value: "true", label: "С файлом" },
                { value: "false", label: "Без файла" },
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
              label="Применить"
              className="w-full"
            />
            <Button
              variant="ghost"
              onClick={cancelDraftFilters}
              label="Отмена"
              className="w-full"
            />
            <button
              type="button"
              onClick={resetDraftFilters}
              className="mt-2 text-sm text-red-500 font-medium py-2 text-left"
            >
              Сбросить все фильтры
            </button>
          </div>
          <div className="hidden md:flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              Сбросить
            </button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={cancelDraftFilters} label="Отмена" />
              <Button variant="primary" onClick={applyDraftFilters} label="Применить" />
            </div>
          </div>
        </div>
      </AdvancedFiltersPanel>
    </>
  );
};

export default PaymentsPage;
