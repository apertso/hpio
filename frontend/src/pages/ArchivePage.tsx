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
import { formatRecurrencePattern } from "./PaymentsList";
import PaymentForm from "../components/PaymentForm"; // <-- ДОБАВИТЬ ИМПОРТ ФОРМЫ

// Define the raw API fetch function
const fetchArchivedPaymentsApi = async (): Promise<PaymentData[]> => {
  // TODO: Передать параметры фильтрации и сортировки
  // const res = await axiosInstance.get('/archive', { params: { ...filters, ...sort } });
  const res = await axiosInstance.get("/archive"); // Пока без параметров
  return res.data;
};

const ArchivePage: React.FC = () => {
  // Use useApi for the raw fetch
  const {
    data: rawArchivedPayments,
    isLoading: isLoadingArchive,
    error: errorArchive,
    execute: executeFetchArchivedPayments,
  } = useApi<PaymentData[]>(fetchArchivedPaymentsApi);

  // State for transformed data
  const [archivedPayments, setArchivedPayments] = useState<PaymentData[]>([]);

  // НОВОЕ: Состояние для модального окна редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | undefined>(
    undefined
  );

  // Effect to transform data when raw data changes
  useEffect(() => {
    if (rawArchivedPayments) {
      const payments = rawArchivedPayments.map((p: any) => ({
        ...p,
        amount: parseFloat(p.amount),
        // completedAt может прийти как строка, Date.parse() или new Date()
        completedAt: p.completedAt
          ? new Date(p.completedAt).toLocaleString()
          : null, // Форматируем дату выполнения для отображения
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : null, // Форматируем дату обновления для отображения удаленных
      }));
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

  // Обработчик восстановления платежа
  const handleRestorePayment = async (paymentId: string) => {
    if (
      window.confirm(
        "Вы уверены, что хотите восстановить этот платеж? Он вернется в список активных."
      )
    ) {
      try {
        // Отправляем PUT запрос на эндпоинт восстановления
        await axiosInstance.put(`/archive/${paymentId}/restore`);
        logger.info(`Payment restored: ${paymentId}`);
        executeFetchArchivedPayments(); // Перезагружаем список архива после восстановления
        alert("Платеж успешно восстановлен."); // Временное уведомление
      } catch (error: any) {
        logger.error(
          `Failed to restore payment ${paymentId}:`,
          error.response?.data?.message || error.message
        );
        alert(
          `Не удалось восстановить платеж: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  // Обработчик полного (перманентного) удаления платежа
  const handlePermanentDeletePayment = async (paymentId: string) => {
    if (
      window.confirm(
        "Внимание! Вы уверены, что хотите ПОЛНОСТЬЮ удалить этот платеж? Это действие необратимо и удалит все связанные файлы."
      )
    ) {
      try {
        // Отправляем DELETE запрос на эндпоинт перманентного удаления
        await axiosInstance.delete(`/archive/${paymentId}/permanent`);
        logger.info(`Payment permanently deleted: ${paymentId}`);
        executeFetchArchivedPayments(); // Перезагружаем список архива после удаления
        alert("Платеж полностью удален."); // Временное уведомление
      } catch (error: any) {
        logger.error(
          `Failed to permanently delete payment ${paymentId}:`,
          error.response?.data?.message || error.message
        );
        alert(
          `Не удалось полностью удалить платеж: ${
            error.response?.data?.message || error.message
          }`
        );
      }
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
    } catch (error: any) {
      logger.error(
        `Failed to download file for archived payment ${paymentId}:`,
        error.response?.data?.message || error.message
      );
      alert(
        `Не удалось скачать файл: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  };

  // НОВОЕ: Обработчики для открытия/закрытия модального окна
  const handleOpenModal = (paymentId: string) => {
    setEditingPaymentId(paymentId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPaymentId(undefined);
  };

  // НОВОЕ: Обработчик для успешного сохранения (обновляет список)
  const handlePaymentSaved = () => {
    handleCloseModal();
    executeFetchArchivedPayments(); // Обновляем список архива
    alert("Платеж успешно обновлен.");
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
          /* ... */ <div className="text-center text-gray-700 dark:text-gray-300">
            Загрузка архива... {/* TODO: Добавить спиннер */}
          </div>
        )}
        {errorArchive && (
          /* ... */ <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            {" "}
            {errorArchive?.message}{" "}
          </div>
        )}

        {/* Таблица архивных платежей */}
        {!isLoadingArchive && !errorArchive && (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            {archivedPayments.length > 0 ? (
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
                            {formatRecurrencePattern(
                              payment.series.recurrencePattern
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
                        {" "}
                        {/* Сумма */} {payment.amount.toFixed(2)}{" "}
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
                          ? payment.completedAt
                          : payment.updatedAt}{" "}
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
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600"
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
                          onClick={() => handleOpenModal(payment.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1"
                          title="Редактировать"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>

                        {/* Кнопка Восстановить */}
                        <button
                          onClick={() => handleRestorePayment(payment.id)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-600 mx-1"
                          title="Восстановить"
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>

                        {/* Кнопка Полное Удаление */}
                        <button
                          onClick={() =>
                            handlePermanentDeletePayment(payment.id)
                          }
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 mx-1"
                          title="Удалить полностью"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-gray-700 dark:text-gray-300">
                Архив пуст.
              </div>
            )}
          </div>
        )}

        {/* НОВАЯ МОДАЛКА РЕДАКТИРОВАНИЯ */}
        <PaymentForm
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          paymentId={editingPaymentId}
          onSuccess={handlePaymentSaved}
        />
      </div>
    </>
  );
};

export default ArchivePage;
