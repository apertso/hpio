import db from "../models"; // Доступ к моделям
import { Op, Sequelize } from "sequelize"; // Для операторов запросов
import logger from "../config/logger";
import { deleteFileFromFS } from "./fileService"; // Переиспользуем удаление из ФС и открепление иконки
import { PaymentInstance } from "../models/Payment";
import { CategoryInstance } from "../models/Category";
import { RRule } from "rrule";

// Пример интерфейса для данных платежа (опционально, для строгой типизации)
interface PaymentData {
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId?: string | null; // Allow null for category
  // Fields for creating a new recurring series (only used during creation)
  recurrenceRule?: string; // Новое поле для RRULE
  recurrenceEndDate?: string; // YYYY-MM-DD string for input
  // Fields for files and icons (handled by fileService/icon logic)
  filePath?: string | null;
  fileName?: string | null;
  builtinIconName?: string | null;
  // Option to create a completed payment immediately (used during creation)
  createAsCompleted?: boolean;
  // seriesId is not part of input data for create/update payment instance
}

// --- Вспомогательная функция: рассчитать следующую дату платежа ---
// Новая версия с rrule
const calculateNextDueDate = (
  rruleString: string,
  seriesStartDate: Date,
  seriesEndDate?: Date | null
): Date | null => {
  try {
    if (!rruleString || rruleString.trim() === "") {
      return null;
    }
    // Временное исправление для некорректно сгенерированных строк rrule.
    // Используем RegExp с word boundary (\b), чтобы не заменять 'FREQ=MONTHLY' на 'FREQ=MONTHLYLY'.
    const correctedRruleString = rruleString
      .trim()
      .replace(/FREQ=DAY\b/g, "FREQ=DAILY")
      .replace(/FREQ=WEEK\b/g, "FREQ=WEEKLY")
      .replace(/FREQ=MONTH\b/g, "FREQ=MONTHLY")
      .replace(/FREQ=YEAR\b/g, "FREQ=YEARLY");

    const rule = RRule.fromString(correctedRruleString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // `dtstart` важен, чтобы правило знало отправную точку для расчета.
    // rrule.js работает с датами JS. Модели Sequelize с DATEONLY (`YYYY-MM-DD`)
    // при `new Date()` создают объект Date в UTC 00:00, что является правильным поведением.
    rule.options.dtstart = seriesStartDate;
    // Ищем следующую дату СТРОГО после lastDueDate.
    // inc=false означает, что если lastDueDate сама является валидной датой, она не будет возвращена,
    // а будет найдена следующая за ней.
    const nextDate = rule.after(today, false);
    if (seriesEndDate && nextDate > seriesEndDate) {
      return null;
    }
    return nextDate;
  } catch (error) {
    logger.error(`Error parsing rrule string: ${rruleString}`, error);
    return null;
  }
};

// --- Функции для горизонтальной ленты и полного списка ---

// Получить активные предстоящие платежи для горизонтальной ленты (2.2)
// Включает upcoming и overdue
export const getUpcomingPayments = async (userId: string, days: number) => {
  try {
    const now = new Date();
    // Устанавливаем время на полночь для сравнения только дат
    now.setHours(0, 0, 0, 0);

    // Получаем платежи пользователя со статусом 'upcoming' ИЛИ 'overdue'
    // Сортируем по дате срока оплаты по возрастанию
    // Calculate the date N days from now
    const daysFromNow = new Date(now);
    daysFromNow.setDate(now.getDate() + days);
    // Set time to end of the day for inclusive comparison
    daysFromNow.setHours(23, 59, 59, 999);

    const payments = await db.Payment.findAll({
      where: {
        userId: userId,
        status: {
          [Op.in]: ["upcoming", "overdue"], // Включаем предстоящие и просроченные
        },
        dueDate: {
          // Filter by due date within the next N days
          [Op.lte]: daysFromNow,
        },
      },
      order: [["dueDate", "ASC"]],
      // TODO: include: [{ model: db.Category, as: 'category' }] // Включить категорию после ее создания
    });

    logger.info(
      `Fetched ${payments.length} upcoming/overdue payments for user ${userId} for the next ${days} days`
    );
    return payments; // Возвращаем модели Sequelize, Frontend обработает их
  } catch (error) {
    logger.error(`Error fetching upcoming payments for user ${userId}:`, error);
    throw new Error("Не удалось получить предстоящие платежи.");
  }
};

// Получить полный список платежей с фильтрацией (2.3)
// Реализация фильтрации будет дорабатываться в Части 6
export const getFilteredPayments = async (userId: string, filters: any) => {
  try {
    const where: any = { userId: userId };

    // Базовая фильтрация по статусу
    if (
      filters.status &&
      ["upcoming", "overdue", "completed", "deleted"].includes(filters.status)
    ) {
      where.status = filters.status;
    } else {
      // По умолчанию показываем только активные платежи (upcoming и overdue)
      where.status = {
        [Op.notIn]: ["completed", "deleted"], // Исключаем completed и deleted из основного списка
      };
    }

    // TODO: Добавить фильтрацию по категориям (categoryId in [...])
    // TODO: Добавить фильтрацию по диапазону дат (dueDate between start/end)
    // TODO: Добавить поиск по названию (title like '%search%')

    // TODO: Добавить сортировку и пагинацию (order, limit, offset)
    const order: any = [["dueDate", "ASC"]]; // Сортировка по умолчанию

    const payments = await db.Payment.findAll({
      where,
      order,
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        }, // Include category
        {
          model: db.RecurringSeries,
          as: "series",
          attributes: [
            "id",
            "title",
            "amount",
            "recurrenceRule",
            "recurrenceEndDate",
            "builtinIconName",
            "isActive",
          ],
        }, // Include recurring series data
      ],
      // TODO: limit, offset for pagination
    });

    logger.info(
      `Fetched ${payments.length} filtered payments for user ${userId}`
    );
    return payments;
  } catch (error) {
    logger.error(`Error fetching filtered payments for user ${userId}:`, error);
    throw new Error("Не удалось получить список платежей.");
  }
};

// --- Функции CRUD ---

// Создание платежа (2.2)
export const createPayment = async (
  userId: string,
  paymentData: PaymentData
) => {
  // TODO: Add more strict validation for paymentData (e.g., with express-validator or manually)
  // Check required fields: title, amount, dueDate
  if (
    !paymentData.title ||
    paymentData.amount == null ||
    !paymentData.dueDate
  ) {
    throw new Error("Missing required fields: title, amount, or due date.");
  }
  // Check date format, amount, etc.

  try {
    let seriesId: string | null = null;

    // If creating a recurring payment, create a RecurringSeries entry first
    if (paymentData.recurrenceRule) {
      // Проверяем новое поле
      // Check for recurrencePattern directly
      // ... (ensure recurrenceEndDate is handled if provided)
      let recurrenceEndDate: Date | null = null;
      if (paymentData.recurrenceEndDate) {
        recurrenceEndDate = new Date(paymentData.recurrenceEndDate);
        recurrenceEndDate.setUTCHours(0, 0, 0, 0);
      }

      const newSeries = await db.RecurringSeries.create({
        userId: userId,
        title: paymentData.title,
        amount: paymentData.amount,
        categoryId: paymentData.categoryId || null,
        startDate: paymentData.dueDate, // Дата первого платежа - это и есть startDate серии
        recurrenceRule: paymentData.recurrenceRule, // Используем новое поле
        recurrenceEndDate: recurrenceEndDate,
        builtinIconName: paymentData.builtinIconName || null,
        isActive: true,
      });
      seriesId = newSeries.id;
      logger.info(
        `Created new recurring series (ID: ${seriesId}, User: ${userId})`
      );
    }

    // Create the payment instance
    const payment = await db.Payment.create({
      userId: userId,
      categoryId: paymentData.categoryId || null,
      title: paymentData.title,
      amount: paymentData.amount,
      dueDate: paymentData.dueDate,
      seriesId: seriesId, // Link to the recurring series (or null for non-recurring)

      status: paymentData.createAsCompleted ? "completed" : "upcoming",
      completedAt: paymentData.createAsCompleted
        ? Sequelize.literal("GETDATE()")
        : null,
      // filePath, fileName, builtinIconName are handled by fileService/icon logic
      // Copy icon data to the first payment instance if it's a new series
      builtinIconName: paymentData.builtinIconName || null,
    });

    logger.info(
      `Payment created (ID: ${payment.id}, User: ${userId}, Status: ${payment.status}, Series ID: ${payment.seriesId})`
    );
    // Return the payment with category and series data after creation
    return await getPaymentById(payment.id, userId);
  } catch (error: any) {
    logger.error(`Error creating payment for user ${userId}:`, error);
    throw new Error(error.message || "Failed to create payment.");
  }
};

// Получение деталей платежа (2.2)
export const getPaymentById = async (paymentId: string, userId: string) => {
  try {
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Mandatory ownership check
      },
      attributes: [
        // Explicitly select fields, including file fields
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "createdAt",
        "updatedAt",
        "completedAt",
        "filePath",
        "fileName", // Include file fields
        "builtinIconName",
        "seriesId", // Include seriesId
      ],
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        }, // Include category
        {
          model: db.RecurringSeries,
          as: "series",
          attributes: [
            "id",
            "title",
            "amount",
            "recurrenceRule",
            "recurrenceEndDate",
            "builtinIconName",
            "isActive",
          ],
        }, // Include recurring series data
      ],
    });

    if (!payment) {
      logger.warn(
        `Payment not found or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден или не принадлежит пользователю
    }

    if (payment.seriesId) {
      // Find the last *active* payment in the series
      const lastPaymentInSeries = await db.Payment.findOne({
        where: {
          seriesId: payment.seriesId,
          status: { [Op.in]: ["upcoming", "overdue"] },
        },
        order: [["dueDate", "DESC"]],
      });
      // Add a non-persistent flag to the instance
      payment.setDataValue(
        "isLastInSeries" as any,
        lastPaymentInSeries ? lastPaymentInSeries.id === payment.id : false
      );
    } else {
      payment.setDataValue("isLastInSeries" as any, false);
    }

    logger.info(`Fetched payment details (ID: ${payment.id}, User: ${userId})`);
    return payment;
  } catch (error) {
    logger.error(
      `Error fetching payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Не удалось получить детали платежа.");
  }
};

// Редактирование платежа (2.2)
export const updatePayment = async (
  paymentId: string,
  userId: string,
  paymentData: Partial<PaymentData>
) => {
  // TODO: Add validation for paymentData
  if (Object.keys(paymentData).length === 0) {
    throw new Error("No data provided for update.");
  }
  // Ensure that recurrence-related fields are not updated via this endpoint
  const disallowedFields = [
    "isRecurrent",
    // "recurrencePattern", // Удалено, чтобы разрешить установку для нового шаблона
    // "recurrenceEndDate", // Удалено
    "seriesId", // seriesId по-прежнему не должен меняться напрямую для существующей серии
    // Removed "parentId" as it no longer exists
  ];
  disallowedFields.forEach((field) => {
    if (paymentData.hasOwnProperty(field)) {
      logger.warn(
        `Attempted to update disallowed field "${field}" on payment ${paymentId} by user ${userId}. Ignoring.`
      );
      delete (paymentData as any)[field]; // Remove disallowed field
    }
  });

  try {
    // Find the payment to ensure it belongs to the user
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for update or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found or does not belong to the user
    }

    // Prevent changing recurrence for archived payments
    if (
      (payment.status === "completed" || payment.status === "deleted") &&
      paymentData.hasOwnProperty("recurrenceRule")
    ) {
      throw new Error(
        "Cannot change recurrence for a completed or archived payment."
      );
    }

    // Update only the provided allowed fields
    const fieldsToUpdate: any = {};
    const allowedFields = [
      "title",
      "amount",
      "dueDate",
      "categoryId",
      "filePath",
      "fileName",
      "builtinIconName",
      "completedAt",
    ];

    allowedFields.forEach((field) => {
      if (paymentData.hasOwnProperty(field)) {
        fieldsToUpdate[field] = (paymentData as any)[field];
      }
    });

    // Специальная обработка для completedAt
    if (fieldsToUpdate.completedAt) {
      if (payment.status !== "completed") {
        logger.warn(
          `Attempt to update completedAt for a non-completed payment ${paymentId}. Ignoring.`
        );
        delete fieldsToUpdate.completedAt;
      } else {
        const newDate = new Date(fieldsToUpdate.completedAt);
        if (isNaN(newDate.getTime())) {
          throw new Error("Неверный формат даты выполнения.");
        }
        fieldsToUpdate.completedAt = newDate;
      }
    }

    // If there are fields to update, perform the update
    // Логика для конвертации разового платежа в новый регулярный
    if (paymentData.recurrenceRule && !payment.seriesId) {
      logger.info(
        `Converting one-time payment ${payment.id} to a new recurring series.`
      );
      let recurrenceEndDateForNewSeries: Date | null = null;
      if (paymentData.recurrenceEndDate) {
        // paymentData.recurrenceEndDate is expected to be a string based on interface
        const endDateInput = new Date(paymentData.recurrenceEndDate as string);
        if (!isNaN(endDateInput.getTime())) {
          // Проверка на валидность даты
          recurrenceEndDateForNewSeries = endDateInput;
          recurrenceEndDateForNewSeries.setUTCHours(0, 0, 0, 0);
        } else {
          logger.warn(
            `Invalid recurrenceEndDate received: ${paymentData.recurrenceEndDate}`
          );
        }
      }

      const newSeries = await db.RecurringSeries.create({
        userId: userId,
        title: fieldsToUpdate.title || payment.title,
        amount: fieldsToUpdate.amount || payment.amount,
        categoryId:
          fieldsToUpdate.categoryId !== undefined
            ? fieldsToUpdate.categoryId
            : payment.categoryId,
        startDate: fieldsToUpdate.dueDate || payment.dueDate, // The due date of the current payment
        recurrenceRule: paymentData.recurrenceRule,
        recurrenceEndDate: recurrenceEndDateForNewSeries,
        // Используем иконку из paymentData, если есть, иначе из существующего платежа
        builtinIconName:
          paymentData.builtinIconName !== undefined
            ? paymentData.builtinIconName
            : payment.builtinIconName,
        isActive: true, // Новая серия активна по умолчанию
      });
      fieldsToUpdate.seriesId = newSeries.id; // Привязываем платеж к новой серии
      logger.info(
        `Created new recurring series (ID: ${newSeries.id}) for payment ${payment.id} during update.`
      );

      // Если иконка была изменена в paymentData, она уже будет в fieldsToUpdate
      // и применится к экземпляру платежа ниже.
    } else if (
      paymentData.hasOwnProperty("recurrenceRule") &&
      paymentData.recurrenceRule === null &&
      payment.seriesId
    ) {
      // Если пользователь явно очистил recurrencePattern для существующего регулярного платежа,
      // отсоединяем его от серии (делаем разовым).
      // ВАЖНО: Это изменит только этот экземпляр. Сама серия останется.
      // Если это последний активный платеж серии, серия может быть удалена (логика в deletePayment/completePayment).
      logger.info(
        `Detaching payment ${payment.id} from series ${payment.seriesId} to make it one-time.`
      );
      fieldsToUpdate.seriesId = null;
      // Также удаляем recurrencePattern и recurrenceEndDate из fieldsToUpdate, т.к. они относятся к серии
      delete fieldsToUpdate.recurrenceRule;
      delete fieldsToUpdate.recurrenceEndDate;
    } else if (
      payment.seriesId &&
      (paymentData.hasOwnProperty("recurrenceRule") ||
        paymentData.hasOwnProperty("recurrenceEndDate"))
    ) {
      // Если платеж уже является частью серии, и в paymentData есть recurrencePattern/EndDate,
      // эти поля не должны изменять саму серию через обновление экземпляра.
      // Изменения серии происходят через SeriesEditModal.
      // Поэтому удаляем их из fieldsToUpdate, чтобы не пытаться применить к экземпляру.
      logger.warn(
        `Attempted to change series pattern/endDate for payment instance ${payment.id}. These changes should be made via SeriesEditModal. Ignoring for instance.`
      );
      delete fieldsToUpdate.recurrenceRule;
      delete fieldsToUpdate.recurrenceEndDate;
    }
    if (Object.keys(fieldsToUpdate).length > 0) {
      await payment.update(fieldsToUpdate);
      logger.info(`Payment updated (ID: ${payment.id}, User: ${userId})`);
    } else {
      logger.info(
        `No allowed fields to update for payment (ID: ${payment.id}, User: ${userId})`
      );
    }

    // Check if the due date has passed and update the status accordingly
    // This logic should probably be handled by a separate status update function or cron job
    // but keeping it here for now as it was in the original code.
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set time to midnight for date comparison

    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0); // Set time to midnight for date comparison

    if (dueDate < now && payment.status === "upcoming") {
      await payment.update({ status: "overdue" });
      logger.info(
        `Payment status updated to overdue (ID: ${payment.id}, User: ${userId})`
      );
    } else if (dueDate >= now && payment.status === "overdue") {
      // If due date is now or in the future, and status is overdue, set to upcoming
      await payment.update({ status: "upcoming" });
      logger.info(
        `Payment status updated to upcoming (ID: ${payment.id}, User: ${userId})`
      );
    }

    // Return the updated payment
    // Fetch again to include related data if needed for response
    return await getPaymentById(payment.id, userId); // Use our fetch function
  } catch (error) {
    logger.error(
      `Error updating payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Failed to update payment.");
  }
};

// "Удаление" платежа (логическое, перемещение в архив со статусом 'deleted') (2.2, 2.7)
// При логическом удалении также удаляем прикрепленный файл.

export const deletePayment = async (paymentId: string, userId: string) => {
  logger.info(
    `Attempting to soft-delete payment (ID: ${paymentId}, User: ${userId})`
  );
  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.ne]: "deleted" }, // Cannot delete if already logically deleted
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for soft delete or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found, does not belong to the user, or already deleted
    }

    // Store the original seriesId before updating
    const originalSeriesId = payment.seriesId;
    const originalStatus = payment.status;

    // If a file is attached, delete it
    // If a file is attached, do NOT delete it on logical delete (Option B)
    // The file will be deleted on permanent deletion from the archive.
    // Clear file metadata from the payment record after deletion
    // Note: The actual file remains in the file system until permanent deletion.

    // Update status to 'deleted' and dissociate from series
    await payment.update({
      status: "deleted",
      // completedAt = null? No, if it was completed, status changes to deleted, completedAt remains
    });

    logger.info(
      `Payment soft-deleted (ID: ${payment.id}, User: ${userId}). Dissociated from series ${originalSeriesId}.`
    );

    // Если удаленный платеж был активной частью серии, генерируем следующий
    if (
      originalSeriesId &&
      (originalStatus === "upcoming" || originalStatus === "overdue")
    ) {
      const series = await db.RecurringSeries.findOne({
        where: { id: originalSeriesId, isActive: true },
      });

      if (series) {
        const nextDueDate = calculateNextDueDate(
          series.recurrenceRule,
          new Date(series.startDate)
        );

        if (nextDueDate) {
          const seriesEndDate = series.recurrenceEndDate
            ? new Date(series.recurrenceEndDate)
            : null;
          if (seriesEndDate) {
            seriesEndDate.setHours(0, 0, 0, 0);
          }

          if (!seriesEndDate || nextDueDate <= seriesEndDate) {
            const nextDueDateString = nextDueDate.toISOString().split("T")[0];

            const existingNextPayment = await db.Payment.findOne({
              where: {
                seriesId: series.id,
                dueDate: nextDueDateString,
              },
            });

            if (!existingNextPayment) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const newPaymentStatus =
                new Date(nextDueDateString) < today ? "overdue" : "upcoming";

              await db.Payment.create({
                userId: series.userId,
                categoryId: series.categoryId,
                title: series.title,
                amount: series.amount,
                dueDate: nextDueDateString,
                status: newPaymentStatus,
                seriesId: series.id,
                builtinIconName: series.builtinIconName,
              });
              logger.info(
                `Generated next recurring payment (Series ID: ${series.id}, Due Date: ${nextDueDateString}) after deleting instance ${payment.id}.`
              );
            }
          }
        }
      }
    }

    // If the payment was part of a recurring series, check if the series should be deleted
    if (originalSeriesId) {
      // Check if there are any remaining payments linked to this series
      const remainingCount = await db.Payment.count({
        where: {
          seriesId: originalSeriesId,
          // Consider only non-deleted payments for counting remaining instances
          status: { [Op.ne]: "deleted" },
        },
      });

      if (remainingCount === 0) {
        // If no remaining payments, delete the recurring series
        await db.RecurringSeries.destroy({
          where: { id: originalSeriesId },
        });
        logger.info(
          `Recurring series with ID ${originalSeriesId} deleted as it has no remaining payments.`
        );
      } else {
        logger.info(
          `Recurring series with ID ${originalSeriesId} still has ${remainingCount} remaining payments.`
        );
      }
    }

    return payment; // Return the updated (with deleted status) payment
  } catch (error) {
    logger.error(
      `Error soft-deleting payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Failed to delete payment.");
  }
};

// TODO: В Части 17 реализовать permanentDeletePayment
// Эта функция будет вызываться при перманентном удалении из архива.
// Она должна удалить запись из БД и, если файл еще существует (хотя он должен быть удален при soft-delete), удалить его.
// --- Новая функция: Получить список платежей из архива (2.5) ---
export const getArchivedPayments = async (userId: string, filters: any) => {
  try {
    const where: any = {
      userId: userId,
      status: { [Op.in]: ["completed", "deleted"] }, // Payments with status 'completed' or 'deleted'
    };

    // TODO: Add filtering by categories, date range, search (similar to getFilteredPayments)
    // Status filtering is already in where above, but you can add the option to select only completed OR only deleted
    if (filters.status && ["completed", "deleted"].includes(filters.status)) {
      where.status = filters.status; // Override if a more specific archive status is specified
    }

    // TODO: Add sorting (e.g., by completedAt or createdAt) and pagination
    const order: any = [
      ["completedAt", "DESC"],
      ["createdAt", "DESC"],
    ]; // Default sort: latest completed/deleted first

    const payments = await db.Payment.findAll({
      where,
      order,
      include: [
        {
          // Include category data
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        },
        {
          model: db.RecurringSeries,
          as: "series",
          attributes: [
            "id",
            "title",
            "recurrenceRule",
            "recurrenceEndDate",
            "isActive",
          ],
        },
      ],
      // limit, offset
    });

    logger.info(
      `Fetched ${payments.length} archived payments for user ${userId}`
    );
    return payments;
  } catch (error) {
    logger.error(`Error fetching archived payments for user ${userId}:`, error);
    throw new Error("Failed to fetch archived payments list.");
  }
};

// --- Новая функция: Восстановить платеж из архива (2.5, 2.8) ---
// Status 'completed' or 'deleted' -> 'upcoming' (or 'overdue' if date is in the past)
export const restorePayment = async (
  paymentId: string,
  userId: string,
  options: { reactivateSeries?: boolean } = {}
) => {
  const { reactivateSeries = false } = options;
  const transaction = await db.sequelize.transaction();
  try {
    // Find the payment in the archive, ensure it belongs to the user and has status 'completed' or 'deleted'
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] }, // Only from archive
      },
      transaction,
    });

    if (!payment) {
      await transaction.rollback();
      logger.warn(
        `Payment not found for restore or invalid status (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found, does not belong to the user, or its status does not allow restoration
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Determine the new status: 'upcoming' if due date is in the future, 'overdue' if in the past
    const newStatus = dueDate >= now ? "upcoming" : "overdue";

    // When restoring, reset completedAt (as the payment is active again)
    await payment.update(
      {
        status: newStatus,
        completedAt: null, // Reset completion date
      },
      { transaction }
    );

    // If reactivating the series is requested, find the series and update it
    if (reactivateSeries && payment.seriesId) {
      const series = await db.RecurringSeries.findOne({
        where: { id: payment.seriesId, userId },
        transaction,
      });

      if (series && !series.isActive) {
        await series.update({ isActive: true }, { transaction });
        logger.info(
          `Recurring series ${series.id} reactivated upon restoring payment ${payment.id}.`
        );
      }
    }

    await transaction.commit();

    logger.info(
      `Payment restored from archive (ID: ${payment.id}, User: ${userId}). New status: ${newStatus}`
    );

    return payment; // Return the restored payment
  } catch (error: any) {
    await transaction.rollback();
    logger.error(
      `Error restoring payment ${paymentId} from archive (User: ${userId}):`,
      error
    );
    throw new Error("Failed to restore payment from archive.");
  }
};

// --- New function: Permanent (full) deletion of a payment (2.5, 2.8) ---
// Deletes the record from the DB AND associated files/icons from the FS.
export const permanentDeletePayment = async (
  paymentId: string,
  userId: string
) => {
  logger.info(
    `Attempting to permanently delete payment (ID: ${paymentId}, User: ${userId})`
  );
  try {
    // Find the payment, ensure it belongs to the user
    // Permanent deletion can be allowed ONLY for status 'deleted' or 'completed' (from archive)
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] }, // Allow permanent deletion only from archive
        // If you need to allow permanent deletion from anywhere, remove this condition
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for permanent delete or not in archive (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Payment not found, does not belong to the user, or not in archive
    }

    // !!! Delete associated files and custom icons from the file system !!!
    // Use functions from fileService.
    // deleteFileFromFS(userId, paymentId) without fileName will delete the entire payment folder /uploads/users/[user_id]/payments/[payment_id]/
    // This folder contains both payment files and custom icons.
    try {
      await deleteFileFromFS(userId, paymentId); // Delete the entire payment folder
      logger.info(
        `Deleted files/icons directory for payment ${paymentId} from FS.`
      );
    } catch (fsError: any) {
      // Log the error, but do not interrupt the deletion of the DB record,
      // as deleting the DB record is more important. The FS issue might be temporary.
      logger.error(
        `Error deleting files/icons directory for payment ${paymentId} from FS:`,
        fsError
      );
    }
    // Note: detachIconFromPayment and detachFileFromPayment only delete one specific file/icon.
    // deleteFileFromFS(userId, paymentId) without a file name is a more appropriate way to delete all payment resources.

    // Delete the payment record from the database
    await payment.destroy();

    logger.info(
      `Payment permanently deleted (ID: ${payment.id}, User: ${userId}). Record removed from DB.`
    );
    return true; // Return true on successful deletion
  } catch (error: any) {
    logger.error(
      `Error permanently deleting payment ${paymentId} (User: ${userId}):`,
      error
    );
    throw new Error(error.message || "Failed to permanently delete payment.");
  }
};

// Отметка платежа как выполненного (статус 'completed') (2.2, 2.7)
// Для повторяющихся платежей это отмечает текущий экземпляр и готовит к генерации следующего (логика в Части 15/Крон)
// --- Доработка функции completePayment ---
// После отметки выполнения повторяющегося платежа, нужно создать следующий экземпляр.
export const completePayment = async (
  paymentId: string,
  userId: string,
  completionDate?: string
) => {
  logger.info(
    `Attempting to complete payment (ID: ${paymentId}, User: ${userId}) with date: ${completionDate}`
  );
  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю и имеет статус 'upcoming' или 'overdue'
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["upcoming", "overdue"] }, // Завершить можно только предстоящие или просроченные
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for completion or invalid status (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден, не принадлежит пользователю или уже выполнен/удален
    }

    const originalSeriesId = payment.seriesId; // Сохраняем ID серии до обновления

    // Обновляем статус на 'completed' и устанавливаем дату выполнения
    await payment.update({
      status: "completed",
      completedAt: completionDate
        ? new Date(completionDate)
        : Sequelize.literal("GETDATE()"),
    });
    logger.info(`Payment completed (ID: ${payment.id}, User: ${userId}).`);

    // Начало новой логики для генерации следующего платежа в серии
    if (originalSeriesId) {
      const series = await db.RecurringSeries.findOne({
        where: { id: originalSeriesId },
        // Не проверяем isActive здесь сразу, чтобы обработать деактивацию если нужно
      });

      if (series) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Для сравнения дат

        const completedPaymentDueDate = new Date(payment.dueDate); // Дата выполненного платежа
        completedPaymentDueDate.setHours(0, 0, 0, 0);

        let canGenerateNext = series.isActive; // По умолчанию, генерируем если серия активна

        // Проверяем, не завершилась ли серия с этим выполненным платежом
        if (series.recurrenceEndDate) {
          const seriesEndDate = new Date(series.recurrenceEndDate);
          seriesEndDate.setHours(0, 0, 0, 0); // Нормализуем дату окончания серии

          if (completedPaymentDueDate >= seriesEndDate) {
            // Если выполненный платеж был на дату окончания серии или позже
            canGenerateNext = false;
            if (series.isActive) {
              // Деактивируем серию, если она еще активна
              await series.update({ isActive: false });
              logger.info(
                `Recurring series ${series.id} deactivated as completed payment ${payment.id} was on/after recurrenceEndDate.`
              );
            }
          }
        }

        if (canGenerateNext) {
          // Рассчитываем дату следующего платежа
          const nextDueDate = calculateNextDueDate(
            series.recurrenceRule || "", // Передаем recurrenceRule
            new Date(series.startDate) // Передаем startDate серии
          );

          // Еще одна проверка на дату окончания серии для *следующего* вычисленного платежа
          if (series.recurrenceEndDate) {
            const seriesEndDate = new Date(series.recurrenceEndDate);
            seriesEndDate.setHours(0, 0, 0, 0);
            if (nextDueDate && new Date(nextDueDate) > seriesEndDate) {
              // Следующий платеж выходит за дату окончания серии
              canGenerateNext = false;
              if (series.isActive) {
                // Деактивируем, если активна
                await series.update({ isActive: false });
                logger.info(
                  `Recurring series ${series.id} deactivated as next payment date after completing ${payment.id} would exceed recurrenceEndDate.`
                );
              }
            }
          }

          if (canGenerateNext && nextDueDate) {
            const nextDueDateString = nextDueDate.toISOString().split("T")[0];

            // Проверяем, существует ли уже следующий платеж в серии
            const existingNextPayment = await db.Payment.findOne({
              where: {
                seriesId: series.id,
                dueDate: nextDueDateString,
              },
            });

            // Создаем только если его еще нет
            if (!existingNextPayment) {
              const newPaymentStatus =
                new Date(nextDueDateString) < today ? "overdue" : "upcoming";
              // Создаем новый платеж
              await db.Payment.create({
                userId: series.userId,
                categoryId: series.categoryId,
                title: series.title, // Используем данные из серии
                amount: series.amount, // Используем данные из серии
                dueDate: nextDueDateString,
                status: newPaymentStatus,
                seriesId: series.id,
                // Копируем детали иконки из серии
                builtinIconName: series.builtinIconName,
              });
              logger.info(
                `Generated next recurring payment (Series ID: ${series.id}, Due Date: ${nextDueDateString}) by completePayment for ${payment.id}.`
              );
            } else {
              logger.info(
                `Next payment for series ${series.id} on ${nextDueDateString} already exists. Skipping generation.`
              );
            }
          }
        }
      } else {
        logger.warn(
          `Series ${originalSeriesId} not found for completed payment ${payment.id}. Cannot generate next.`
        );
      }
    }
    // Конец новой логики для генерации следующего платежа

    // Старая логика удаления серии на основе remainingCount удалена.
    // Деактивация серии теперь обрабатывается выше на основе recurrenceEndDate.

    return payment; // Возвращаем обновленный (выполненный) платеж
  } catch (error: any) {
    logger.error(
      `Error completing payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error(error.message || "Failed to mark payment as completed.");
  }
};

// --- Генерация следующих экземпляров для всех активных серий (cron) ---
// Функция должна запускаться ежедневно.
// Алгоритм:
// 1. Находим все активные серии, у которых не истек срок (recurrenceEndDate ≥ сегодня или отсутствует).
// 2. Для каждой такой серии проверяем: есть ли платеж с dueDate > сегодня.
// 3. Если такого платежа нет, создаем следующий экземпляр, начиная от startDate или последнего платежа.
// Таким образом, всегда гарантируется, что у активной серии есть хотя бы один предстоящий платеж.

export const generateNextRecurrentPayments = async () => {
  logger.info("Running generateNextRecurrentPayments cron job...");
  let createdCount = 0;
  let checkedSeriesCount = 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight for date comparison

    // Find all active recurring series that have not ended
    const activeSeries = await db.RecurringSeries.findAll({
      where: {
        isActive: true,
        recurrenceEndDate: {
          [Op.or]: [
            { [Op.gte]: today }, // End date is in the future or today
            { [Op.eq]: null }, // Or no end date is specified
          ],
        },
      },
    });

    checkedSeriesCount = activeSeries.length;
    logger.info(
      `Found ${checkedSeriesCount} active recurring series to check.`
    );

    for (const series of activeSeries) {
      // Find the latest payment instance for this series
      const lastPayment = await db.Payment.findOne({
        where: {
          seriesId: series.id,
          dueDate: { [Op.gt]: today },
        },
      });

      if (lastPayment) {
        continue;
      }

      logger.info(
        `No payments found for series ${series.id}. Starting generation from series start date: ${series.startDate}.`
      );

      const seriesEndDate = series.recurrenceEndDate
        ? new Date(series.recurrenceEndDate)
        : null;

      // Loop to generate all missing payments up to today
      const nextDueDate = calculateNextDueDate(
        series.recurrenceRule,
        new Date(series.startDate),
        seriesEndDate
      );

      if (!nextDueDate) {
        logger.info(
          `No next due date found for series ${series.id}. Skipping.`
        );
        await series.update({ isActive: false });
        logger.info(
          `Deactivating series ${series.id} as it reached its end date.`
        );
        continue;
      }

      const nextDueDateString = nextDueDate.toISOString().split("T")[0];

      await db.Payment.create({
        userId: series.userId,
        categoryId: series.categoryId,
        title: series.title,
        amount: series.amount,
        dueDate: nextDueDateString,
        status: "upcoming",
        seriesId: series.id,
        builtinIconName: series.builtinIconName,
      });
      logger.info(
        `Generated new recurring payment for series ${series.id} on ${nextDueDateString}`
      );
      createdCount++;
    }

    logger.info(
      `generateNextRecurrentPayments job finished. Created: ${createdCount} payments for ${checkedSeriesCount} series.`
    );
    return { createdCount, checkedSeriesCount };
  } catch (error) {
    logger.error("Error in generateNextRecurrentPayments job:", error);
    throw error; // Пробрасываем ошибку для executeWithTaskLock
  }
};

// TODO: В Части 17 реализовать getArchivedPayments, restorePayment, permanentDeletePayment (они работают со статусами 'completed' и 'deleted')
// TODO: В Части 11/13 реализовать логику работы с файлами/иконками

// --- Логика автоматической смены статуса upcoming -> overdue (выполняется фоновой задачей) ---
// Эта функция не вызывается напрямую из маршрутов API, только из cron job.
export const updateOverdueStatuses = async () => {
  logger.info("Running job: updateOverdueStatuses");
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Сравниваем только даты

    // Находим все платежи со статусом 'upcoming', у которых срок оплаты наступил или прошел
    const [affectedCount] = await db.Payment.update(
      { status: "overdue" },
      {
        where: {
          status: "upcoming", // Только предстоящие
          // Используем 'lt' (less than), чтобы платежи с сегодняшней датой не становились просроченными.
          // Платеж становится просроченным только на следующий день после dueDate.
          dueDate: { [Op.lt]: now }, // У которых срок оплаты < сегодня
        },
      }
    );

    logger.info(`Updated ${affectedCount} payments to status 'overdue'.`);
    return affectedCount;
  } catch (error) {
    logger.error("Error in updateOverdueStatuses cron job:", error);
    throw error; // Пробрасываем ошибку для логирования в cron runner
  }
};

// TODO: В Части 17 реализовать getArchivedPayments, restorePayment, permanentDeletePayment (они работают со статусами 'completed' и 'deleted')
// TODO: В Части 15 реализовать generateNextRecurrentPayments (также связана со статусом 'completed' и isRecurrent)

// --- Новая функция: Получить статистику для дашборда за текущий месяц (2.3, 2.5) ---
export const getDashboardStats = async (
  userId: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    const now = new Date();
    // Определяем начало и конец периода, используя UTC, чтобы избежать смещения часовых поясов.
    const periodStart = startDate
      ? new Date(startDate + "T00:00:00.000Z") // UTC
      : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const periodEnd = endDate
      ? new Date(endDate + "T23:59:59.999Z") // UTC
      : new Date(
          Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        );

    // Один запрос для получения всех платежей, релевантных для статистики
    const relevantPayments: (PaymentInstance & {
      category?: CategoryInstance;
    })[] = await db.Payment.findAll({
      where: {
        userId: userId,
        [Op.or]: [
          {
            // Платежи, у которых СРОК ОПЛАТЫ в периоде
            dueDate: {
              [Op.between]: [
                periodStart.toISOString(),
                periodEnd.toISOString(),
              ],
            },
            status: {
              [Op.notIn]: ["deleted", "completed"],
            },
          },
          {
            // ИЛИ платежи, которые были ЗАВЕРШЕНЫ в периоде
            status: "completed",
            completedAt: {
              [Op.between]: [
                periodStart.toISOString(),
                periodEnd.toISOString(),
              ],
            },
          },
        ],
      },
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        },
      ],
      attributes: [
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "categoryId",
        "completedAt",
      ],
    });

    let totalUpcomingAmount = 0;
    let totalCompletedAmount = 0;
    const categoriesStats: {
      [key: string]: { id?: string; name: string; amount: number };
    } = {};
    const dailyStats: { [key: string]: { date: string; amount: number } } = {};

    for (const payment of relevantPayments) {
      const amount = parseFloat(payment.amount.toString());
      const paymentDueDate = new Date(payment.dueDate + "T00:00:00.000Z");

      // Рассчитываем "Предстоящие" - это upcoming и overdue с dueDate в периоде
      if (
        (payment.status === "upcoming" || payment.status === "overdue") &&
        paymentDueDate >= periodStart &&
        paymentDueDate <= periodEnd
      ) {
        totalUpcomingAmount += amount;
      }

      // Рассчитываем "Выполненные" - это completed с completedAt в периоде
      if (payment.status === "completed" && payment.completedAt) {
        const completedDate = new Date(payment.completedAt.toString());
        if (completedDate >= periodStart && completedDate <= periodEnd) {
          totalCompletedAmount += amount;
        }
      }

      // Распределение по категориям (для всех платежей в выборке)
      const categoryId = payment.category?.id || "no-category";
      const categoryName = payment.category?.name || "Без категории";
      if (!categoriesStats[categoryId]) {
        categoriesStats[categoryId] = {
          id: categoryId !== "no-category" ? categoryId : undefined,
          name: categoryName,
          amount: 0,
        };
      }
      // Суммируем в категорию, только если платеж не "удален"
      if (payment.status !== "deleted") {
        categoriesStats[categoryId].amount += amount;
      }

      // Статистика по дням (для всех платежей в выборке)
      // Используем completedAt для выполненных платежей и dueDate для остальных
      const dateKey =
        payment.status === "completed" && payment.completedAt
          ? new Date(payment.completedAt as Date).toISOString().split("T")[0]
          : payment.dueDate;

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { date: dateKey, amount: 0 };
      }
      if (payment.status !== "deleted") {
        dailyStats[dateKey].amount += amount;
      }
    }

    const categoriesDistribution = Object.values(categoriesStats).filter(
      (c) => c.amount > 0
    );
    const dailyPaymentLoad = Object.values(dailyStats).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      month: `${periodStart.getFullYear()}-${(periodStart.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`,
      totalUpcomingAmount: totalUpcomingAmount.toFixed(2),
      totalCompletedAmount: totalCompletedAmount.toFixed(2),
      categoriesDistribution,
      dailyPaymentLoad,
      allPaymentsInMonth: relevantPayments, // Возвращаем для фильтрации на фронте
    };
  } catch (error) {
    logger.error(
      `Error calculating dashboard stats for user ${userId}:`,
      error
    );
    throw new Error("Не удалось рассчитать статистику.");
  }
};

// --- Фоновая задача: Очистка "осиротевших" серий ---
// Эта функция находит и удаляет записи о сериях, на которые не ссылается ни один платеж.
export const cleanupOrphanedSeries = async () => {
  logger.info("Running job: cleanupOrphanedSeries");
  try {
    // Находим все seriesId, которые используются в таблице платежей
    const usedSeriesIdsResult = await db.Payment.findAll({
      attributes: [
        [db.sequelize.fn("DISTINCT", db.sequelize.col("seriesId")), "seriesId"],
      ],
      where: {
        seriesId: {
          [Op.ne]: null,
        },
      },
      raw: true,
    });

    const usedSeriesIds = usedSeriesIdsResult.map((item: any) => item.seriesId);

    // Удаляем все серии, ID которых не находится в списке используемых
    const deletedCount = await db.RecurringSeries.destroy({
      where: {
        id: {
          [Op.notIn]: usedSeriesIds,
        },
      },
    });

    logger.info(`Cleaned up ${deletedCount} orphaned recurring series.`);
    return deletedCount;
  } catch (error) {
    logger.error("Error in cleanupOrphanedSeries cron job:", error);
    throw error; // Пробрасываем ошибку для логирования в cron runner
  }
};
