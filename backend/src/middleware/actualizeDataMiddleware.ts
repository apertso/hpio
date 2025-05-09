import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import {
  updateOverdueStatuses,
  generateNextRecurrentPayments,
} from "../services/paymentService";
import {
  canExecuteTask,
  executeWithTaskLock,
  TASK_UPDATE_OVERDUE,
  TASK_GENERATE_RECURRING,
} from "../services/taskLockService";

const UPDATE_OVERDUE_INTERVAL_MINUTES = 60;
const GENERATE_RECURRING_INTERVAL_MINUTES = 60;

const triggerBackgroundTask = async (
  taskName: string,
  intervalMinutes: number,
  serviceFunction: () => Promise<any>
) => {
  try {
    if (await canExecuteTask(taskName, intervalMinutes)) {
      logger.info(`Middleware: Triggering ${taskName} due to user activity.`);
      // Запускаем задачу в фоне, не дожидаясь ее выполнения
      executeWithTaskLock(taskName, serviceFunction).catch((err) =>
        logger.error(`Middleware: Background ${taskName} failed:`, err)
      );
    }
  } catch (error) {
    logger.error(
      `Middleware: Error in triggerBackgroundTask for ${taskName}:`,
      error
    );
  }
};

export const actualizeDataMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Не используем await, чтобы не блокировать ответ пользователю
  triggerBackgroundTask(
    TASK_UPDATE_OVERDUE,
    UPDATE_OVERDUE_INTERVAL_MINUTES,
    updateOverdueStatuses
  );
  triggerBackgroundTask(
    TASK_GENERATE_RECURRING,
    GENERATE_RECURRING_INTERVAL_MINUTES,
    generateNextRecurrentPayments
  );
  next();
};
