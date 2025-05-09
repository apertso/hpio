import cron from "node-cron";
import logger from "../config/logger";
// Импорт сервисов, которые будут выполнять задачи
import { updateOverdueStatuses } from "../services/paymentService"; // Импорт новой функции
// Импорт других сервисов для cron
import { generateNextRecurrentPayments } from "../services/paymentService"; // Часть 15/20
import {
  executeWithTaskLock,
  TASK_UPDATE_OVERDUE,
  TASK_GENERATE_RECURRING,
} from "../services/taskLockService";
// import { checkPaymentStatusesAndNotify } from '../services/notificationService'; // Часть 20+

const setupCronJobs = () => {
  // Задача: Ежедневно обновлять статус платежей с 'upcoming' на 'overdue'
  // Расписание: каждый день в 00:05 ночи (после полуночи, чтобы захватить просроченные платежи за истекший день)
  cron.schedule("5 0 * * *", async () => {
    // Ежедневно в 00:05
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

  // Задача: Ежедневно генерировать следующий экземпляр повторяющихся платежей (Часть 15/20)
  // Расписание: каждый день в 01:00 ночи (после обновления статусов)
  // !!! Задача: Ежедневно генерировать следующий экземпляр повторяющихся платежей
  // Расписание: каждый день в 01:00 ночи (после обновления статусов)
  cron.schedule("0 1 * * *", async () => {
    // Ежедневно в 01:00
    logger.info(`Cron: Attempting to run ${TASK_GENERATE_RECURRING}`);
    try {
      const result = await executeWithTaskLock(
        TASK_GENERATE_RECURRING,
        generateNextRecurrentPayments
      );
      if (result) {
        // result теперь GenerationResult | undefined
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

  // Задача: Ежедневно проверять статусы платежей и генерировать уведомления (Часть 20+)
  // Расписание: каждый день в 08:00 утра (или настраиваемое)
  // cron.schedule('0 8 * * *', async () => { ... }); // TODO: Раскомментировать и реализовать

  logger.info("Cron jobs scheduled with task locking.");
};

export { setupCronJobs };
