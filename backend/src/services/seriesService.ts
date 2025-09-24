import db from "../models";
import { RecurringSeriesInstance } from "../models/RecurringSeries";
import { RecurringSeriesCreationAttributes } from "../models/RecurringSeries";
import logger from "../config/logger";
import { Op } from "sequelize";

/**
 * Get a recurring series by ID and user ID.
 * @param seriesId - The ID of the recurring series.
 * @param userId - The ID of the user.
 * @returns The recurring series instance or null if not found or not owned by the user.
 */
export const getRecurringSeriesById = async (
  seriesId: string,
  userId: string
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
    });
    return series;
  } catch (error) {
    logger.error(`Error getting recurring series by ID ${seriesId}:`, error);
    throw error;
  }
};

/**
 * Updates a recurring series by splitting it. The old series is deactivated,
 * future payments of the old series are deleted, a new series is created,
 * and the cut-off payment is updated and linked to the new series.
 * @param seriesId - The ID of the old recurring series to update.
 * @param userId - The ID of the user.
 * @param data - The data for the new series, including the cut-off payment ID and new start date.
 * @returns The new recurring series instance or null if not found or not owned by the user.
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
    throw new Error("startDate is required for the new series.");
  }

  const transaction = await db.sequelize.transaction();
  try {
    // Find the old series and the payment that serves as the cut-off point
    const oldSeries = await db.RecurringSeries.findOne({
      where: { id: seriesId, userId },
      transaction,
    });
    const cutOffPayment = await db.Payment.findOne({
      where: { id: cutOffPaymentId, userId },
      transaction,
    });

    if (
      !oldSeries ||
      !cutOffPayment ||
      cutOffPayment.seriesId !== oldSeries.id
    ) {
      throw new Error(
        "Series or payment not found, or payment does not belong to the series."
      );
    }

    // 1. Deactivate the old series by setting its end date to the day before the cut-off payment
    const cutOffDate = new Date(cutOffPayment.dueDate);
    cutOffDate.setDate(cutOffDate.getDate() - 1);
    oldSeries.recurrenceEndDate = cutOffDate;
    oldSeries.isActive = false; // Mark as inactive
    await oldSeries.save({ transaction });
    logger.info(`Deactivated old series ${oldSeries.id}.`);

    // 2. Delete all future payments of the old series that are after the cut-off payment
    await db.Payment.destroy({
      where: {
        seriesId: oldSeries.id,
        dueDate: { [Op.gt]: cutOffPayment.dueDate },
      },
      transaction,
    });
    logger.info(`Deleted future payments for old series ${oldSeries.id}.`);

    // 3. Create the new series with data from the form
    const newSeries = await db.RecurringSeries.create(
      {
        userId,
        title: newSeriesData.title ?? oldSeries.title,
        amount: newSeriesData.amount ?? oldSeries.amount,
        categoryId:
          newSeriesData.categoryId !== undefined
            ? newSeriesData.categoryId
            : oldSeries.categoryId,
        recurrenceRule:
          newSeriesData.recurrenceRule ?? oldSeries.recurrenceRule,
        startDate: startDate,
        recurrenceEndDate: newSeriesData.recurrenceEndDate,
        builtinIconName:
          newSeriesData.builtinIconName !== undefined
            ? newSeriesData.builtinIconName
            : oldSeries.builtinIconName,
        remind: newSeriesData.remind ?? oldSeries.remind,
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
    await cutOffPayment.save({ transaction });
    logger.info(
      `Updated payment ${cutOffPayment.id} to be the first of new series ${newSeries.id}.`
    );

    await transaction.commit();

    const result = await getRecurringSeriesById(newSeries.id, userId);
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error(
      `Error splitting recurring series with ID ${seriesId}:`,
      error
    );
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
