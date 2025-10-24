import { Router, Request, Response } from "express";
import {
  logTransactionNotification,
  bulkLogTransactionNotifications,
} from "../services/transactionNotificationService";
import logger from "../config/logger";

const router = Router();

router.post("/log", async (req: Request, res: Response) => {
  try {
    const { text, from } = req.body;

    if (!text || !from) {
      return res.status(400).json({ message: "text and from are required" });
    }

    const notification = await logTransactionNotification({ text, from });
    res.status(201).json(notification);
  } catch (error: any) {
    logger.error("Error in POST /api/notifications/log:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/log/bulk", async (req: Request, res: Response) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res
        .status(400)
        .json({ message: "notifications array is required" });
    }

    for (const notif of notifications) {
      if (!notif.text || !notif.from) {
        return res
          .status(400)
          .json({
            message: "Each notification must have text and from fields",
          });
      }
    }

    const created = await bulkLogTransactionNotifications(notifications);
    res.status(201).json(created);
  } catch (error: any) {
    logger.error("Error in POST /api/notifications/log/bulk:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
