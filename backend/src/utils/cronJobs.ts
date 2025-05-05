import cron from "node-cron";
import logger from "../config/logger";
// Импорт сервисов, которые будут выполнять задачи
import { updateOverdueStatuses } from "../services/paymentService"; // Импорт новой функции
// Импорт других сервисов для cron
import { generateNextRecurrentPayments } from "../services/paymentService"; // Часть 15/20
// import { checkPaymentStatusesAndNotify } from '../services/notificationService'; // Часть 20+

const setupCronJobs = () => {
  // Задача: Ежедневно обновлять статус платежей с 'upcoming' на 'overdue'
  // Расписание: каждый день в 00:05 ночи (после полуночи, чтобы захватить просроченные платежи за истекший день)
  cron.schedule("5 0 * * *", async () => {
    logger.info("Running daily cron job: Update overdue statuses");
    try {
      const affectedCount = await updateOverdueStatuses();
      logger.info(
        `Finished cron job: Update overdue statuses. Affected ${affectedCount} payments.`
      );
    } catch (error) {
      logger.error("Error in cron job: Update overdue statuses", error);
    }
  });

  // Задача: Ежедневно генерировать следующий экземпляр повторяющихся платежей (Часть 15/20)
  // Расписание: каждый день в 01:00 ночи (после обновления статусов)
  // !!! Задача: Ежедневно генерировать следующий экземпляр повторяющихся платежей
  // Расписание: каждый день в 01:00 ночи (после обновления статусов)
  cron.schedule("0 1 * * *", async () => {
    logger.info("Running daily cron job: Generate next recurrent payments");
    try {
      const createdCount = await generateNextRecurrentPayments();
      logger.info(
        `Finished cron job: Generate next recurrent payments. Created ${createdCount} new instances.`
      );
    } catch (error) {
      logger.error(
        "Error in cron job: Generate next recurrent payments",
        error
      );
    }
  });

  // Задача: Ежедневно проверять статусы платежей и генерировать уведомления (Часть 20+)
  // Расписание: каждый день в 08:00 утра (или настраиваемое)
  // cron.schedule('0 8 * * *', async () => { ... }); // TODO: Раскомментировать и реализовать

  logger.info("Cron jobs scheduled.");
};

export { setupCronJobs };
