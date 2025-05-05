import db from "../models"; // Доступ к моделям
import { Op, Sequelize } from "sequelize"; // Для операторов запросов
import logger from "../config/logger";
import path from "path"; // Import path module
import { config } from "../config/config"; // Import config
import { deleteFileFromFS, detachIconFromPayment } from "./fileService"; // Переиспользуем удаление из ФС и открепление иконки

// import { Payment } from '../models/Payment'; // Импортируем тип Payment (если созданы типы)

// Пример интерфейса для данных платежа (опционально, для строгой типизации)
interface PaymentData {
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  categoryId?: string; // TODO: UUID
  isRecurrent?: boolean;
  recurrencePattern?: "daily" | "weekly" | "monthly" | "yearly";
  recurrenceEndDate?: string; // YYYY-MM-DD
  // Поля для файлов и иконок пока не обрабатываются здесь
  filePath?: string;
  fileName?: string;
  iconPath?: string;
  iconType?: "builtin" | "custom";
  builtinIconName?: string;
  // Опция для создания сразу завершенного платежа (используется при создании)
  createAsCompleted?: boolean;
}

// --- Вспомогательная функция: рассчитать следующую дату платежа ---
// Принимает дату (объект Date или строка YYYY-MM-DD) и шаблон повторения
const calculateNextDueDate = (
  currentDueDate: Date | string,
  pattern: "daily" | "weekly" | "monthly" | "yearly"
): Date => {
  const date =
    typeof currentDueDate === "string"
      ? new Date(currentDueDate)
      : new Date(currentDueDate);
  // Устанавливаем время на полночь, чтобы избежать проблем с часовыми поясами при расчете даты
  date.setHours(0, 0, 0, 0);

  switch (pattern) {
    case "daily":
      date.setDate(date.getDate() + 1); // Добавляем 1 день
      break;
    case "weekly":
      date.setDate(date.getDate() + 7); // Добавляем 7 дней
      break;
    case "monthly":
      // Добавляем 1 месяц. Важно: Date.prototype.setMonth() корректно обрабатывает конец месяца
      // Например, 31 января + 1 месяц = 2 марта (т.к. в феврале 28/29 дней)
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1); // Добавляем 1 год
      break;
    default:
      throw new Error(`Неизвестный шаблон повторения: ${pattern}`);
  }

  // Важно: Вернуть Date объект, а не строку, если функция вызывается внутри Node.js
  // Если нужно вернуть строку для БД/API, форматировать в YYYY-MM-DD
  // Например: return date.toISOString().split('T')[0];
  return date; // Возвращаем объект Date
};

// --- Функции для горизонтальной ленты и полного списка ---

// Получить активные предстоящие платежи для горизонтальной ленты (2.2)
// Включает upcoming и overdue
export const getUpcomingPayments = async (userId: string) => {
  try {
    const now = new Date();
    // Устанавливаем время на полночь для сравнения только дат
    now.setHours(0, 0, 0, 0);

    // Получаем платежи пользователя со статусом 'upcoming' ИЛИ 'overdue'
    // Сортируем по дате срока оплаты по возрастанию
    // Calculate the date 10 days from now
    const tenDaysLater = new Date(now);
    tenDaysLater.setDate(now.getDate() + 10);
    // Set time to end of the day for inclusive comparison
    tenDaysLater.setHours(23, 59, 59, 999);

    const payments = await db.Payment.findAll({
      where: {
        userId: userId,
        status: {
          [Op.in]: ["upcoming", "overdue"], // Включаем предстоящие и просроченные
        },
        dueDate: {
          // Filter by due date within the next 10 days
          [Op.lte]: tenDaysLater,
        },
      },
      order: [["dueDate", "ASC"]],
      // TODO: include: [{ model: db.Category, as: 'category' }] // Включить категорию после ее создания
    });

    logger.info(
      `Fetched ${payments.length} upcoming/overdue payments for user ${userId}`
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
        { model: db.Category, as: "category", attributes: ["id", "name"] },
      ], // Включить категорию
      // TODO: limit, offset для пагинации
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
  // TODO: Добавить более строгую валидацию paymentData (например, с express-validator или вручную)
  // Проверка обязательных полей: title, amount, dueDate
  if (
    !paymentData.title ||
    paymentData.amount == null ||
    !paymentData.dueDate
  ) {
    throw new Error(
      "Отсутствуют обязательные поля: название, сумма или дата срока."
    );
  }
  // Проверка формата даты, суммы и т.д.

  try {
    // При создании повторяющегося платежа, первый экземпляр создается как обычный
    // и у него указывается parentId = null.
    // Последующие экземпляры будут иметь parentId, ссылающийся на этот первый.
    // Либо можно создать отдельную запись для "родительского шаблона" (скрытую?)
    // и генерировать экземпляры от нее.
    // Давайте упростим: первый созданный платеж С isRecurrent=true является "родителем".
    // Генерируемые экземпляры будут иметь parentId = id этого первого платежа.

    const payment = await db.Payment.create({
      userId: userId,
      categoryId: paymentData.categoryId || null,
      title: paymentData.title,
      amount: paymentData.amount,
      dueDate: paymentData.dueDate,
      isRecurrent: paymentData.isRecurrent || false, // Является ли этот экземпляр повторяющимся (для первого экземпляра и всех последующих)
      recurrencePattern: paymentData.isRecurrent
        ? paymentData.recurrencePattern
        : null, // Шаблон только у первого экземпляра (родителя)?
      // Или у всех экземпляров, чтобы знать их тип?
      // Давайте хранить шаблон и дату окончания У ВСЕХ экземпляров серии,
      // это может упростить логику фильтрации/отображения.
      // Если parentId не null, то isRecurrent должен быть true.
      // Если parentId null и isRecurrent=true, то это первый экземпляр.

      recurrenceEndDate: paymentData.isRecurrent
        ? paymentData.recurrenceEndDate
        : null,
      // parentId будет null при создании через форму (для разовых и первых повторяющихся)
      parentId: null, // Указываем null при создании через форму

      status: paymentData.createAsCompleted ? "completed" : "upcoming",
      completedAt: paymentData.createAsCompleted
        ? Sequelize.literal("GETDATE()")
        : null,
      // filePath, fileName, iconPath, iconType, builtinIconName
    });

    // Если это первый экземпляр повторяющейся серии, parentId должен ссылаться на самого себя.
    // Или лучше создать отдельную таблицу RecurringSeries?
    // Или просто parentId у первого = null, а у всех генерируемых parentId = id первого.
    // Давайте так: parentId = null для разовых и ПЕРВЫХ в серии. Для ГЕНЕРИРУЕМЫХ экземпляров parentId = id первого.
    // Это требует обновления только что созданной записи, если она первая повторяющаяся.
    if (payment.isRecurrent && payment.parentId === null) {
      await payment.update({ parentId: payment.id }); // Первый в серии ссылается на себя
    }

    logger.info(
      `Payment created (ID: ${payment.id}, User: ${userId}, Status: ${payment.status}, Recurrent: ${payment.isRecurrent})`
    );
    // Возвращаем платеж с данными категории после создания
    return await getPaymentById(payment.id, userId);
  } catch (error: any) {
    /* ... обработка ошибок ... */ throw new Error(
      error.message || "Не удалось создать платеж."
    );
  }
};

// Получение деталей платежа (2.2)
export const getPaymentById = async (paymentId: string, userId: string) => {
  try {
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Обязательная проверка прав собственности
      },
      attributes: [
        // Explicitly select fields, including file fields
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "isRecurrent",
        "createdAt",
        "updatedAt",
        "completedAt",
        "recurrencePattern",
        "recurrenceEndDate",
        "filePath",
        "fileName", // Include file fields
        "iconPath",
        "iconType",
        "builtinIconName",
      ],
      include: [
        { model: db.Category, as: "category", attributes: ["id", "name"] },
      ], // Include category
    });

    if (!payment) {
      logger.warn(
        `Payment not found or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден или не принадлежит пользователю
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
  // TODO: Добавить валидацию paymentData
  if (Object.keys(paymentData).length === 0) {
    throw new Error("Нет данных для обновления.");
  }
  // Проверка, что не пытаемся обновить поля, которые должны меняться через специфические actions (status, completedAt?)
  // Например, не позволяем напрямую менять status на 'completed' или 'deleted' через этот эндпоинт

  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю
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
      return null; // Платеж не найден или не принадлежит пользователю
    }

    // Обновляем только предоставленные поля, кроме ID и userId
    const fieldsToUpdate: any = {};
    const allowedFields = [
      "title",
      "amount",
      "dueDate",
      "categoryId",
      "isRecurrent",
      "recurrencePattern",
      "recurrenceEndDate",
      "filePath",
      "fileName",
      "iconPath",
      "iconType",
      "builtinIconName",
      "parentId",
    ]; // Добавить поля файла/иконки позже

    allowedFields.forEach((field) => {
      if (paymentData.hasOwnProperty(field)) {
        fieldsToUpdate[field] = (paymentData as any)[field];
      }
    });

    // Специальная обработка для рекуррентности: pattern и endDate зависят от isRecurrent
    if (paymentData.hasOwnProperty("isRecurrent")) {
      if (!paymentData.isRecurrent) {
        fieldsToUpdate.recurrencePattern = null;
        fieldsToUpdate.recurrenceEndDate = null;
        fieldsToUpdate.parentId = null; // Сбрасываем parentId если платеж перестает быть повторяющимся
      }
      // Если isRecurrent true, pattern и endDate должны быть предоставлены в paymentData
      // Валидацию этих полей нужно добавить
    } else if (payment.isRecurrent) {
      // Если isRecurrent не меняется, но платеж был рекуррентным,
      // убедимся, что pattern и endDate не сброшены, если их не передали явно
      if (!paymentData.hasOwnProperty("recurrencePattern"))
        fieldsToUpdate.recurrencePattern = payment.recurrencePattern;
      if (!paymentData.hasOwnProperty("recurrenceEndDate"))
        fieldsToUpdate.recurrenceEndDate = payment.recurrenceEndDate;
    }

    await payment.update(fieldsToUpdate);

    // Check if the due date has passed and update the status accordingly
    if (
      new Date(payment.dueDate) < new Date() &&
      payment.status === "upcoming"
    ) {
      await payment.update({ status: "overdue" });
      logger.info(
        `Payment status updated to overdue (ID: ${payment.id}, User: ${userId})`
      );
    }

    const nowUTC = new Date();
    nowUTC.setUTCHours(0, 0, 0, 0); // Устанавливаем время на 0:00:00 UTC

    if (new Date(payment.dueDate) >= nowUTC) {
      await payment.update({ status: "upcoming" });
      logger.info(
        `Payment status updated to upcoming (ID: ${payment.id}, User: ${userId})`
      );
    }

    logger.info(`Payment updated (ID: ${payment.id}, User: ${userId})`);
    // Возвращаем обновленный платеж
    // Можно сделать еще один findOne для включения связанных данных, если update не возвращает их
    return await getPaymentById(payment.id, userId); // Используем нашу функцию получения
  } catch (error) {
    logger.error(
      `Error updating payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Не удалось обновить платеж.");
  }
};

// "Удаление" платежа (логическое, перемещение в архив со статусом 'deleted') (2.2, 2.7)
// При логическом удалении также удаляем прикрепленный файл.

export const deletePayment = async (paymentId: string, userId: string) => {
  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.ne]: "deleted" }, // Нельзя удалить уже удаленный (логически)
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for soft delete or no access (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден, не принадлежит пользователю или уже удален
    }

    // If a file is attached, delete it
    if (payment.fileName) {
      await deleteFileFromFS(userId, paymentId, payment.fileName);
      // Удаляем файл из файловой системы
      // Clear file metadata from the payment record after deletion
      payment.filePath = null;
      payment.fileName = null;
      payment.fileMimeType = null;
      payment.fileSize = null;
      payment.uploadedAt = null;
    }

    await payment.update({
      status: "deleted",
      // completedAt = null? Нет, если он был completed, статус меняется на deleted, completedAt остается
    });

    logger.info(`Payment soft-deleted (ID: ${payment.id}, User: ${userId})`);
    return payment; // Возвращаем обновленный (со статусом deleted) платеж
  } catch (error) {
    logger.error(
      `Error soft-deleting payment (ID: ${paymentId}, User: ${userId}):`,
      error
    );
    throw new Error("Не удалось удалить платеж.");
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
      status: { [Op.in]: ["completed", "deleted"] }, // Платежи со статусом 'completed' или 'deleted'
    };

    // TODO: Добавить фильтрацию по категориям, диапазону дат, поиску (аналогично getFilteredPayments)
    // Фильтрация по статусу уже в where выше, но можно добавить возможность выбрать только completed ИЛИ только deleted
    if (filters.status && ["completed", "deleted"].includes(filters.status)) {
      where.status = filters.status; // Переопределяем, если указан более специфичный статус архива
    }

    // TODO: Добавить сортировку (например, по completedAt или createdAt) и пагинацию
    const order: any = [
      ["completedAt", "DESC"],
      ["createdAt", "DESC"],
    ]; // Сортировка по умолчанию: последние выполненные/удаленные первыми

    const payments = await db.Payment.findAll({
      where,
      order,
      include: [
        {
          // Включаем данные категории
          model: db.Category,
          as: "category",
          attributes: ["id", "name"],
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
    throw new Error("Не удалось получить список платежей из архива.");
  }
};

// --- Новая функция: Восстановить платеж из архива (2.5, 2.8) ---
// Статус 'completed' или 'deleted' -> 'upcoming' (или 'overdue' если дата в прошлом)
export const restorePayment = async (paymentId: string, userId: string) => {
  try {
    // Находим платеж в архиве, убеждаемся, что он принадлежит пользователю и имеет статус 'completed' или 'deleted'
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] }, // Только из архива
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for restore or invalid status (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден, не принадлежит пользователю или его статус не позволяет восстановление
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Определяем новый статус: 'upcoming' если срок оплаты в будущем, 'overdue' если в прошлом
    const newStatus = dueDate >= now ? "upcoming" : "overdue";

    // При восстановлении сбрасываем completedAt (т.к. платеж снова активен)
    await payment.update({
      status: newStatus,
      completedAt: null, // Сбрасываем дату выполнения
    });

    logger.info(
      `Payment restored from archive (ID: ${payment.id}, User: ${userId}). New status: ${newStatus}`
    );

    // TODO: Если это повторяющийся платеж, и он был удален (deleted), нужно убедиться,
    // что его серия "ожила" и Cron будет генерировать новые экземпляры.
    // Текущая логика generateNextRecurrentPayments должна подхватить серии,
    // у которых нет активных upcoming/overdue экземпляров. Восстановление
    // одного экземпляра в статус upcoming должно "активировать" серию.
    // Если же удален был "родительский" платеж (parent = null + isRecurrent=true),
    // восстановление его в upcoming сделает его снова активным родителем.

    return payment; // Возвращаем восстановленный платеж
  } catch (error: any) {
    logger.error(
      `Error restoring payment ${paymentId} from archive (User: ${userId}):`,
      error
    );
    throw new Error("Не удалось восстановить платеж из архива.");
  }
};

// --- Новая функция: Полное (перманентное) удаление платежа (2.5, 2.8) ---
// Удаляет запись из БД И связанные файлы/иконки из ФС.
export const permanentDeletePayment = async (
  paymentId: string,
  userId: string
) => {
  try {
    // Находим платеж, убеждаемся, что он принадлежит пользователю
    // Можно разрешить перманентное удаление ТОЛЬКО для статуса 'deleted' или 'completed' (из архива)
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] }, // Разрешаем перманентное удаление только из архива
        // Если нужно разрешить перманентное удаление из любого места, уберите это условие
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found for permanent delete or not in archive (ID: ${paymentId}, User: ${userId})`
      );
      return null; // Платеж не найден, не принадлежит пользователю или не в архиве
    }

    // !!! Удаляем связанные файлы и пользовательские иконки из файловой системы !!!
    // Используем функции из fileService.
    // deleteFileFromFS(userId, paymentId) без fileName удалит всю папку платежа /uploads/users/[user_id]/payments/[payment_id]/
    // Эта папка содержит как файлы платежей, так и пользовательские иконки.
    try {
      await deleteFileFromFS(userId, paymentId); // Удаляем всю папку платежа
      logger.info(
        `Deleted files/icons directory for payment ${paymentId} from FS.`
      );
    } catch (fsError: any) {
      // Логируем ошибку, но не прерываем удаление записи из БД,
      // т.к. запись в БД важнее удалить. Проблема с ФС может быть временной.
      logger.error(
        `Error deleting files/icons directory for payment ${paymentId} from FS:`,
        fsError
      );
    }
    // Примечание: detachIconFromPayment и detachFileFromPayment удаляют только один конкретный файл/иконку.
    // deleteFileFromFS(userId, paymentId) без имени файла - более подходящий способ удалить все ресурсы платежа.

    // TODO: Если этот платеж является "родительским" для повторяющейся серии (parentId = id ИЛИ parentId=null + isRecurrent=true)
    // нужно решить, что делать с "потомками" (экземплярами серии).
    // Варианты:
    // 1. Удалить всю серию (все экземпляры с этим parentId). require: CASCADE на parentId или ручное удаление.
    // 2. Оставить потомков, но сбросить их parentId в NULL (они станут разовыми). require: SET NULL на parentId (уже сделано).
    // ТЗ не уточняет. Вариант 2 (SET NULL) кажется более безопасным по умолчанию.
    // Если нужно удалить всю серию, придется найти всех потомков и удалить их тоже:
    // const instancesToDelete = await db.Payment.findAll({ where: { parentId: payment.parentId || payment.id } });
    // for (const instance of instancesToDelete) { await instance.destroy(); } // Удаляем потомков
    // await payment.destroy(); // Затем удаляем самого родителя
    // При удалении потомков тоже могут быть файлы/иконки, их тоже нужно удалить.
    // Это усложняет логику удаления папок ФС. Возможно, лучше удалять файлы/иконки перед удалением каждой записи.

    // Давайте придерживаться простого варианта 2 (SET NULL) для потомков
    // И удалять файлы/иконки только для удаляемой записи (что происходит при удалении записи, если настроен CASCADE на ФС? Нет такого в ФС).
    // Удаление папки `deleteFileFromFS(userId, paymentId)` удалит все файлы/иконки в ней, относящиеся к этому paymentId.
    // Это работает, даже если потомки останутся (у них будут свои paymentId, если они не хранились в той же папке).
    // Наша структура ФС: /uploads/users/[user_id]/payments/[payment_id]/[filename/iconname]
    // Значит, удаление папки paymentId удаляет только файлы/иконки, связанные с этим конкретным paymentId.
    // Это соответствует SET NULL для parentId.

    // Удаляем запись платежа из базы данных
    await payment.destroy();

    logger.info(
      `Payment permanently deleted (ID: ${payment.id}, User: ${userId}). Record removed from DB.`
    );
    return true; // Возвращаем true при успешном удалении
  } catch (error: any) {
    logger.error(
      `Error permanently deleting payment ${paymentId} (User: ${userId}):`,
      error
    );
    throw new Error(error.message || "Не удалось полностью удалить платеж.");
  }
};

// Отметка платежа как выполненного (статус 'completed') (2.2, 2.7)
// Для повторяющихся платежей это отмечает текущий экземпляр и готовит к генерации следующего (логика в Части 15/Крон)
// --- Доработка функции completePayment ---
// После отметки выполнения повторяющегося платежа, нужно создать следующий экземпляр.
export const completePayment = async (paymentId: string, userId: string) => {
  try {
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        status: { [Op.notIn]: ["completed", "deleted"] },
      },
      // Включаем родительский платеж, чтобы получить шаблон повторения и дату окончания серии
      // TODO: Remove this include if pattern and endDate are stored on all instances
      // include: [{
      //     model: db.Payment,
      //     as: 'parent', // Ассоциация parent (нужно добавить в модель Payment belongsTo parent)
      //     required: false, // Не требует наличия родителя (для разовых)
      //     attributes: ['id', 'recurrencePattern', 'recurrenceEndDate'] // Получаем данные шаблона из родителя
      // }]
    });

    if (!payment) {
      logger.warn(
        `Payment not found for completion or invalid status (ID: ${paymentId}, User: ${userId})`
      );
      return null;
    }

    // Проверяем, является ли этот платеж повторяющимся (isRecurrent=true)
    // и есть ли у него шаблон повторения (у родителя, если parentId не null)
    // Или просто проверяем isRecurrent и pattern у самого платежа (если храним их у всех)
    // Давайте хранить pattern и endDate у всех экземпляров серии.
    const isRecurrentSeries = payment.isRecurrent && payment.recurrencePattern;

    await payment.update({
      status: "completed",
      completedAt: Sequelize.literal("GETDATE()"),
    });

    logger.info(
      `Payment marked as completed (ID: ${payment.id}, User: ${userId})`
    );

    // !!! Если это повторяющийся платеж, инициируем создание следующего экземпляра
    if (isRecurrentSeries) {
      // Логика создания следующего экземпляра
      try {
        const nextDueDate = calculateNextDueDate(
          payment.dueDate,
          payment.recurrencePattern!
        ); // Рассчитать следующую дату

        // Проверить, не превышает ли следующая дата дату окончания серии (recurrenceEndDate)
        if (
          payment.recurrenceEndDate &&
          new Date(nextDueDate) > new Date(payment.recurrenceEndDate)
        ) {
          logger.info(
            `Recurring series for payment ${payment.id} ends. Next due date ${
              nextDueDate.toISOString().split("T")[0]
            } exceeds end date ${
              payment.recurrenceEndDate
            }. No new instance created.`
          );
          // Серия закончилась, новый экземпляр не создаем
        } else {
          // Проверяем, существует ли уже платеж с такой следующей датой для этой серии (избегаем дубликатов)
          // Ищем платеж с тем же parentId (или ID родителя, если текущий платеж не первый в серии)
          // и той же dueDate.
          const parentIdForNext = payment.parentId || payment.id; // Если parentId null, значит, текущий - родительский

          const existingNextInstance = await db.Payment.findOne({
            where: {
              userId: userId, // Важно: проверка прав
              parentId: parentIdForNext, // Ссылка на родителя серии
              dueDate: nextDueDate.toISOString().split("T")[0], // Дата следующего платежа
              // Опционально: статус не 'deleted' или 'completed' для уверенности?
              // status: { [Op.notIn]: ['completed', 'deleted'] }
            },
          });

          if (existingNextInstance) {
            logger.warn(
              `Next instance for payment series ${parentIdForNext} with due date ${
                nextDueDate.toISOString().split("T")[0]
              } already exists (ID: ${
                existingNextInstance.id
              }). Skipping creation.`
            );
          } else {
            // Создаем новый экземпляр платежа
            const nextPayment = await db.Payment.create({
              userId: userId,
              categoryId: payment.categoryId, // Сохраняем ту же категорию
              title: payment.title, // Сохраняем то же название
              amount: payment.amount, // Сохраняем ту же сумму
              dueDate: nextDueDate.toISOString().split("T")[0], // Следующая дата
              isRecurrent: true, // Это повторяющийся экземпляр
              recurrencePattern: payment.recurrencePattern, // Сохраняем шаблон
              recurrenceEndDate: payment.recurrenceEndDate, // Сохраняем дату окончания серии
              parentId: parentIdForNext, // Ссылка на родительский платеж
              status: "upcoming", // Всегда 'upcoming' при создании
              completedAt: null, // Не выполнен еще
              // Файлы и иконки НЕ копируются на следующий экземпляр автоматически по ТЗ.
              // Пользователь должен прикрепить новые, если нужно.
              filePath: null,
              fileName: null,
              iconPath: null,
              iconType: null,
              builtinIconName: null,
            });
            logger.info(
              `Next recurrent payment instance created (ID: ${nextPayment.id}, Series Parent: ${parentIdForNext})`
            );

            // TODO: Сгенерировать уведомление для следующего платежа, если подходит по сроку (Часть 20+)
          }
        }
      } catch (calcError: any) {
        logger.error(
          `Error calculating next recurrent date or creating instance for payment ${payment.id}:`,
          calcError
        );
        // Не выбрасываем ошибку, чтобы не прерывать выполнение completePayment,
        // но логируем проблему с генерацией следующего экземпляра.
      }
    }

    return payment; // Возвращаем выполненный платеж
  } catch (error: any) {
    /* ... обработка ошибок ... */ throw new Error(
      error.message || "Не удалось отметить платеж как выполненный."
    );
  }
};

// --- Новая функция: генерация следующих экземпляров для всех подходящих повторяющихся платежей (для Cron) ---
// Эта функция должна запускаться ежедневно.
// Она должна найти "родительские" повторяющиеся платежи (parentId === id ИЛИ parentId === null + isRecurrent=true),
// у которых последний сгенерированный экземпляр выполнен или просрочен, и создать следующий.
// Или, более просто: найти *последний* экземпляр каждой повторяющейся серии,
// который еще не был выполнен/удален, и если его срок оплаты в прошлом, рассчитать и создать следующий.
// Или: найти все повторяющиеся платежи (isRecurrent=true), у которых НЕТ предстоящего или просроченного
// "потомка" с датой > сегодняшней, и создать следующий экземпляр, начиная от даты последнего выполненного.
// Это сложная логика, требующая аккуратных запросов.

export const generateNextRecurrentPayments = async () => {
  logger.info("Running cron job: Generate next recurrent payments");
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Найти ВСЕ повторяющиеся платежи (isRecurrent=true)
    const recurringPayments = await db.Payment.findAll({
      where: {
        isRecurrent: true,
        // Исключаем удаленные серии, если такое понятие введем. Пока нет.
      },
      // TODO: Возможно, группировать по parentId?
      // include: [{ model: db.User, as: 'user', attributes: ['id'] }] // Получить userId
    });

    let createdCount = 0;

    // Для каждой повторяющейся серии (определяем по parentId):
    // Найти последний экземпляр (по dueDate)
    // Если этот последний экземпляр completed, overdue, или upcoming с датой в прошлом,
    // И дата следующего экземпляра не превышает recurrenceEndDate,
    // И такого следующего экземпляра еще не существует,
    // Создать следующий.

    // Это может быть неэффективно для большого числа пользователей/платежей.
    // Альтернативный подход:
    // 1. Найти все платежи со статусом 'completed', которые являются повторяющимися (isRecurrent=true).
    // 2. Для каждого такого платежа, рассчитать следующую дату.
    // 3. Создать новый экземпляр, если дата не превышает recurrenceEndDate и его еще нет.

    // Давайте реализуем более простой вариант (может быть неоптимальным):
    // Найдем все повторяющиеся платежи, у которых нет активного (upcoming/overdue) экземпляра
    // с датой >= сегодня. Это означает, что последний активный экземпляр либо выполнен, либо просрочен очень сильно.
    // Затем для каждого такого "отстающего" родителя, найдем последний выполненный экземпляр
    // и сгенерируем от него следующий.

    // Этот запрос сложен для исключения потомков. Возможно, лучше другой подход.

    // --- Проще: Итерировать по пользователям или по сериям ---
    // Найдем всех пользователей
    const users = await db.User.findAll({ attributes: ["id"] });

    for (const user of users) {
      // Для каждого пользователя найти все повторяющиеся платежи (isRecurrent=true)
      const userRecurringPayments = await db.Payment.findAll({
        where: {
          userId: user.id,
          isRecurrent: true,
          // Ищем либо родительские платежи (parentId=null)
          // либо платежи, которые являются первыми в серии (parentId = id)
          [Op.or]: [
            { parentId: { [Op.is]: null } },
            { parentId: Sequelize.col("Payment.id") },
          ],
        },
        order: [["createdAt", "ASC"]], // Важно: берем первый созданный в каждой серии
      });

      for (const firstInstance of userRecurringPayments) {
        // Для каждой серии (определенной первым экземпляром firstInstance)
        // Найти последний *активный* (upcoming/overdue) экземпляр или последний *выполненный*
        const lastInstance = await db.Payment.findOne({
          where: {
            userId: user.id, // Принадлежит тому же пользователю
            parentId: firstInstance.parentId || firstInstance.id, // Принадлежит той же серии
            status: { [Op.in]: ["upcoming", "overdue", "completed"] }, // Ищем среди активных и выполненных
          },
          order: [["dueDate", "DESC"]], // Находим последний по дате
          // order: [['completedAt', 'DESC'], ['dueDate', 'DESC']], // Или последний выполненный, если completedAt есть
        });

        let startDateForNextCalculation: Date | null = null;

        if (!lastInstance) {
          // Если нет ни одного активного или выполненного экземпляра в серии (странный случай)
          // Используем дату первого экземпляра
          startDateForNextCalculation = new Date(firstInstance.dueDate);
        } else if (
          lastInstance.status === "completed" ||
          lastInstance.status === "overdue"
        ) {
          // Если последний экземпляр выполнен или просрочен
          startDateForNextCalculation = new Date(lastInstance.dueDate);
        } else if (lastInstance.status === "upcoming") {
          // Если есть предстоящий экземпляр с датой в будущем
          if (new Date(lastInstance.dueDate) >= now) {
            // Серия актуальна, следующий экземпляр пока не нужен
            continue; // Переходим к следующей серии
          } else {
            // Предстоящий экземпляр, но его дата в прошлом (должен был стать overdue cron job)
            // Используем его дату как отправную
            startDateForNextCalculation = new Date(lastInstance.dueDate);
          }
        }

        // Если определена дата для расчета следующего
        if (startDateForNextCalculation) {
          // Рассчитать следующую дату
          const nextDueDate = calculateNextDueDate(
            startDateForNextCalculation,
            firstInstance.recurrencePattern!
          );

          // Проверить дату окончания серии
          if (
            firstInstance.recurrenceEndDate &&
            new Date(nextDueDate) > new Date(firstInstance.recurrenceEndDate)
          ) {
            logger.info(
              `Recurring series for user ${user.id}, parent ${
                firstInstance.id
              } ends. Next due date ${
                nextDueDate.toISOString().split("T")[0]
              } exceeds end date ${firstInstance.recurrenceEndDate}.`
            );
            // Серия закончилась
            continue; // Переходим к следующей серии
          }

          // Проверяем, существует ли уже экземпляр с этой следующей датой для этой серии
          const existingNextInstance = await db.Payment.findOne({
            where: {
              userId: user.id,
              parentId: firstInstance.parentId || firstInstance.id,
              dueDate: nextDueDate.toISOString().split("T")[0],
              // status: { [Op.notIn]: ['deleted'] } // Игнорируем удаленные?
            },
          });

          if (existingNextInstance) {
            logger.warn(
              `Next instance for user ${user.id}, series parent ${
                firstInstance.id
              } with due date ${
                nextDueDate.toISOString().split("T")[0]
              } already exists (ID: ${
                existingNextInstance.id
              }). Skipping creation.`
            );
          } else {
            // Создаем новый экземпляр
            await db.Payment.create({
              userId: user.id,
              categoryId: firstInstance.categoryId,
              title: firstInstance.title,
              amount: firstInstance.amount,
              dueDate: nextDueDate.toISOString().split("T")[0], // Форматируем дату
              isRecurrent: true,
              recurrencePattern: firstInstance.recurrencePattern,
              recurrenceEndDate: firstInstance.recurrenceEndDate,
              parentId: firstInstance.parentId || firstInstance.id, // Ссылка на родителя серии
              status: "upcoming",
              completedAt: null,
              filePath: null,
              fileName: null, // Файлы/иконки не копируются
              iconPath: null,
              iconType: null,
              builtinIconName: null,
            });
            logger.info(
              `Created new recurrent payment instance for user ${
                user.id
              }, series parent ${firstInstance.id}, dueDate ${
                nextDueDate.toISOString().split("T")[0]
              }.`
            );
            createdCount++;

            // TODO: Сгенерировать уведомление для нового платежа, если подходит по сроку (Часть 20+)
          }
        }
      }
    }

    logger.info(
      `Cron job: Generate next recurrent payments finished. Created ${createdCount} new instances.`
    );
    return createdCount;
  } catch (error) {
    logger.error("Error in generateNextRecurrentPayments cron job:", error);
    throw error;
  }
};

// TODO: В Части 17 реализовать getArchivedPayments, restorePayment, permanentDeletePayment
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
          dueDate: { [Op.lte]: now }, // У которых срок оплаты <= сегодня
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
export const getDashboardStats = async (userId: string) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Первое число текущего месяца
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Последнее число текущего месяца

    // Важно: В статистику по текущему месяцу включаются:
    // - Платежи со статусом 'upcoming' или 'overdue', у которых срок оплаты в текущем месяце.
    // - Платежи со статусом 'completed', у которых срок оплаты ИЛИ дата выполнения в текущем месяце.
    // - Платежи со статусом 'deleted', у которых срок оплаты ИЛИ дата удаления в текущем месяце.
    // Согласно ТЗ 2.5: "основной вид - текущий месяц... Включает активные платежи И платежи, завершенные в текущем месяце."
    // Исключает просроченные из прошлых месяцев, если они не были завершены в текущем.
    // Давайте считать, что в статистику попадают платежи, у которых:
    // 1. Срок оплаты (dueDate) находится в текущем месяце.
    // 2. ИЛИ (для completed/deleted) дата выполнения/удаления (completedAt/updatedAt) находится в текущем месяце.

    // Находим ВСЕ платежи пользователя, которые попадают в текущий месяц по dueDate
    const paymentsInMonthByDueDate = await db.Payment.findAll({
      where: {
        userId: userId,
        dueDate: {
          [Op.between]: [
            startOfMonth.toISOString().split("T")[0],
            endOfMonth.toISOString().split("T")[0],
          ], // Диапазон дат YYYY-MM-DD
        },
        // Исключаем перманентно удаленные (их нет в БД)
        status: { [Op.not]: "some_non_existent_status" }, // Всегда показываем все статусы, если дата в месяце
      },
      include: [
        {
          // Включаем категорию для группировки
          model: db.Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
      attributes: [
        // Выбираем нужные поля для агрегации
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "categoryId",
        "completedAt",
        "updatedAt",
        "isRecurrent", // Добавляем isRecurrent для информации
      ],
    });

    // Находим платежи со статусом 'completed' или 'deleted', у которых completedAt/updatedAt в текущем месяце,
    // НО dueDate НЕ ОБЯЗАТЕЛЬНО в текущем месяце (например, просроченный из прошлого месяца, выполненный сегодня).
    const completedOrDeletedInMonthByDate = await db.Payment.findAll({
      where: {
        userId: userId,
        status: { [Op.in]: ["completed", "deleted"] },
        [Op.or]: [
          // Дата выполнения ИЛИ дата обновления (для удаленных) в текущем месяце
          {
            completedAt: {
              [Op.between]: [
                startOfMonth,
                new Date(
                  endOfMonth.getFullYear(),
                  endOfMonth.getMonth(),
                  endOfMonth.getDate(),
                  23,
                  59,
                  59
                ),
              ], // Диапазон дат с учетом времени
            },
          },
          {
            // updatedAt используется как дата логического удаления для статуса 'deleted'
            updatedAt: {
              [Op.between]: [
                startOfMonth,
                new Date(
                  endOfMonth.getFullYear(),
                  endOfMonth.getMonth(),
                  endOfMonth.getDate(),
                  23,
                  59,
                  59
                ),
              ],
            },
            status: "deleted", // Применяем updatedAt только для удаленных
          },
        ],
      },
      include: [
        {
          // Включаем категорию
          model: db.Category,
          as: "category",
          attributes: ["id", "name"],
        },
      ],
      attributes: [
        // Выбираем нужные поля
        "id",
        "title",
        "amount",
        "dueDate",
        "status",
        "categoryId",
        "completedAt",
        "updatedAt",
        "isRecurrent",
      ],
    });

    // Объединяем два списка и удаляем дубликаты (если один платеж попал по dueDate И по completedAt/updatedAt)
    // Удобнее использовать Set или Map для уникализации по ID
    const allPaymentsInMonthMap = new Map<string, any>(); // Map для уникализации по ID

    paymentsInMonthByDueDate.forEach((p) =>
      allPaymentsInMonthMap.set(p.id, p.toJSON())
    );
    completedOrDeletedInMonthByDate.forEach((p) =>
      allPaymentsInMonthMap.set(p.id, p.toJSON())
    );

    const allPaymentsInMonth = Array.from(allPaymentsInMonthMap.values());

    // --- Расчет статистики ---

    let totalUpcomingAmount = 0;
    let totalCompletedAmount = 0;
    // Игнорируем просроченные и удаленные для сумм "предстоящих" и "выполненных"
    // Но включаем их для других видов статистики (распределение по категориям/дням), если они в месяце

    // Агрегация по категориям и дням
    const categoriesStats: {
      [key: string]: { id?: string; name: string; amount: number };
    } = {
      "no-category": { name: "Без категории", amount: 0 }, // Изначально добавляем "Без категории"
    };
    const dailyStats: { [key: string]: { date: string; amount: number } } = {}; // Дата в формате YYYY-MM-DD

    for (const payment of allPaymentsInMonth) {
      const amount = parseFloat(payment.amount.toString()); // Убедимся, что работаем с числом

      // Суммарная статистика по статусам (только предстоящие и выполненные в этом месяце)
      if (payment.status === "upcoming") {
        totalUpcomingAmount += amount;
      } else if (payment.status === "completed") {
        totalCompletedAmount += amount;
      }
      // Просроченные ('overdue') в текущем месяце добавляем в распределение, но не в totalUpcomingAmount?
      // Удаленные ('deleted') в текущем месяце добавляем в распределение, но не в totals.
      // ТЗ 2.3 "Суммарная статистика по месяцам". Не ясно, включает ли она просроченные и удаленные суммы.
      // Давайте в totals включать только upcoming (как предстоящие) и completed (как выполненные).
      // А в распределение включать ВСЕ платежи, которые попали в выборку месяца.

      // Распределение по категориям (включаем все платежи из выборки месяца)
      const categoryId = payment.category?.id || "no-category";
      const categoryName = payment.category?.name || "Без категории";

      if (!categoriesStats[categoryId]) {
        categoriesStats[categoryId] = {
          id: categoryId !== "no-category" ? categoryId : undefined,
          name: categoryName,
          amount: 0,
        };
      }
      categoriesStats[categoryId].amount += amount;

      // Распределение по дням (включаем все платежи из выборки месяца)
      // Используем dueDate для графика платежной нагрузки
      const dueDateStr = payment.dueDate; // Формат YYYY-MM-DD

      if (!dailyStats[dueDateStr]) {
        dailyStats[dueDateStr] = { date: dueDateStr, amount: 0 };
      }
      dailyStats[dueDateStr].amount += amount;
    }

    // Преобразуем dailyStats в массив, сортируем по дате
    const dailyStatsArray = Object.values(dailyStats).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Преобразуем categoriesStats в массив (исключая временный ключ 'no-category')
    const categoriesStatsArray = Object.values(categoriesStats); // .filter(cat => cat.id !== undefined); // Если хотите исключить "Без категории" из списка, но обычно она нужна

    // TODO: Добавить расчет других метрик, если нужны (например, количество платежей по статусам)

    logger.info(
      `Calculated dashboard stats for user ${userId} for month ${startOfMonth.getFullYear()}-${
        startOfMonth.getMonth() + 1
      }`
    );

    return {
      month: `${startOfMonth.getFullYear()}-${startOfMonth.getMonth() + 1}`,
      totalUpcomingAmount: totalUpcomingAmount.toFixed(2), // Возвращаем как строку с 2 знаками после запятой
      totalCompletedAmount: totalCompletedAmount.toFixed(2),
      categoriesDistribution: categoriesStatsArray, // Массив { name, amount, id? }
      dailyPaymentLoad: dailyStatsArray, // Массив { date, amount }
      // TODO: Добавить другие агрегированные данные
    };
  } catch (error) {
    logger.error(
      `Error calculating dashboard stats for user ${userId}:`,
      error
    );
    throw new Error("Не удалось рассчитать статистику для дашборда.");
  }
};
