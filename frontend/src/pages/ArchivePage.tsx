// src/pages/ArchivePage.tsx
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
// Переиспользуем компоненты для отображения платежа и иконки
import PaymentIconDisplay from "../components/PaymentIconDisplay";
import { getPaymentColorClass } from "../utils/paymentColors";
// Импортируем иконки действий
import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline"; // Иконка восстановления и удаления

// Интерфейс для данных платежа (должен совпадать с другими списками)
interface PaymentData {
  id: string;
  title: string;
  amount: number; // number после преобразования
  dueDate: string; // YYYY-MM-DD
  status: "upcoming" | "overdue" | "completed" | "deleted"; // В архиве ожидаем 'completed' или 'deleted'
  isRecurrent: boolean;
  createdAt: string; // Дата создания
  completedAt?: string | null; // Дата выполнения (есть для completed)
  category?: { id: string; name: string } | null;
  filePath?: string | null;
  fileName?: string | null; // Информация о файле
  iconType?: "builtin" | "custom" | null;
  builtinIconName?: string | null;
  iconPath?: string | null; // Информация об иконке
  parentId?: string | null; // Связь для повторяющихся
  updatedAt: string; // Добавлено для отображения даты удаления
}

const ArchivePage: React.FC = () => {
  // Состояние для хранения списка архивных платежей
  const [archivedPayments, setArchivedPayments] = useState<PaymentData[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(true);
  const [errorArchive, setErrorArchive] = useState<string | null>(null);

  // TODO: Состояние для фильтров и сортировки архива (если реализовано на бэкенде)
  // const [filters, setFilters] = useState({ status: '', categoryId: '', search: '' });
  // const [sort, setSort] = useState({ field: 'completedAt', order: 'desc' });

  // Функция для загрузки архивных платежей
  const fetchArchivedPayments = useCallback(async () => {
    setIsLoadingArchive(true);
    setErrorArchive(null);
    try {
      // TODO: Передать параметры фильтрации и сортировки
      // const res = await axiosInstance.get('/archive', { params: { ...filters, ...sort } });
      const res = await axiosInstance.get("/archive"); // Пока без параметров

      // Преобразуем amount в number
      const payments = res.data.map((p: any) => ({
        ...p,
        amount: parseFloat(p.amount),
        // completedAt может прийти как строка, Date.parse() или new Date()
        completedAt: p.completedAt
          ? new Date(p.completedAt).toLocaleString()
          : null, // Форматируем дату выполнения для отображения
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleString() : null, // Форматируем дату обновления для отображения удаленных
      }));
      setArchivedPayments(payments);
      logger.info(`Successfully fetched ${payments.length} archived payments.`);
    } catch (error: any) {
      logger.error(
        "Failed to fetch archived payments:",
        error.response?.data?.message || error.message
      );
      setErrorArchive("Не удалось загрузить архив платежей.");
    } finally {
      setIsLoadingArchive(false);
    }
  }, []); // TODO: Добавить в зависимости: filters, sort (когда будут реализованы)

  // Эффект для загрузки данных при монтировании компонента
  useEffect(() => {
    fetchArchivedPayments();
  }, [fetchArchivedPayments]);

  // --- Обработчики действий над платежами в архиве ---

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
        fetchArchivedPayments(); // Перезагружаем список архива после восстановления
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
        fetchArchivedPayments(); // Перезагружаем список архива после удаления
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

  return (
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
          {errorArchive}{" "}
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
                      {" "}
                      {/* Повторение */}
                      {payment.isRecurrent ? (
                        <span className="flex items-center">
                          {/* TODO: Иконка повторения ArrowPathIcon */}
                          {/* formatRecurrencePattern(payment.recurrencePattern) */}{" "}
                          Повтор
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
                      {" "}
                      {/* Файл */}
                      {payment.filePath && payment.fileName ? (
                        // TODO: Использовать handleDownloadFile из PaymentsList или адаптировать
                        <span className="text-blue-500 dark:text-blue-400">
                          Файл прикреплен
                        </span> // Пока просто текст
                      ) : (
                        "-"
                      )}
                    </td>
                    {/* Ячейка с кнопками действий */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                      {/* Кнопка Редактировать (если разрешено редактировать в архиве) */}
                      {/* TODO: Добавить модалку редактирования в Архив, если нужно */}
                      {/* <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1"> <PencilIcon className="h-5 w-5" /> </button> */}

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
                        onClick={() => handlePermanentDeletePayment(payment.id)}
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

      {/* Модальное окно редактирования не нужно на этой странице, если редактирование не предусмотрено ТЗ для архива */}
      {/* Если редактирование из архива нужно (2.5 ТЗ): добавить модалку и логику handleOpenModal здесь */}
      {/* <Modal> ... PaymentForm ... </Modal> */}
    </div>
  );
};

export default ArchivePage;
