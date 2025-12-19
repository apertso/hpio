import db from "../models";
import logger from "../config/logger";
import { Op } from "sequelize";

interface TransactionNotificationData {
  text: string;
  from: string;
}

export const logTransactionNotification = async (
  data: TransactionNotificationData
) => {
  try {
    // Проверяем дубликаты за последние 10 секунд
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const existing = await db.TransactionNotification.findOne({
      where: {
        text: data.text,
        from: data.from,
        createdAt: {
          [Op.gte]: tenSecondsAgo,
        },
      },
    });

    if (existing) {
      logger.info(
        `Duplicate transaction notification detected (id: ${existing.id}), skipping creation.`
      );
      return existing;
    }

    logger.info("transaction", {
      text: data.text,
      from: data.from,
    });

    const notification = await db.TransactionNotification.create({
      text: data.text,
      from: data.from,
    });

    return notification;
  } catch (error) {
    logger.error("Error logging transaction notification:", error);
    throw new Error("Не удалось сохранить уведомление о транзакции.");
  }
};

export const bulkLogTransactionNotifications = async (
  notifications: TransactionNotificationData[]
) => {
  try {
    for (const notif of notifications) {
      logger.info("transaction", {
        text: notif.text,
        from: notif.from,
      });
    }

    const created = await db.TransactionNotification.bulkCreate(notifications);

    logger.info(`Bulk created ${created.length} transaction notifications`);
    return created;
  } catch (error) {
    logger.error("Error bulk logging transaction notifications:", error);
    throw new Error("Не удалось сохранить уведомления о транзакциях.");
  }
};
