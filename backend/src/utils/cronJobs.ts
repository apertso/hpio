// --- ОБЩЕЕ ОПИСАНИЕ ---
// Фоновые задачи (Cron Jobs) — это гарант надежности и актуальности данных в системе.
// Они работают на сервере по расписанию и выполняют критически важные функции,
// которые дополняют логику, срабатывающую в реальном времени от действий пользователя.
// Например, даже если пользователь не заходит в приложение, cron-задачи обеспечат
// правильное состояние его платежей и в будущем отправят необходимые уведомления.

import cron from "node-cron";
import logger from "../config/logger";
// Импорт сервисов, которые будут выполнять задачи
import {
  updateOverdueStatuses,
  generateNextRecurrentPayments,
  cleanupOrphanedSeries,
} from "../services/paymentService";
import {
  executeWithTaskLock,
  TASK_UPDATE_OVERDUE,
  TASK_GENERATE_RECURRING,
  TASK_CLEANUP_ORPHANED_SERIES,
} from "../services/taskLockService";

const setupCronJobs = () => {
  // ЗАДАЧА 1: Актуализация статусов просроченных платежей.
  // ЧТО ДЕЛАЕТ: Находит все платежи со статусом 'upcoming', у которых срок оплаты уже прошел, и меняет их статус на 'overdue'.
  // ПОЧЕМУ НУЖНО: Это основной механизм, который обеспечивает своевременное отображение просрочек в интерфейсе.
  // ВРЕМЯ: Каждый день в 00:05 (сразу после полуночи, чтобы корректно обработать вчерашние даты).
  cron.schedule("5 0 * * *", async () => {
    logger.info(`Cron: Attempting to run ${TASK_UPDATE_OVERDUE}`);
    try {
      const affectedCount = await executeWithTaskLock(
        TASK_UPDATE_OVERDUE,
        updateOverdueStatuses
      );
      if (affectedCount !== undefined) {
        logger.info(
          `Cron: Finished ${TASK_UPDATE_OVERDUE}. Affected ${affectedCount} payments.`
        );
      } else {
        logger.info(
          `Cron: Task ${TASK_UPDATE_OVERDUE} was skipped (likely already in progress or interval not met).`
        );
      }
    } catch (error) {
      logger.error(`Cron: Error in ${TASK_UPDATE_OVERDUE}`, error);
    }
  });

  // ЗАДАЧА 2: Генерация следующих платежей в повторяющихся сериях.
  // ЧТО ДЕЛАЕТ: Находит активные серии и создает для них следующий экземпляр платежа, если он еще не был создан.
  // ПОЧЕМУ НУЖНО: Это "страховка" и механизм самовосстановления. Основная логика создает следующий платеж сразу после выполнения текущего,
  // но эта задача нужна, если:
  // 1. Пользователь долго не заходил в приложение и не отмечал платежи выполненными.
  // 2. Произошел сбой, и мгновенная генерация не сработала.
  // Эта задача гарантирует, что цепочка платежей никогда не прервется.
  // ВРЕМЯ: Каждый день в 01:00 (после обновления статусов).
  cron.schedule("0 1 * * *", async () => {
    logger.info(`Cron: Attempting to run ${TASK_GENERATE_RECURRING}`);
    try {
      const result = await executeWithTaskLock(
        TASK_GENERATE_RECURRING,
        generateNextRecurrentPayments
      );
      if (result) {
        logger.info(
          `Cron: Finished ${TASK_GENERATE_RECURRING}. Created ${result.createdCount} payments for ${result.checkedSeriesCount} series.`
        );
      } else {
        logger.info(
          `Cron: Task ${TASK_GENERATE_RECURRING} was skipped (likely already in progress or interval not met).`
        );
      }
    } catch (error) {
      logger.error(`Cron: Error in ${TASK_GENERATE_RECURRING}`, error);
    }
  });

  // ЗАДАЧА 3 (В БУДУЩЕМ): Отправка уведомлений.
  // ПОЧЕМУ НУЖНО: Cron идеально подходит для отправки своевременных напоминаний, не зависящих от действий пользователя.
  // ПРИМЕРЫ:
  // - "Напоминание: завтра нужно оплатить..." (запускается утром).
  // - "Внимание: у вас появился просроченный платеж" (запускается после ЗАДАЧИ 1).
  // - "Еженедельная сводка по предстоящим расходам".
  // cron.schedule('0 8 * * *', async () => { /* ... логика вызова notificationService ... */ });

  // ЗАДАЧА 4: Очистка "осиротевших" серий.
  // ЧТО ДЕЛАЕТ: Находит и удаляет записи о повторяющихся сериях, на которые не ссылается ни один платеж.
  // ПОЧЕМУ НУЖНО: Если все платежи серии были удалены вручную, сама серия может остаться в базе данных. Эта задача поддерживает чистоту данных.
  // ВРЕМЯ: Каждый день в 02:00 (после других основных задач).
  cron.schedule("0 2 * * *", async () => {
    logger.info(`Cron: Attempting to run ${TASK_CLEANUP_ORPHANED_SERIES}`);
    try {
      const deletedCount = await executeWithTaskLock(
        TASK_CLEANUP_ORPHANED_SERIES,
        cleanupOrphanedSeries
      );
      if (deletedCount !== undefined) {
        logger.info(
          `Cron: Finished ${TASK_CLEANUP_ORPHANED_SERIES}. Cleaned up ${deletedCount} series.`
        );
      } else {
        logger.info(
          `Cron: Task ${TASK_CLEANUP_ORPHANED_SERIES} was skipped (likely already in progress or interval not met).`
        );
      }
    } catch (error) {
      logger.error(`Cron: Error in ${TASK_CLEANUP_ORPHANED_SERIES}`, error);
    }
  });

  logger.info("Cron jobs scheduled with task locking.");
};

export { setupCronJobs };
