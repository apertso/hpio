// src/pages/PaymentsPage.tsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
// import { getPaymentColorClass } from "../utils/paymentColors"; // Для цветовой индикации в таблице
// import PaymentIconDisplay from "../components/PaymentIconDisplay"; // !!! Импорт компонента отображения иконки
import PaymentListCard from "../components/PaymentListCard";
import useApi from "../hooks/useApi"; // Import useApi
// Импортируем иконки (пример с Heroicons - нужно установить иконки, если еще не сделали)
// npm install @heroicons/react
import { Button } from "../components/Button"; // Import the Button component
import { PaymentData } from "../types/paymentData";
import PaymentsTable from "../components/PaymentsTable";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmCompletionDateModal from "../components/ConfirmCompletionDateModal"; // Import ConfirmCompletionDateModal
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal
import DeleteRecurringPaymentModal from "../components/DeleteRecurringPaymentModal";
import getErrorMessage from "../utils/getErrorMessage";
import {
  PencilIcon as PencilSolidIcon,
  CheckCircleIcon as CheckSolidIcon,
  TrashIcon as TrashSolidIcon,
} from "@heroicons/react/24/solid";
// import { ArrowPathIcon, PaperClipIcon } from "@heroicons/react/24/outline";
// For MobileActionsOverlay
type MobileActionsOverlayProps = {
  payment: PaymentData | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onComplete: (payment: PaymentData) => void;
  onDelete: (payment: PaymentData) => void;
};

// MobileActionsOverlay and PaymentListItem components
const MobileActionsOverlay = ({
  payment,
  onClose,
  onEdit,
  onComplete,
  onDelete,
}: MobileActionsOverlayProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  React.useEffect(() => {
    if (payment) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [payment]);
  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };
  if (!payment) return null;
  const actions = [
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
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-300 ${
        isVisible ? "bg-black/40" : "bg-black/0"
      }`}
      onClick={handleClose}
      aria-hidden="true"
    >
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 p-4 rounded-t-2xl shadow-lg transform transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-around items-center">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                action.handler();
                handleClose();
              }}
              className="flex flex-col items-center justify-center gap-2 p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors w-24"
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
// Deprecated: PaymentListItem replaced by generic PaymentListCard

// Define the raw API fetch function for all payments
const fetchAllPaymentsApi = async (): Promise<PaymentData[]> => {
  // TODO: Передать параметры фильтрации, сортировки и пагинации в запрос
  // const res = await axiosInstance.get('/payments/list', { params: { ...filters, ...sort, ...pagination } });
  const res = await axiosInstance.get("/payments/list"); // Пока без параметров
  return res.data;
};

const PaymentsPage: React.FC = () => {
  const { showToast } = useToast(); // Import useToast

  // Use useApi for fetching all payments
  const {
    data: rawAllPayments,
    isLoading: isLoadingPayments,
    error: errorPayments,
    execute: executeFetchAllPayments,
  } = useApi<PaymentData[]>(fetchAllPaymentsApi);

  // State for transformed all payments data
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);

  // New state for modals
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

  // Effect to transform data when raw all payments data changes
  useEffect(() => {
    if (rawAllPayments) {
      // Преобразуем amount в number
      const payments = rawAllPayments.map((p: unknown) => {
        const payment = p as PaymentData;
        return {
          ...payment,
          amount:
            typeof payment.amount === "string"
              ? parseFloat(payment.amount)
              : payment.amount,
        };
      });
      setAllPayments(payments);
      logger.info(
        `Successfully fetched and processed ${
          (payments as PaymentData[]).length
        } all payments.`
      );
    } else {
      setAllPayments([]); // Clear payments if raw data is null (e.g., on error)
    }
  }, [rawAllPayments]);

  // Effect to trigger the fetch on mount
  useEffect(() => {
    executeFetchAllPayments();
  }, [executeFetchAllPayments]); // Dependency on executeFetchAllPayments

  const navigate = useNavigate();

  const callCompleteApi = async (paymentId: string, completionDate?: Date) => {
    setIsCompleting(true);
    try {
      const payload = completionDate
        ? { completionDate: completionDate.toISOString().split("T")[0] }
        : {};
      await axiosInstance.put(`/payments/${paymentId}/complete`, payload);
      showToast("Платеж выполнен.", "success");
      executeFetchAllPayments();
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

  // TODO: Обработчики действий над платежом (Часть 8)
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

  // Логическое удаление платежа (перемещение в архив)
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
        showToast("Платеж перемещен в архив.", "info");
        executeFetchAllPayments();
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
      message: "Вы уверены, что хотите удалить платеж (переместить в архив)?",
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
      showToast("Платеж перемещен в архив.", "info");
      executeFetchAllPayments();
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
      executeFetchAllPayments();
    } catch (error: unknown) {
      showToast(`Ошибка удаления серии: ${getErrorMessage(error)}`, "error");
    } finally {
      setIsDeleting(false);
      setDeleteRecurringModalState({ isOpen: false, payment: null });
    }
  };

  const handleAddPayment = () => {
    navigate("/payments/new");
  };

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  // Функция для скачивания файла (через защищенный API)
  const handleDownloadFile = async (paymentId: string, fileName: string) => {
    try {
      const res = await axiosInstance.get(`/files/payment/${paymentId}`, {
        responseType: "blob", // Получаем файл как Blob
      });

      // Создаем временную ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName); // Указываем оригинальное имя файла для скачивания
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link); // Удаляем временную ссылку
      window.URL.revokeObjectURL(url); // Освобождаем URL объекта

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

  return (
    <>
      <title>Список платежей — Хочу Плачу</title>

      <meta name="robots" content="noindex, nofollow" />

      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Все платежи
          </h2>
          <Button onClick={handleAddPayment} label="Добавить платеж" />
        </div>

        {/* TODO: Добавить секцию для фильтров, поиска и пагинации (Часть 6+) */}
        {/* <div className="mb-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
           <h3 className="text-lg font-semibold mb-2">Фильтры</h3>
            // Формы для фильтров
       </div> */}

        {/* Отображение ошибки */}
        {errorPayments && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{errorPayments.message}</span>
          </div>
        )}

        {/* Таблица платежей */}
        {!errorPayments && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <PaymentsTable
                data={allPayments}
                isLoading={isLoadingPayments}
                onEdit={handleEditPayment}
                onComplete={handleCompletePayment}
                onDelete={handleDeletePayment}
                onDownloadFile={handleDownloadFile}
              />
            </div>
            {/* Mobile Card View */}
            {!isLoadingPayments && (
              <div className="block md:hidden space-y-3">
                {allPayments.map((payment) => (
                  <PaymentListCard
                    key={payment.id}
                    payment={payment}
                    context="payments"
                    onClick={() => setMobileActionsPayment(payment)}
                    onDownloadFile={handleDownloadFile}
                  />
                ))}
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
        onClose={() => setMobileActionsPayment(null)}
        onEdit={handleEditPayment}
        onComplete={handleCompletePayment}
        onDelete={handleDeletePayment}
      />
    </>
  );
};

export default PaymentsPage;
