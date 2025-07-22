// src/pages/ArchivePage.tsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
// Переиспользуем компоненты для отображения платежа и иконки
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import { getPaymentColorClass } from "../utils/paymentColors";
// Импортируем иконки действий
import {
  ArrowPathIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline"; // Иконка восстановления, удаления и редактирования
import { PaperClipIcon } from "@heroicons/react/24/outline"; // Add import
import { PaymentData } from "../types/paymentData";
import useApi from "../hooks/useApi"; // Import useApi
import { formatRecurrenceRule } from "./PaymentsList";
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
// MobileActionsOverlay and ArchivedPaymentListItem components
const MobileActionsOverlay: React.FC<{
  payment: PaymentData | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRestore: (payment: PaymentData) => void;
  onPermanentDelete: (id: string) => void;
}> = ({ payment, onClose, onEdit, onRestore, onPermanentDelete }) => {
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
const ArchivedPaymentListItem: React.FC<{
  payment: PaymentData;
  onClick: () => void;
}> = ({ payment, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left flex flex-col p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow space-y-3"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <PaymentIconDisplay payment={payment} sizeClass="h-8 w-8" />
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {payment.title}
          </p>
          <p
            className={`text-sm ${
              payment.status === "completed"
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {payment.status === "completed" ? "Выполнен" : "Удален"}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
          {new Intl.NumberFormat("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(payment.amount)}
          <span className="ml-1 text-base font-normal text-gray-500 dark:text-gray-400">
            ₽
          </span>
        </p>
      </div>
    </div>
    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
      <div>
        <p>
          Дата:{" "}
          {new Date(
            payment.completedAt || payment.updatedAt
          ).toLocaleDateString("ru-RU")}
        </p>
      </div>
      {payment.filePath && <PaperClipIcon className="h-5 w-5" />}
    </div>
  </button>
);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Восстановление платежа из серии"
    >
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
            {isProcessing ? (
              <Spinner size="sm" />
            ) : (
              "Восстановить и активировать"
            )}
          </button>
        </div>
      </div>
    </Modal>
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

  const navigate = useNavigate();

  // Effect to transform data when raw data changes
  useEffect(() => {
    if (rawArchivedPayments) {
      const payments = rawArchivedPayments.map((p: unknown) => {
        const payment = p as PaymentData;
        return {
          ...payment,
          amount:
            typeof payment.amount === "string"
              ? parseFloat(payment.amount)
              : payment.amount,
        };
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
  }, [executeFetchArchivedPayments]); // Dependency on executeFetchArchivedPayments

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

  const handleEditPayment = (paymentId: string) => {
    navigate(`/payments/edit/${paymentId}`);
  };

  return (
    <>
      <title>Хочу Плачу - Архив</title>
      <div className="dark:text-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Архив платежей
          </h2>
          {/* TODO: Кнопка добавления платежа не нужна в Архиве */}
        </div>

        {/* TODO: Секция фильтров и сортировки архива */}
        {/* <div className="mb-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-md"> ... </div> */}

        {/* Состояния загрузки или ошибки */}
        {isLoadingArchive && (
          <div className="flex justify-center items-center py-10">
            <Spinner />
          </div>
        )}
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
        {!isLoadingArchive && !errorArchive && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Иконка
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Статус
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Название
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Повторение
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Сумма
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Срок оплаты
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Выполнен/Удален
                    </th>{" "}
                    {/* Дата выполнения или пометки удаления */}
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Категория
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Файл
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {archivedPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-100"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {" "}
                        {/* Иконка */}{" "}
                        <PaymentIconDisplay
                          payment={payment}
                          sizeClass="h-6 w-6"
                        />{" "}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {" "}
                        {/* Статус */}
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-2 ${getPaymentColorClass(
                            payment
                          )}`}
                        ></span>
                        {payment.status === "completed" && "Выполнен"}
                        {payment.status === "deleted" && "Удален"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {" "}
                        {/* Название */} {payment.title}{" "}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {/* Повторение */}
                        {payment.seriesId && payment.series ? ( // Check for series data
                          <span className="flex items-center">
                            <ArrowPathIcon className="h-4 w-4 mr-1 text-blue-500" />
                            {/* Ensure formatRecurrencePattern is available or defined */}
                            {/* Assuming formatRecurrencePattern is defined elsewhere or needs to be added */}
                            {formatRecurrenceRule(
                              payment.series.recurrenceRule
                            )}
                            {payment.series.recurrenceEndDate &&
                              ` до ${new Date(
                                payment.series.recurrenceEndDate
                              ).toLocaleDateString()}`}
                          </span>
                        ) : (
                          "Разовый"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Intl.NumberFormat("ru-RU", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(payment.amount)}
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          ₽
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {" "}
                        {/* Срок оплаты */}{" "}
                        {new Date(payment.dueDate).toLocaleDateString()}{" "}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {" "}
                        {/* Дата выполнения/удаления */}
                        {payment.completedAt
                          ? new Date(payment.completedAt).toLocaleString(
                              "ru-RU"
                            )
                          : new Date(payment.updatedAt).toLocaleString(
                              "ru-RU"
                            )}{" "}
                        {/* Показываем completedAt или updatedAt для удаленных */}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {" "}
                        {/* Категория */}{" "}
                        {payment.category ? payment.category.name : "-"}{" "}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {/* Файл */}
                        {payment.filePath && payment.fileName ? (
                          <button
                            onClick={() =>
                              handleDownloadFile(payment.id, payment.fileName!)
                            } // Ensure handleDownloadFile is defined/imported
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600 cursor-pointer"
                            title={`Скачать ${payment.fileName}`}
                          >
                            <PaperClipIcon className="h-5 w-5 inline-block mr-1" />
                            {/* Можно добавить имя файла payment.fileName, если нужно */}
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                      {/* Ячейка с кнопками действий */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                        {/* НОВАЯ КНОПКА "РЕДАКТИРОВАТЬ" */}
                        <button
                          onClick={() => handleEditPayment(payment.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1 cursor-pointer"
                          title="Редактировать"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>

                        {/* Кнопка Восстановить */}
                        <button
                          onClick={() => handleRestorePayment(payment)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-600 mx-1 cursor-pointer"
                          title="Восстановить"
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>

                        {/* Кнопка Полное Удаление */}
                        <button
                          onClick={() =>
                            handlePermanentDeletePayment(payment.id)
                          }
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 mx-1 cursor-pointer"
                          title="Удалить полностью"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3 p-2">
              {archivedPayments.map((payment) => (
                <ArchivedPaymentListItem
                  key={payment.id}
                  payment={payment}
                  onClick={() => setMobileActionsPayment(payment)}
                />
              ))}
            </div>
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
        onClose={() => setMobileActionsPayment(null)}
        onEdit={handleEditPayment}
        onRestore={handleRestorePayment}
        onPermanentDelete={handlePermanentDeletePayment}
      />
    </>
  );
};

export default ArchivePage;
