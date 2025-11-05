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
import {
  PencilIcon as PencilSolidIcon,
  CheckCircleIcon as CheckSolidIcon,
  TrashIcon as TrashSolidIcon,
  ArrowPathIcon as ArrowPathSolidIcon,
} from "@heroicons/react/24/solid";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";
import ArchiveTable from "../components/ArchiveTable";
type TabType = "all" | "active" | "archive" | "trash";

type MobileActionsOverlayProps = {
  payment: PaymentData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onComplete: (payment: PaymentData) => void;
  onDelete: (payment: PaymentData) => void;
  onRestore: (payment: PaymentData) => void;
  onPermanentDelete: (id: string) => void;
  activeTab: TabType;
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
const fetchAllPaymentsApi = async (): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/payments/list");
  return res.data;
};

const fetchArchivedPaymentsApi = async (): Promise<PaymentData[]> => {
  const res = await axiosInstance.get("/archive");
  return res.data;
};

const PaymentsPage: React.FC = () => {
  const { showToast } = useToast();
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("payments");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabType) || "active";

  useEffect(() => {
    setPageTitle("Платежи");
  }, [setPageTitle]);

  const {
    data: rawActivePayments,
    isLoading: isLoadingActive,
    error: errorActive,
    execute: executeFetchActivePayments,
  } = useApi<PaymentData[]>(fetchAllPaymentsApi);

  const {
    data: rawArchivedPayments,
    isLoading: isLoadingArchived,
    error: errorArchived,
    execute: executeFetchArchivedPayments,
  } = useApi<PaymentData[]>(fetchArchivedPaymentsApi);

  const [activePayments, setActivePayments] = useState<PaymentData[]>([]);
  const [archivedPayments, setArchivedPayments] = useState<PaymentData[]>([]);

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

  useEffect(() => {
    executeFetchActivePayments();
    executeFetchArchivedPayments();
  }, []);

  const allPayments = useMemo(() => {
    const combined = [...activePayments, ...archivedPayments];
    return combined.sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      return dateB - dateA;
    });
  }, [activePayments, archivedPayments]);

  const displayedPayments = useMemo(() => {
    switch (activeTab) {
      case "all":
        return allPayments;
      case "active":
        return activePayments;
      case "archive":
        return archivedPayments.filter((p) => p.status === "completed");
      case "trash":
        return archivedPayments.filter((p) => p.status === "deleted");
      default:
        return activePayments;
    }
  }, [activeTab, allPayments, activePayments, archivedPayments]);

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
    executeFetchActivePayments();
    executeFetchArchivedPayments();
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

  const handleTabChange = (tab: TabType) => {
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
        <div className="flex justify-between items-center md:mb-6">
          <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Платежи
          </h2>
          {activeTab !== "trash" && (
            <Button
              onClick={handleAddPayment}
              label="Добавить платеж"
              className="hidden md:inline-flex"
            />
          )}
        </div>

        <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => handleTabChange("all")}
            className={`h-10 px-4 rounded-lg text-sm font-medium transition duration-150 whitespace-nowrap flex items-center justify-center cursor-pointer ${
              activeTab === "all"
                ? "bg-indigo-500 text-white shadow-md hover:bg-[#4036e2] hover:shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
            }`}
          >
            Все
          </button>
          <button
            onClick={() => handleTabChange("active")}
            className={`h-10 px-4 rounded-lg text-sm font-medium transition duration-150 whitespace-nowrap flex items-center justify-center cursor-pointer ${
              activeTab === "active"
                ? "bg-indigo-500 text-white shadow-md hover:bg-[#4036e2] hover:shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
            }`}
          >
            Активные
          </button>
          <button
            onClick={() => handleTabChange("archive")}
            className={`h-10 px-4 rounded-lg text-sm font-medium transition duration-150 whitespace-nowrap flex items-center justify-center cursor-pointer ${
              activeTab === "archive"
                ? "bg-indigo-500 text-white shadow-md hover:bg-[#4036e2] hover:shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
            }`}
          >
            Архив
          </button>
          <button
            onClick={() => handleTabChange("trash")}
            className={`h-10 px-4 rounded-lg text-sm font-medium transition duration-150 whitespace-nowrap flex items-center justify-center cursor-pointer ${
              activeTab === "trash"
                ? "bg-indigo-500 text-white shadow-md hover:bg-[#4036e2] hover:shadow-lg"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:shadow-md"
            }`}
          >
            Корзина
          </button>
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
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
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
                className="block md:hidden space-y-3 p-2"
              >
                {displayedPayments.map((payment) => {
                  const isSelected = selectedMobilePaymentId === payment.id;
                  const cardStateClasses = [
                    "transition-all duration-200",
                    isSelected ? "border-gray-400 shadow-md relative z-50" : "",
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
                })}
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
    </>
  );
};

export default PaymentsPage;
