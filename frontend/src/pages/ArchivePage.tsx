// src/pages/ArchivePage.tsx
import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
// Переиспользуем компоненты для отображения платежа и иконки
// import PaymentIconDisplay from "../components/PaymentIconDisplay";
import ArchiveTable from "../components/ArchiveTable";
import PaymentListCard from "../components/PaymentListCard";
// Импортируем иконки действий
// import { PaperClipIcon, ArrowPathIcon } from "@heroicons/react/24/outline"; // Add import
import { PaymentData } from "../types/paymentData";
import useApi from "../hooks/useApi"; // Import useApi
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import getErrorMessage from "../utils/getErrorMessage";
import Modal from "../components/Modal";
import {
  PencilIcon as PencilSolidIcon,
  ArrowPathIcon as ArrowPathSolidIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";

// MobileActionsOverlay component
const MobileActionsOverlay: React.FC<{
  payment: PaymentData | null;
  shouldClose: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRestore: (payment: PaymentData) => void;
  onPermanentDelete: (id: string) => void;
}> = ({
  payment,
  shouldClose,
  onClose,
  onEdit,
  onRestore,
  onPermanentDelete,
}) => {
  if (!payment) return null;

  const actions = [
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
// Replaced by generic PaymentListCard

// --- ReactivateSeriesModal component ---
const ReactivateSeriesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onRestoreOnly: () => void;
  onRestoreAndReactivate: () => void;
  isProcessing: boolean;
}> = ({
  isOpen,
  onClose,
  onRestoreOnly,
  onRestoreAndReactivate,
  isProcessing,
}) => {
  if (!isOpen) return null;

  const renderContent = () => (
    <div className="space-y-4">
      <p className="text-gray-700 dark:text-gray-300">
        Этот платеж является частью неактивной серии. Вы хотите восстановить
        только этот платеж или также повторно активировать всю серию для
        создания будущих платежей?
      </p>
      <div className="flex flex-wrap justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
          disabled={isProcessing}
        >
          Отмена
        </button>
        <button
          onClick={onRestoreOnly}
          disabled={isProcessing}
          type="button"
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-w-[150px]"
        >
          {isProcessing ? <Spinner size="sm" /> : "Только этот платеж"}
        </button>
        <button
          onClick={onRestoreAndReactivate}
          disabled={isProcessing}
          type="button"
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 min-w-[240px]"
        >
          {isProcessing ? <Spinner size="sm" /> : "Восстановить и активировать"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Восстановление платежа из серии"
        className="hidden md:flex"
      >
        {renderContent()}
      </Modal>
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title="Восстановление платежа из серии"
        showCloseButton
      >
        {renderContent()}
      </MobilePanel>
    </>
  );
};

// Define the raw API fetch function
const fetchArchivedPaymentsApi = async (): Promise<PaymentData[]> => {
  // TODO: Передать параметры фильтрации и сортировки
  // const res = await axiosInstance.get('/archive', { params: { ...filters, ...sort } });
  const res = await axiosInstance.get("/archive"); // Пока без параметров
  return res.data;
};

const ArchivePage: React.FC = () => {
  const { showToast } = useToast(); // Import useToast
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("archive");

  useEffect(() => {
    setPageTitle("Архив");
  }, [setPageTitle]);

  // Use useApi for the raw fetch
  const {
    data: rawArchivedPayments,
    isLoading: isLoadingArchive,
    error: errorArchive,
    execute: executeFetchArchivedPayments,
  } = useApi<PaymentData[]>(fetchArchivedPaymentsApi);

  // State for transformed data
  const [archivedPayments, setArchivedPayments] = useState<PaymentData[]>([]);

  // New state for confirm modal
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    action: (() => void) | null;
    title: string;
    message: string;
  }>({ isOpen: false, action: null, title: "", message: "" });
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const [reactivateModalState, setReactivateModalState] = useState<{
    isOpen: boolean;
    payment: PaymentData | null;
  }>({ isOpen: false, payment: null });

  const [mobileActionsPayment, setMobileActionsPayment] =
    useState<PaymentData | null>(null);
  const [shouldCloseMobilePanel, setShouldCloseMobilePanel] = useState(false);
  const selectedMobilePaymentId = mobileActionsPayment?.id ?? null;
  const mobileListRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  // Effect to transform data when raw data changes
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

      // Filter to show only completed and deleted payments (matching backend behavior)
      // This is important when loading from offline cache which contains all payments
      payments = payments.filter(
        (p) => p.status === "completed" || p.status === "deleted"
      );

      // Sort by completedAt DESC, then createdAt DESC (matching backend behavior)
      payments = payments.sort((a, b) => {
        // First compare completedAt
        const completedA = a.completedAt
          ? new Date(a.completedAt).getTime()
          : 0;
        const completedB = b.completedAt
          ? new Date(b.completedAt).getTime()
          : 0;
        if (completedA !== completedB) {
          return completedB - completedA; // DESC
        }
        // If completedAt is the same, compare createdAt
        const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createdB - createdA; // DESC
      });

      setArchivedPayments(payments);
      logger.info(
        `Successfully fetched and processed ${payments.length} archived payments.`
      );
    } else {
      setArchivedPayments([]); // Clear payments if raw data is null (e.g., on error)
    }
  }, [rawArchivedPayments]);

  // Effect to trigger the fetch on mount
  useEffect(() => {
    executeFetchArchivedPayments();
  }, []); // Removed executeFetchArchivedPayments to prevent infinite loop

  // TODO: Состояние для фильтров и сортировки архива (если реализовано на бэкенде)
  // const [filters, setFilters] = useState({ status: '', categoryId: '', search: '' });
  // const [sort, setSort] = useState({ field: 'completedAt', order: 'desc' });

  // --- Обработчики действий над платежами в архиве ---
  // These handlers should ideally also use useApi, but the current task is only about the main data fetch.
  // Keeping them as is for now.

  const onConfirmAction = async () => {
    if (confirmModalState.action) {
      setIsActionProcessing(true);
      await confirmModalState.action();
      setIsActionProcessing(false);
    }
    setConfirmModalState({
      isOpen: false,
      action: null,
      title: "",
      message: "",
    });
  };

  // --- Restore API call helper ---
  const callRestoreApi = async (
    paymentId: string,
    reactivateSeries = false
  ) => {
    setIsActionProcessing(true);
    try {
      await axiosInstance.put(`/archive/${paymentId}/restore`, {
        reactivateSeries,
      });
      logger.info(`Payment restored: ${paymentId}`);
      executeFetchArchivedPayments();
      showToast("Платеж успешно восстановлен.", "success");
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      logger.error(`Failed to restore payment ${paymentId}:`, errorMessage);
      showToast(`Не удалось восстановить платеж: ${errorMessage}`, "error");
    } finally {
      setIsActionProcessing(false);
      setReactivateModalState({ isOpen: false, payment: null });
    }
  };

  // --- Restore handler ---
  const handleRestorePayment = (payment: PaymentData) => {
    if (payment.seriesId && payment.series && !payment.series.isActive) {
      setReactivateModalState({ isOpen: true, payment });
      return;
    }

    const action = () => callRestoreApi(payment.id);

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Восстановить платеж",
      message:
        "Вы уверены, что хотите восстановить этот платеж? Он вернется в список активных.",
    });
  };

  // --- Permanent delete handler (ensure await) ---
  const handlePermanentDeletePayment = (paymentId: string) => {
    const action = async () => {
      try {
        await axiosInstance.delete(`/archive/${paymentId}/permanent`);
        logger.info(`Payment permanently deleted: ${paymentId}`);
        executeFetchArchivedPayments();
        showToast("Платеж полностью удален.", "info");
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
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

  // --- Reactivate modal handlers ---
  const handleRestoreOnly = () => {
    if (reactivateModalState.payment) {
      callRestoreApi(reactivateModalState.payment.id, false);
    }
  };

  const handleRestoreAndReactivate = () => {
    if (reactivateModalState.payment) {
      callRestoreApi(reactivateModalState.payment.id, true);
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
      logger.info(`File downloaded for archived payment ${paymentId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `Failed to download file for archived payment ${paymentId}:`,
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

      const nextPayment = archivedPayments.find(
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

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center md:mb-6">
          <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Архив платежей
          </h2>
          {/* TODO: Кнопка добавления платежа не нужна в Архиве */}
        </div>

        {/* TODO: Секция фильтров и сортировки архива */}
        {/* <div className="mb-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-md"> ... </div> */}

        {/* Состояние ошибки */}
        {errorArchive && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            {" "}
            {errorArchive?.message}{" "}
          </div>
        )}

        {/* Таблица архивных платежей */}
        {!errorArchive && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <ArchiveTable
                data={archivedPayments}
                isLoading={isLoadingArchive}
                onEdit={handleEditPayment}
                onRestore={handleRestorePayment}
                onPermanentDelete={handlePermanentDeletePayment}
                onDownloadFile={handleDownloadFile}
              />
            </div>
            {/* Mobile Card View */}
            {!isLoadingArchive && (
              <div
                ref={mobileListRef}
                onClick={handleMobileListClick}
                className="block md:hidden space-y-3 p-2"
              >
                {archivedPayments.map((payment) => {
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
                      context="archive"
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
        isConfirming={isActionProcessing}
      />
      <ReactivateSeriesModal
        isOpen={reactivateModalState.isOpen}
        onClose={() =>
          setReactivateModalState({ isOpen: false, payment: null })
        }
        onRestoreOnly={handleRestoreOnly}
        onRestoreAndReactivate={handleRestoreAndReactivate}
        isProcessing={isActionProcessing}
      />
      <MobileActionsOverlay
        payment={mobileActionsPayment}
        shouldClose={shouldCloseMobilePanel}
        onClose={handleMobilePanelClosed}
        onEdit={handleEditPayment}
        onRestore={handleRestorePayment}
        onPermanentDelete={handlePermanentDeletePayment}
      />
    </>
  );
};

export default ArchivePage;
