import axiosInstance from "./axiosInstance";

export interface TransactionNotification {
  text: string;
  from: string;
}

export const notificationApi = {
  async logTransactionNotification(
    notification: TransactionNotification
  ): Promise<void> {
    await axiosInstance.post("/notifications/log", notification);
  },

  async bulkLogTransactionNotifications(
    notifications: TransactionNotification[]
  ): Promise<void> {
    await axiosInstance.post("/notifications/log/bulk", { notifications });
  },
};
