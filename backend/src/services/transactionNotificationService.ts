import db from "../models";
import logger from "../config/logger";

interface TransactionNotificationData {
  text: string;
  from: string;
}

export const logTransactionNotification = async (
  data: TransactionNotificationData
) => {
  try {
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
