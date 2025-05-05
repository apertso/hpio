// src/pages/PaymentsList.tsx
import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import logger from "../utils/logger";
import PaymentForm from "../components/PaymentForm"; // Форма для редактирования
import Modal from "../components/Modal"; // Модальное окно
import { getPaymentColorClass } from "../utils/paymentColors"; // Для цветовой индикации в таблице
import PaymentIconDisplay from "../components/PaymentIconDisplay"; // !!! Импорт компонента отображения иконки
// Импортируем иконки (пример с Heroicons - нужно установить иконки, если еще не сделали)
// npm install @heroicons/react
import {
  PencilIcon,
  CheckCircleIcon,
  TrashIcon,
  PaperClipIcon, // Import PaperClipIcon
} from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/outline"; // Иконка повторения

// Интерфейс для данных платежа (должен совпадать с тем, что возвращает бэкенд /api/payments/list)
interface PaymentData {
  id: string;
  title: string;
  amount: number; // number после преобразования
  dueDate: string; // YYYY-MM-DD
  status: "upcoming" | "overdue" | "completed" | "deleted";
  isRecurrent: boolean; // !!! Добавлено
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly" | null; // !!! Добавлено
  recurrenceEndDate?: string | null; // !!! Добавлено
  createdAt: string; // Дата создания
  filePath?: string | null; // !!! Добавлено поле для пути к файлу
  fileName?: string | null; // !!! Добавлено поле для имени файла
  // !!! Добавлены поля иконки
  iconType?: "builtin" | "custom" | null;
  builtinIconName?: string | null;
  iconPath?: string | null;
  category?: { id: string; name: string } | null; // !!! Может быть объект категории или null
}

// TODO: Хелпер для форматирования шаблона повторения на русский
const formatRecurrencePattern = (
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

const PaymentsList: React.FC = () => {
  // Состояние для хранения списка всех платежей
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [errorPayments, setErrorPayments] = useState<string | null>(null);

  // Состояние для модального окна редактирования
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | undefined>(
    undefined
  );

  // TODO: Состояние для фильтров и сортировки (реализовать позже)
  // const [filters, setFilters] = useState({ status: '', categoryId: '', search: '' });
  // const [sort, setSort] = useState({ field: 'dueDate', order: 'asc' });
  // const [pagination, setPagination] = useState({ page: 1, limit: 10 }); // Пагинация

  // Функция для загрузки всех платежей
  const fetchAllPayments = useCallback(async () => {
    setIsLoadingPayments(true);
    setErrorPayments(null);
    try {
      // TODO: Передать параметры фильтрации, сортировки и пагинации в запрос
      // const res = await axiosInstance.get('/payments/list', { params: { ...filters, ...sort, ...pagination } });
      const res = await axiosInstance.get("/payments/list"); // Пока без параметров

      // Преобразуем amount в number
      const payments = res.data.map((p: any) => ({
        ...p,
        amount: parseFloat(p.amount),
      }));
      setAllPayments(payments);
      logger.info(`Successfully fetched ${payments.length} all payments.`);
    } catch (error: any) {
      logger.error(
        "Failed to fetch all payments:",
        error.response?.data?.message || error.message
      );
      setErrorPayments("Не удалось загрузить список платежей.");
    } finally {
      setIsLoadingPayments(false);
    }
  }, []); // TODO: Добавить в зависимости: filters, sort, pagination (когда будут реализованы)

  // Эффект для загрузки данных при монтировании компонента
  useEffect(() => {
    fetchAllPayments();
    // NOTE: fetchAllPayments добавлена в зависимости
  }, [fetchAllPayments]);

  // Обработчики модального окна
  const handleOpenModal = (paymentId?: string) => {
    setEditingPaymentId(paymentId); // Передаем ID для редактирования
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPaymentId(undefined);
    // TODO: Возможно, сбросить форму при закрытии
  };

  // Обработчик успешного сохранения/редактирования платежа
  const handlePaymentSaved = () => {
    handleCloseModal();
    fetchAllPayments(); // Перезагружаем список после сохранения/редактирования
    alert("Платеж успешно сохранен!"); // Временное уведомление
  };

  // TODO: Обработчики действий над платежом (Часть 8)
  const handleCompletePayment = async (paymentId: string) => {
    if (
      window.confirm("Вы уверены, что хотите отметить платеж как выполненный?")
    ) {
      try {
        await axiosInstance.put(`/payments/${paymentId}/complete`);
        logger.info(`Payment marked as completed: ${paymentId}`);
        fetchAllPayments(); // Перезагружаем список после выполнения
      } catch (error: any) {
        logger.error(
          `Failed to complete payment ${paymentId}:`,
          error.response?.data?.message || error.message
        );
        alert(
          `Не удалось отметить платеж как выполненный: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  // Логическое удаление платежа (перемещение в архив)
  const handleDeletePayment = async (paymentId: string) => {
    if (
      window.confirm(
        "Вы уверены, что хотите удалить платеж (переместить в архив)?"
      )
    ) {
      try {
        await axiosInstance.delete(`/payments/${paymentId}`);
        logger.info(`Payment soft-deleted: ${paymentId}`);
        fetchAllPayments(); // Перезагружаем список после удаления
      } catch (error: any) {
        logger.error(
          `Failed to soft-delete payment ${paymentId}:`,
          error.response?.data?.message || error.message
        );
        alert(
          `Не удалось удалить платеж: ${
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
          Все платежи
        </h2>
        {/* Кнопка добавления платежа также на этой странице */}
        <button
          onClick={() => handleOpenModal()} // Открываем модалку для создания (без ID)
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
        >
          Добавить платеж
        </button>
      </div>

      {/* TODO: Добавить секцию для фильтров, поиска и пагинации (Часть 6+) */}
      {/* <div className="mb-4 p-4 bg-gray-200 dark:bg-gray-700 rounded-md">
           <h3 className="text-lg font-semibold mb-2">Фильтры</h3>
            // Формы для фильтров
      </div> */}

      {/* Отображение состояния загрузки или ошибки */}
      {isLoadingPayments && (
        <div className="text-center text-gray-700 dark:text-gray-300">
          Загрузка платежей... {/* TODO: Добавить спиннер */}
        </div>
      )}
      {errorPayments && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span className="block sm:inline">{errorPayments}</span>
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
                      {payment.isRecurrent ? (
                        <span className="flex items-center">
                          <ArrowPathIcon className="h-4 w-4 mr-1 text-blue-500" />{" "}
                          {/* Иконка */}
                          {formatRecurrencePattern(payment.recurrencePattern)}
                          {payment.recurrenceEndDate &&
                            ` до ${new Date(
                              payment.recurrenceEndDate
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
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-600 disabled:opacity-50"
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
                          onClick={() => handleOpenModal(payment.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 mx-1" // mx-1 для отступов между кнопками
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
                            onClick={() => handleCompletePayment(payment.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-600 mx-1"
                            title="Отметить как выполненный"
                          >
                            <CheckCircleIcon className="h-5 w-5" />{" "}
                            {/* Иконка выполнения */}
                          </button>
                          {/* Кнопка Удалить (логически) */}
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 mx-1"
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

      {/* ... Модальное окно с формой ... */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPaymentId ? "Редактировать платеж" : "Добавить платеж"}
      >
        <PaymentForm
          paymentId={editingPaymentId}
          onSuccess={handlePaymentSaved}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
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
  } catch (error: any) {
    logger.error(
      `Failed to download file for payment ${paymentId}:`,
      error.response?.data?.message || error.message
    );
    alert(
      `Не удалось скачать файл: ${
        error.response?.data?.message || error.message
      }`
    );
  }
};

export default PaymentsList;
