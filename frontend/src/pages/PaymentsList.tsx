// src/pages/PaymentsList.tsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import { getPaymentColorClass } from "../utils/paymentColors"; // Для цветовой индикации в таблице
import PaymentIconDisplay from "../components/PaymentIconDisplay"; // !!! Импорт компонента отображения иконки
import useApi from "../hooks/useApi"; // Import useApi
// Импортируем иконки (пример с Heroicons - нужно установить иконки, если еще не сделали)
// npm install @heroicons/react
import {
  PencilIcon,
  CheckCircleIcon,
  TrashIcon,
  PaperClipIcon, // Import PaperClipIcon
} from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/outline"; // Recurrence icon
import { Button } from "../components/Button"; // Import the Button component
import { PaymentData } from "../types/paymentData";
import Spinner from "../components/Spinner";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext"; // Import useToast
import ConfirmCompletionDateModal from "../components/ConfirmCompletionDateModal"; // Import ConfirmCompletionDateModal
import ConfirmModal from "../components/ConfirmModal"; // Import ConfirmModal

// TODO: Хелпер для форматирования шаблона повторения на русский
export const formatRecurrencePattern = (
  pattern: "daily" | "weekly" | "monthly" | "yearly" | null | undefined
) => {
  switch (pattern) {
    case "daily":
      return "Ежедневно";
    case "weekly":
      return "Еженедельно";
    case "monthly":
      return "Ежемесячно";
    case "yearly":
      return "Ежегодно";
    default:
      return "-";
  }
};

// Define the raw API fetch function for all payments
const fetchAllPaymentsApi = async (): Promise<PaymentData[]> => {
  // TODO: Передать параметры фильтрации, сортировки и пагинации в запрос
  // const res = await axiosInstance.get('/payments/list', { params: { ...filters, ...sort, ...pagination } });
  const res = await axiosInstance.get("/payments/list"); // Пока без параметров
  return res.data;
};

const PaymentsList: React.FC = () => {
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to complete payment ${paymentId}:`, errorMessage);
      showToast("Не удалось выполнить платеж.", "error");
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
  const handleDeletePayment = async (paymentId: string) => {
    const action = async () => {
      try {
        await axiosInstance.delete(`/payments/${paymentId}`);
        logger.info(`Payment soft-deleted: ${paymentId}`);
        showToast("Платеж перемещен в архив.", "info");
        executeFetchAllPayments();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error(
          `Failed to soft-delete payment ${paymentId}:`,
          errorMessage
        );
        showToast("Не удалось удалить платеж.", "error");
      }
    };

    setConfirmModalState({
      isOpen: true,
      action,
      title: "Удалить платеж",
      message: "Вы уверены, что хотите удалить платеж (переместить в архив)?",
    });
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
      <title>Хочу Плачу - Список платежей</title>
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

        {/* Отображение состояния загрузки или ошибки */}
        {isLoadingPayments && (
          <div className="flex justify-center items-center py-10">
            <Spinner />
          </div>
        )}
        {errorPayments && (
          <div
            className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{errorPayments.message}</span>
          </div>
        )}

        {/* Таблица платежей */}
        {!isLoadingPayments && !errorPayments && (
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
            {allPayments.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {/* !!! Новый столбец для иконки */}
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
                    {/* !!! Новый столбец для типа повторения */}
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Повторение
                    </th>
                    {/* ... другие заголовки ... */}
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
                      Категория {/* TODO: Отображать категорию (Часть 10) */}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Файл
                    </th>{" "}
                    {/* Новый столбец */}
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                    >
                      Действия
                    </th>{" "}
                    {/* Выравнивание вправо для кнопок */}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {allPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-100"
                    >
                      {/* !!! Ячейка для иконки */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        <PaymentIconDisplay
                          payment={payment}
                          sizeClass="h-6 w-6"
                        />
                      </td>
                      {/* ... остальные ячейки (статус, название, сумма, срок, категория) ... */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {" "}
                        {/* Статус */}
                        {/* Цветовой индикатор статуса */}
                        {/* Передаем весь объект payment, если утилита это поддерживает (см. Часть 5) */}
                        <span
                          className={`inline-block w-3 h-3 rounded-full mr-2 ${getPaymentColorClass(
                            payment
                          )}`}
                        ></span>
                        {/* Текстовое обозначение статуса */}
                        {payment.status === "upcoming" && "Предстоящий"}
                        {payment.status === "overdue" && "Просрочен"}
                        {payment.status === "completed" && "Выполнен"}
                        {payment.status === "deleted" && "Удален"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                        {" "}
                        {/* Название */} {payment.title}{" "}
                      </td>

                      {/* !!! Ячейка для типа повторения */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {/* Повторение */}
                        {payment.seriesId && payment.series?.isActive ? ( // Платеж является частью АКТИВНОЙ серии
                          <span className="flex items-center">
                            <ArrowPathIcon className="h-4 w-4 mr-1 text-blue-500" />
                            {formatRecurrencePattern(
                              payment.series.recurrencePattern
                            )}
                            {payment.series.recurrenceEndDate &&
                              ` до ${new Date(
                                payment.series.recurrenceEndDate
                              ).toLocaleDateString()}`}
                          </span>
                        ) : payment.seriesId && !payment.series?.isActive ? ( // Платеж является частью НЕАКТИВНОЙ серии
                          <span className="flex items-center text-gray-400 italic">
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Шаблон неактивен
                          </span>
                        ) : (
                          // Разовый платеж
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
                        {/* Категория */}{" "}
                        {payment.category ? payment.category.name : "-"}{" "}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {" "}
                        {/* Файл */}
                        {/* Отображаем иконку, если есть файл */}
                        {payment.filePath && payment.fileName ? (
                          <button
                            onClick={() =>
                              handleDownloadFile(payment.id, payment.fileName!)
                            } // Вызываем функцию скачивания
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600 disabled:opacity-50 cursor-pointer"
                            title={payment.fileName}
                            // disabled={isDeleting || isSubmitting} // Отключаем, если платеж удаляется или форма отправляется - isSubmitting не определен здесь
                            disabled={false} // Временно отключаем disabled
                          >
                            <PaperClipIcon className="h-5 w-5 inline-block mr-1" />
                          </button>
                        ) : (
                          "-" // Если файла нет
                        )}
                      </td>
                      {/* ... ячейка с действиями ... */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                        {" "}
                        {/* Действия */}
                        {/* Кнопка Редактировать - доступна для всех, кроме перманентно удаленных (которых нет в списке) */}
                        {/* Также можно запретить редактирование completed/deleted, если это бизнес-требование */}
                        {payment.status !== "deleted" && ( // Например, разрешим редактирование completed
                          <button
                            onClick={() => handleEditPayment(payment.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1 cursor-pointer" // mx-1 для отступов между кнопками
                            title="Редактировать"
                          >
                            <PencilIcon className="h-5 w-5" />{" "}
                            {/* Иконка редактирования */}
                          </button>
                        )}
                        {/* Кнопки действий в зависимости от статуса для активных платежей */}
                        {payment.status === "upcoming" ||
                        payment.status === "overdue" ? (
                          <>
                            {/* Кнопка Выполнить */}
                            <button
                              onClick={() => handleCompletePayment(payment)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-600 mx-1 cursor-pointer"
                              title="Отметить как выполненный"
                            >
                              <CheckCircleIcon className="h-5 w-5" />{" "}
                              {/* Иконка выполнения */}
                            </button>
                            {/* Кнопка Удалить (логически) */}
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 mx-1 cursor-pointer"
                              title="Удалить (переместить в архив)"
                            >
                              <TrashIcon className="h-5 w-5" />{" "}
                              {/* Иконка удаления */}
                            </button>
                          </>
                        ) : (
                          // Действия для выполненных и удаленных платежей (в этом списке, но основные в Архиве)
                          // TODO: В Архиве будут другие действия (Восстановить, Перманентно удалить) (Часть 18)
                          <span className="text-gray-500 dark:text-gray-400 mx-1">
                            {payment.status === "completed" && "Выполнен"}
                            {payment.status === "deleted" && "Удален"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-gray-700 dark:text-gray-300">
                Нет платежей для отображения.
              </div>
            )}
          </div>
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
    </>
  );
};

export default PaymentsList;
