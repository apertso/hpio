import db from "../models";
import {
  RecurringSeriesInstance,
  RecurringSeriesAttributes,
} from "../models/RecurringSeries";
import { RecurringSeriesCreationAttributes } from "../models/RecurringSeries";
import logger from "../config/logger";
import { Op, Transaction } from "sequelize";
import { RRule } from "rrule";
import { normalizeDateToUTC } from "../utils/dateUtils";

// Export the model for includes in other services
export const SeriesModel = db.RecurringSeries;

/**
 * Get a recurring series by ID and user ID.
 * @param seriesId - The ID of the recurring series.
 * @param userId - The ID of the user.
 * @returns The recurring series instance or null if not found or not owned by the user.
 */
export const getRecurringSeriesById = async (
  seriesId: string,
  userId: string,
  transaction?: Transaction
): Promise<RecurringSeriesInstance | null> => {
  try {
    const series = await db.RecurringSeries.findOne({
      where: {
        id: seriesId,
        userId: userId,
      },
      include: [
        { model: db.User, as: "user" },
        { model: db.Category, as: "category" },
      ],
      transaction,
    });
    return series;
  } catch (error) {
    logger.error(`Error getting recurring series by ID ${seriesId}:`, error);
    throw error;
  }
};

/**
 * Get a recurring series by ID (internal use/system jobs).
 * @param seriesId - The ID of the recurring series.
 * @returns The recurring series instance or null.
 */
export const getRecurringSeriesByIdInternal = async (
  seriesId: string,
  transaction?: Transaction
): Promise<RecurringSeriesInstance | null> => {
  try {
    const series = await db.RecurringSeries.findOne({
      where: { id: seriesId },
      transaction,
    });
    return series;
  } catch (error) {
    logger.error(
      `Error getting recurring series internal by ID ${seriesId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get active recurring series for a user.
 * @param userId - The ID of the user.
 * @returns An array of active recurring series instances.
 */
export const getActiveRecurringSeries = async (
  userId: string
): Promise<RecurringSeriesInstance[]> => {
  try {
    const series = await db.RecurringSeries.findAll({
      where: {
        userId: userId,
        isActive: true,
      },
    });
    return series;
  } catch (error) {
    logger.error(
      `Error getting active recurring series for user ${userId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get active recurring series for a user with category included.
 * @param userId - The ID of the user.
 * @returns An array of active recurring series instances.
 */
export const getActiveRecurringSeriesWithCategory = async (
  userId: string
): Promise<RecurringSeriesInstance[]> => {
  try {
    const series = await db.RecurringSeries.findAll({
      where: { userId: userId, isActive: true },
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        },
      ],
    });
    return series;
  } catch (error) {
    logger.error(
      `Error getting active recurring series with category for user ${userId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get ALL active recurring series (system-wide).
 * @returns An array of all active recurring series.
 */
export const getAllActiveRecurringSeries = async (): Promise<
  RecurringSeriesInstance[]
> => {
  try {
    const series = await db.RecurringSeries.findAll({
      where: { isActive: true },
    });
    return series;
  } catch (error) {
    logger.error("Error getting all active recurring series:", error);
    throw error;
  }
};

/**
 * Update the 'generatedUntil' field of a series.
 * @param seriesId - The ID of the recurring series.
 * @param generatedUntil - The new date.
 * @param transaction - Optional transaction.
 */
export const updateSeriesGeneratedUntil = async (
  seriesId: string,
  generatedUntil: string | Date,
  transaction?: Transaction
) => {
  try {
    let dateStr: string | undefined;
    if (generatedUntil instanceof Date) {
      dateStr = generatedUntil.toISOString().split("T")[0];
    } else {
      dateStr = generatedUntil;
    }

    await db.RecurringSeries.update(
      { generatedUntil: dateStr },
      { where: { id: seriesId }, transaction }
    );
  } catch (error) {
    logger.error(
      `Error updating generatedUntil for series ${seriesId}:`,
      error
    );
    throw error;
  }
};

/**
 * Deactivate a series (set isActive = false).
 * @param seriesId - The ID of the recurring series.
 * @param transaction - Optional transaction.
 */
export const deactivateSeries = async (
  seriesId: string,
  transaction?: Transaction
) => {
  try {
    await db.RecurringSeries.update(
      { isActive: false },
      { where: { id: seriesId }, transaction }
    );
    logger.info(`Deactivated series ${seriesId}.`);
  } catch (error) {
    logger.error(`Error deactivating series ${seriesId}:`, error);
    throw error;
  }
};

/**
 * Activate a series (set isActive = true).
 * @param seriesId - The ID of the recurring series.
 * @param transaction - Optional transaction.
 */
export const activateSeries = async (
  seriesId: string,
  transaction?: Transaction
) => {
  try {
    await db.RecurringSeries.update(
      { isActive: true },
      { where: { id: seriesId }, transaction }
    );
    logger.info(`Activated series ${seriesId}.`);
  } catch (error) {
    logger.error(`Error activating series ${seriesId}:`, error);
    throw error;
  }
};

/**
 * Delete orphaned series (those not in the provided list of IDs).
 * @param validSeriesIds - Array of valid series IDs.
 * @returns The number of deleted series.
 */
export const deleteOrphanedSeries = async (
  validSeriesIds: string[]
): Promise<number> => {
  try {
    const deletedCount = await db.RecurringSeries.destroy({
      where: {
        id: {
          [Op.notIn]: validSeriesIds,
        },
      },
    });
    return deletedCount;
  } catch (error) {
    logger.error("Error deleting orphaned series:", error);
    throw error;
  }
};

/**
 * Delete all series for a user.
 * @param userId - The ID of the user.
 * @param transaction - Optional transaction.
 */
export const deleteAllUserSeries = async (
  userId: string,
  transaction?: Transaction
) => {
  try {
    await db.RecurringSeries.destroy({ where: { userId }, transaction });
  } catch (error) {
    logger.error(`Error deleting all series for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Calculate the next due date for a series.
 * @param series - The recurring series instance.
 * @param boundaryDate - The boundary date (exclusive start for search).
 * @returns The next due date or null.
 */
export const calculateNextDueDateForSeries = (
  series: RecurringSeriesInstance,
  boundaryDate: Date
): Date | null => {
  try {
    const options = RRule.parseString(series.recurrenceRule);
    options.dtstart = normalizeDateToUTC(new Date(series.startDate));
    const rule = new RRule(options);
    const nextDueDate = rule.after(normalizeDateToUTC(boundaryDate), false);

    const seriesEndDate = series.recurrenceEndDate
      ? new Date(series.recurrenceEndDate)
      : null;

    if (seriesEndDate) {
      // Normalize seriesEndDate to end of day for comparison if needed,
      // but standard comparison works if nextDueDate is normalized.
      // If nextDueDate > seriesEndDate, it's invalid.
      if (nextDueDate && nextDueDate > seriesEndDate) {
        return null;
      }
    }
    return nextDueDate;
  } catch (e) {
    logger.error(`Error calculating next due date for series ${series.id}`, e);
    return null;
  }
};

/**
 * Checks if a series should be deactivated based on a completed payment date.
 * Also updates generatedUntil if needed.
 * @returns The updated series (or found series) and whether it is still active.
 */
export const processSeriesAfterPaymentCompletion = async (
  seriesId: string,
  paymentDueDate: Date
): Promise<{ series: RecurringSeriesInstance | null; isActive: boolean }> => {
  const series = await db.RecurringSeries.findOne({ where: { id: seriesId } });
  if (!series) {
    return { series: null, isActive: false };
  }

  const normalizedPaymentDate = new Date(paymentDueDate);
  normalizedPaymentDate.setHours(0, 0, 0, 0);

  let isActive = series.isActive;

  if (series.recurrenceEndDate) {
    const seriesEndDate = new Date(series.recurrenceEndDate);
    seriesEndDate.setHours(0, 0, 0, 0);
    if (normalizedPaymentDate >= seriesEndDate) {
      isActive = false;
      if (series.isActive) {
        await series.update({ isActive: false });
        logger.info(
          `Recurring series ${series.id} deactivated as completed payment was on/after recurrenceEndDate.`
        );
      }
    }
  }

  if (isActive) {
    // Update generatedUntil if valid
    try {
      const currentBoundary = series.generatedUntil
        ? new Date(series.generatedUntil)
        : null;
      if (!currentBoundary || paymentDueDate > currentBoundary) {
        let dateStr: string | undefined;
        if (paymentDueDate instanceof Date) {
          dateStr = paymentDueDate.toISOString().split("T")[0];
        } else {
          dateStr = paymentDueDate;
        }
        await series.update({ generatedUntil: dateStr });
      }
    } catch (e) {
      logger.warn(
        `Could not update generatedUntil for series ${series.id}.`,
        e
      );
    }
  }

  return { series, isActive };
};

/**
 * Creates a new recurring series from a payment.
 * Note: Does NOT generate the next payment instance automatically to avoid circular dependency.
 * The caller is responsible for triggering next payment generation if needed.
 * @param userId - The ID of the user.
 * @param seriesData - Data for the new series.
 * @returns The created recurring series instance.
 */
export const createRecurringSeries = async (
  userId: string,
  seriesData: {
    title: string;
    amount: number;
    categoryId?: string | null;
    startDate: string;
    recurrenceRule: string;
    recurrenceEndDate?: Date | null;
    builtinIconName?: string | null;
    remind: boolean;
  }
): Promise<RecurringSeriesInstance> => {
  try {
    const newSeries = await db.RecurringSeries.create({
      userId: userId,
      title: seriesData.title,
      amount: seriesData.amount,
      categoryId: seriesData.categoryId || null,
      startDate: seriesData.startDate,
      recurrenceRule: seriesData.recurrenceRule,
      recurrenceEndDate: seriesData.recurrenceEndDate,
      builtinIconName: seriesData.builtinIconName || null,
      remind: seriesData.remind,
      isActive: true,
    });

    logger.info(
      `Created new recurring series (ID: ${newSeries.id}, User: ${userId})`
    );

    // Initialize generatedUntil with the start date
    try {
      await newSeries.update({ generatedUntil: seriesData.startDate });
    } catch (e) {
      logger.warn(
        `Could not initialize generatedUntil for series ${newSeries.id}. Field may not exist in DB yet.`
      );
    }

    return newSeries;
  } catch (error: any) {
    logger.error(`Error creating recurring series for user ${userId}:`, error);
    throw new Error(error.message || "Failed to create recurring series.");
  }
};

/**
 * Updates a recurring series. If only non-recurrence fields change, updates the existing series.
 * If the recurrence rule changes, splits the series by deactivating the old one and creating a new one.
 * @param seriesId - The ID of the recurring series to update.
 * @param userId - The ID of the user.
 * @param data - The data for updating the series, including the cut-off payment ID and new start date.
 * @returns The updated recurring series instance or null if not found or not owned by the user.
 */
export const updateRecurringSeries = async (
  seriesId: string,
  userId: string,
  data: Partial<RecurringSeriesCreationAttributes> & {
    cutOffPaymentId: string;
    startDate: string;
  }
): Promise<RecurringSeriesInstance | null> => {
  const { cutOffPaymentId, startDate, ...newSeriesData } = data;

  if (!cutOffPaymentId) {
    throw new Error("cutOffPaymentId is required to update a series.");
  }
  if (!startDate) {
    throw new Error("startDate is required for the series.");
  }

  const transaction = await db.sequelize.transaction();
  try {
    // Find the series and the payment that serves as the cut-off point
    const series = await db.RecurringSeries.findOne({
      where: { id: seriesId, userId },
      transaction,
    });
    const cutOffPayment = await db.Payment.findOne({
      where: { id: cutOffPaymentId, userId },
      transaction,
    });

    if (!series || !cutOffPayment || cutOffPayment.seriesId !== series.id) {
      throw new Error(
        "Series or payment not found, or payment does not belong to the series."
      );
    }

    // Check if recurrence rule is changing
    const recurrenceRuleChanged =
      newSeriesData.recurrenceRule &&
      newSeriesData.recurrenceRule !== series.recurrenceRule;

    if (recurrenceRuleChanged) {
      // Recurrence rule changed - split the series (old behavior)
      logger.info(
        `Recurrence rule changed for series ${seriesId}, splitting series.`
      );

      // 1. Deactivate the old series by setting its end date to the day before the cut-off payment
      const cutOffDate = new Date(cutOffPayment.dueDate);
      cutOffDate.setDate(cutOffDate.getDate() - 1);
      series.recurrenceEndDate = cutOffDate;
      series.isActive = false; // Mark as inactive
      await series.save({ transaction });
      logger.info(`Deactivated old series ${series.id}.`);

      // 2. Delete all future payments of the old series that are after the cut-off payment
      await db.Payment.destroy({
        where: {
          seriesId: series.id,
          dueDate: { [Op.gt]: cutOffPayment.dueDate },
        },
        transaction,
      });
      logger.info(`Deleted future payments for old series ${series.id}.`);

      // 3. Create the new series with data from the form
      const newSeries = await db.RecurringSeries.create(
        {
          userId,
          title: newSeriesData.title ?? series.title,
          amount: newSeriesData.amount ?? series.amount,
          categoryId:
            newSeriesData.categoryId !== undefined
              ? newSeriesData.categoryId
              : series.categoryId,
          recurrenceRule: newSeriesData.recurrenceRule!,
          startDate: startDate,
          recurrenceEndDate: newSeriesData.recurrenceEndDate,
          builtinIconName:
            newSeriesData.builtinIconName !== undefined
              ? newSeriesData.builtinIconName
              : series.builtinIconName,
          remind: newSeriesData.remind ?? series.remind,
          isActive: true,
        },
        { transaction }
      );
      logger.info(`Created new series ${newSeries.id}.`);

      // 4. Update the cut-off payment to become the first instance of the new series
      cutOffPayment.seriesId = newSeries.id;
      cutOffPayment.title = newSeries.title;
      cutOffPayment.amount = newSeries.amount;
      cutOffPayment.categoryId = newSeries.categoryId;
      cutOffPayment.builtinIconName = newSeries.builtinIconName;
      cutOffPayment.dueDate = startDate; // The dueDate becomes the new startDate
      cutOffPayment.remind = newSeries.remind;
      await cutOffPayment.save({ transaction });
      logger.info(
        `Updated payment ${cutOffPayment.id} to be the first of new series ${newSeries.id}.`
      );

      await transaction.commit();
      const result = await getRecurringSeriesById(newSeries.id, userId);
      return result;
    } else {
      // Recurrence rule not changed - update the existing series
      logger.info(`Updating existing series ${seriesId} without splitting.`);

      // Update the series fields
      const updatedFields: Partial<RecurringSeriesAttributes> = {};
      if (newSeriesData.title !== undefined)
        updatedFields.title = newSeriesData.title;
      if (newSeriesData.amount !== undefined)
        updatedFields.amount = newSeriesData.amount;
      if (newSeriesData.categoryId !== undefined)
        updatedFields.categoryId = newSeriesData.categoryId;
      if (newSeriesData.recurrenceEndDate !== undefined)
        updatedFields.recurrenceEndDate = newSeriesData.recurrenceEndDate;
      if (newSeriesData.builtinIconName !== undefined)
        updatedFields.builtinIconName = newSeriesData.builtinIconName;
      if (newSeriesData.remind !== undefined)
        updatedFields.remind = newSeriesData.remind;
      updatedFields.startDate = startDate; // Always update start date

      await series.update(updatedFields, { transaction });
      logger.info(`Updated series ${series.id} fields.`);

      // Update the cut-off payment to reflect the new series data and due date
      const paymentUpdates: any = {
        dueDate: startDate, // Update due date to match new start date
      };
      if (newSeriesData.title !== undefined)
        paymentUpdates.title = newSeriesData.title;
      if (newSeriesData.amount !== undefined)
        paymentUpdates.amount = newSeriesData.amount;
      if (newSeriesData.categoryId !== undefined)
        paymentUpdates.categoryId = newSeriesData.categoryId;
      if (newSeriesData.builtinIconName !== undefined)
        paymentUpdates.builtinIconName = newSeriesData.builtinIconName;
      if (newSeriesData.remind !== undefined)
        paymentUpdates.remind = newSeriesData.remind;

      await cutOffPayment.update(paymentUpdates, { transaction });
      logger.info(
        `Updated payment ${cutOffPayment.id} to reflect series changes.`
      );

      await transaction.commit();
      const result = await getRecurringSeriesById(series.id, userId);
      return result;
    }
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error updating recurring series with ID ${seriesId}:`, error);
    throw error;
  }
};

/**
 * Deactivates a recurring series and deletes its future payments.
 * @param seriesId - The ID of the recurring series to deactivate.
 * @param userId - The ID of the user.
 * @returns True if the series was deactivated, false otherwise.
 */
export const deleteRecurringSeries = async (
  seriesId: string,
  userId: string
): Promise<boolean> => {
  const transaction = await db.sequelize.transaction();
  try {
    const series = await db.RecurringSeries.findOne({
      where: {
        id: seriesId,
        userId: userId,
      },
      transaction,
    });

    if (!series) {
      await transaction.rollback();
      return false;
    }

    // Deactivate the series
    await series.update({ isActive: false }, { transaction });

    // Archive future (upcoming or overdue) payments for this series instead of deleting
    await db.Payment.update(
      { status: "deleted" },
      {
        where: {
          seriesId: seriesId,
          status: { [Op.in]: ["upcoming", "overdue"] },
        },
        transaction,
      }
    );

    await transaction.commit();

    logger.info(
      `Recurring series with ID ${seriesId} deactivated by user ${userId}. Future payments archived.`
    );
    return true;
  } catch (error) {
    await transaction.rollback();
    logger.error(
      `Error deactivating recurring series with ID ${seriesId}:`,
      error
    );
    throw error;
  }
};

/**
 * Get all recurring series for a user.
 * @param userId - The ID of the user.
 * @returns An array of recurring series instances.
 */
export const getAllRecurringSeries = async (
  userId: string
): Promise<RecurringSeriesInstance[]> => {
  try {
    const series = await db.RecurringSeries.findAll({
      where: {
        userId: userId,
      },
      include: [
        { model: db.User, as: "user" },
        { model: db.Category, as: "category" },
      ],
    });
    return series;
  } catch (error) {
    logger.error(
      `Error getting all recurring series for user ${userId}:`,
      error
    );
    throw error;
  }
};
