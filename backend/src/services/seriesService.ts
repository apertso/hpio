import db from "../models";
import { RecurringSeriesInstance } from "../models/RecurringSeries";
import { RecurringSeriesCreationAttributes } from "../models/RecurringSeries";
import logger from "../config/logger";

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
 * Update a recurring series.
 * @param seriesId - The ID of the recurring series to update.
 * @param userId - The ID of the user.
 * @param data - The data to update the recurring series with.
 * @returns The updated recurring series instance or null if not found or not owned by the user.
 */
export const updateRecurringSeries = async (
  seriesId: string,
  userId: string,
  data: Partial<RecurringSeriesCreationAttributes>
): Promise<RecurringSeriesInstance | null> => {
  try {
    const series = await db.RecurringSeries.findOne({
      where: {
        id: seriesId,
        userId: userId,
      },
    });

    if (!series) {
      return null;
    }

    await series.update(data);
    // Fetch the updated series with includes if needed for response
    const updatedSeries = await getRecurringSeriesById(series.id, userId);
    return updatedSeries;
  } catch (error) {
    logger.error(`Error updating recurring series with ID ${seriesId}:`, error);
    throw error;
  }
};

/**
 * Delete a recurring series.
 * @param seriesId - The ID of the recurring series to delete.
 * @param userId - The ID of the user.
 * @returns True if the series was deleted, false otherwise.
 */
export const deleteRecurringSeries = async (
  seriesId: string,
  userId: string
): Promise<boolean> => {
  try {
    const series = await db.RecurringSeries.findOne({
      where: {
        id: seriesId,
        userId: userId,
      },
    });

    if (!series) {
      return false;
    }

    // Note: ON DELETE SET NULL on payments.seriesId will handle dissociating payments
    await series.destroy();
    logger.info(
      `Recurring series with ID ${seriesId} deleted by user ${userId}.`
    );
    return true;
  } catch (error) {
    logger.error(`Error deleting recurring series with ID ${seriesId}:`, error);
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
