// --- ОБЩЕЕ ОПИСАНИЕ ---
// Фоновые задачи (Cron Jobs) - это гарант надежности и актуальности данных в системе.
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
import { createDailySnapshots } from "../services/fundsService";
import {
  executeWithTaskLock,
  TASK_UPDATE_OVERDUE,
  TASK_GENERATE_RECURRING,
  TASK_CLEANUP_ORPHANED_SERIES,
  TASK_CREATE_FUNDS_SNAPSHOTS,
} from "../services/taskLockService";
import {
  sendPaymentReminderEmail,
  // Placeholder for future push service
} from "../services/emailService";
import db from "../models";
import { Op } from "sequelize";
import { trace, SpanStatusCode, Span } from "@opentelemetry/api"; // 👈 Import OpenTelemetry

// --- OpenTelemetry Tracer ---
const tracer = trace.getTracer("cron-job-tracer");
// ----------------------------

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

  // ЗАДАЧА 3: Отправка уведомлений о платежах.
  // ЧТО ДЕЛАЕТ: Каждую минуту проверяет, не наступило ли у кого-то из пользователей время для уведомлений.
  // Если наступило, находит все платежи этого пользователя, которые должны быть оплачены сегодня и помечены для напоминания,
  // и отправляет уведомление (Email/Push).
  // ВРЕМЯ: Каждую минуту (только в продакшене).
  if (process.env.NODE_ENV === "production") {
    cron.schedule("* * * * *", async () => {
      let span: Span;
      try {
        span = tracer.startSpan("notification-sending-job");
      } catch (e) {
        logger.error("[OpenTelemetry] Failed to start span:", e);
        return; // не продолжаем задачу, чтобы не запускать "ослеплённую" логику
      }

      try {
        // 1. Получаем ВСЕХ пользователей, у которых включены уведомления.
        // Проверка времени будет произведена в коде приложения, так как MS SQL не поддерживает IANA-таймзоны (напр., 'Europe/Moscow').
        const potentialUsers = await db.User.findAll({
          where: {
            [Op.or]: [
              { emailNotifications: true },
              { pushNotifications: true },
            ],
            isVerified: true,
          },
        });

        const now = new Date();

        // 2. Фильтруем пользователей в коде, проверяя их локальное время.
        const usersToNotify = potentialUsers.filter((user) => {
          try {
            // Форматируем текущее время в таймзоне пользователя в "HH:mm"
            const timeInZone = new Intl.DateTimeFormat("en-GB", {
              timeZone: user.timezone,
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(now);

            // Сравниваем с временем, указанным в настройках пользователя
            return timeInZone === user.notificationTime;
          } catch (e) {
            logger.error(
              `Invalid timezone for user ${user.id}: ${user.timezone}`
            );
            return false; // Игнорируем пользователя с невалидной таймзоной
          }
        });

        span.setAttribute("users.to_notify.count", usersToNotify.length);
        if (usersToNotify.length === 0) {
          span.end();
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        for (const user of usersToNotify) {
          const paymentsToRemind = await db.Payment.findAll({
            where: {
              userId: user.id,
              remind: true,
              status: { [Op.in]: ["upcoming", "overdue"] },
              dueDate: {
                [Op.gte]: today,
                [Op.lt]: tomorrow,
              },
            },
          });

          if (paymentsToRemind.length === 0) {
            continue;
          }

          const notificationMethods = [];
          if (user.emailNotifications) notificationMethods.push("email");
          if (user.pushNotifications) notificationMethods.push("push");

          logger.info(
            `Sending ${paymentsToRemind.length} reminders to ${
              user.email
            } via ${notificationMethods.join(", ")}`
          );

          for (const payment of paymentsToRemind) {
            if (user.emailNotifications) {
              await sendPaymentReminderEmail(
                user.email,
                user.name,
                payment.title,
                payment.amount,
                payment.dueDate
              );
            }

            if (user.pushNotifications) {
              const { sendPushNotification } = await import(
                "../services/fcmService"
              );

              if (user.fcmToken) {
                const formattedAmount = new Intl.NumberFormat("ru-RU", {
                  style: "currency",
                  currency: "RUB",
                }).format(payment.amount);

                await sendPushNotification(user.fcmToken, {
                  title: "Напоминание о платеже",
                  body: `Сегодня нужно оплатить "${payment.title}" на сумму ${formattedAmount}`,
                  clickAction: "main",
                });
              } else {
                logger.warn(
                  `User ${user.id} has push notifications enabled but no FCM token registered.`
                );
              }
            }
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        logger.error("Cron: Error in notification sending job", error);
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
      } finally {
        span.end();
      }
    });
  } else {
    logger.info(
      "Skipping notification cron job in non-production environment."
    );
  }

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

  // ЗАДАЧА 5: Создание ежедневных снимков баланса пользователей.
  // ЧТО ДЕЛАЕТ: Создает ежедневный снимок баланса пользователей в 00:00.
  cron.schedule("* * * * *", async () => {
    logger.info(`Cron: Attempting to run ${TASK_CREATE_FUNDS_SNAPSHOTS}`);
    try {
      const createdCount = await executeWithTaskLock(
        TASK_CREATE_FUNDS_SNAPSHOTS,
        createDailySnapshots
      );
      if (createdCount !== undefined) {
        logger.info(
          `Cron: Finished ${TASK_CREATE_FUNDS_SNAPSHOTS}. Created ${createdCount} snapshots.`
        );
      } else {
        logger.info(
          `Cron: Task ${TASK_CREATE_FUNDS_SNAPSHOTS} was skipped (likely already in progress or interval not met).`
        );
      }
    } catch (error) {
      logger.error(`Cron: Error in ${TASK_CREATE_FUNDS_SNAPSHOTS}`, error);
    }
  });

  logger.info("Cron jobs scheduled with task locking.");
};

export { setupCronJobs };
