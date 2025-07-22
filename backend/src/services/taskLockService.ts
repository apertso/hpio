import db from "../models";
import logger from "../config/logger";

export const TASK_UPDATE_OVERDUE = "UPDATE_OVERDUE_STATUSES";
export const TASK_GENERATE_RECURRING = "GENERATE_RECURRING_PAYMENTS";
export const TASK_CLEANUP_ORPHANED_SERIES = "CLEANUP_ORPHANED_SERIES";

const taskExecutionInProgress: Set<string> = new Set();

export const canExecuteTask = async (
  taskName: string,
  intervalMinutes: number
): Promise<boolean> => {
  if (taskExecutionInProgress.has(taskName)) {
    return false;
  }

  try {
    const taskLog = await db.SystemTaskLog.findByPk(taskName);
    if (taskLog) {
      const now = new Date();
      const lastExecuted = new Date(taskLog.lastExecutedAt);
      const minutesSinceLastExecution =
        (now.getTime() - lastExecuted.getTime()) / (1000 * 60);
      return minutesSinceLastExecution >= intervalMinutes;
    }
    return true;
  } catch (error) {
    logger.error(`Error checking task lock for ${taskName}:`, error);
    return false;
  }
};

export const executeWithTaskLock = async <T>(
  taskName: string,
  executionFunction: () => Promise<T>
): Promise<T | undefined> => {
  if (taskExecutionInProgress.has(taskName)) {
    logger.warn(
      `executeWithTaskLock: Task ${taskName} attempted to run while already in progress.`
    );
    return undefined;
  }

  taskExecutionInProgress.add(taskName);
  logger.info(`Task ${taskName} started execution.`);

  try {
    const result = await executionFunction();
    await db.sequelize.transaction(async (transaction) => {
      await db.SystemTaskLog.upsert(
        {
          taskName: taskName,
          lastExecutedAt: new Date(),
        },
        { transaction }
      );
    });
    logger.info(`Task ${taskName} finished successfully.`);
    return result;
  } catch (error) {
    logger.error(`Error during ${taskName} execution:`, error);
    throw error;
  } finally {
    taskExecutionInProgress.delete(taskName);
    logger.info(`Task ${taskName} lock released.`);
  }
};
