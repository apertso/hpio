import db from "../models";
import logger from "../config/logger";
import { Op, UniqueConstraintError } from "sequelize";

interface SuggestionData {
  merchantName: string;
  amount: number;
  notificationData: string;
  notificationTimestamp?: number;
}

export const getPendingSuggestions = async (userId: string) => {
  try {
    const suggestions = await db.Suggestion.findAll({
      where: { userId, status: "pending" },
      order: [["createdAt", "DESC"]],
    });
    logger.info(
      `Fetched ${suggestions.length} pending suggestions for user ${userId}`
    );
    return suggestions;
  } catch (error) {
    logger.error(`Error fetching suggestions for user ${userId}:`, error);
    throw new Error("Не удалось получить список предложений.");
  }
};

export const getPendingSuggestionsCount = async (
  userId: string
): Promise<number> => {
  try {
    const count = await db.Suggestion.count({
      where: { userId, status: "pending" },
    });
    return count;
  } catch (error) {
    logger.error(`Error counting suggestions for user ${userId}:`, error);
    throw new Error("Не удалось получить количество предложений.");
  }
};

export const createSuggestion = async (
  userId: string,
  data: SuggestionData
) => {
  try {
    // Проверяем дубликат по времени ПОЛУЧЕНИЯ уведомления (не создания suggestion)
    // Это ловит кросс-девайс дубликаты даже если обработаны с задержкой
    if (data.notificationTimestamp) {
      const threeSecondsAgo = data.notificationTimestamp - 3000;

      const recentSuggestion = await db.Suggestion.findOne({
        where: {
          userId,
          merchantName: data.merchantName,
          amount: data.amount,
          notificationData: data.notificationData,
          notificationTimestamp: {
            [Op.gte]: threeSecondsAgo,
          },
        },
        order: [["createdAt", "DESC"]],
      });

      if (recentSuggestion) {
        const timeDiff =
          data.notificationTimestamp -
          (recentSuggestion.notificationTimestamp || 0);
        logger.info(
          `Duplicate notification detected for user ${userId} (merchant: ${data.merchantName}, timestamp diff: ${timeDiff}ms), returning existing: ${recentSuggestion.id}`
        );
        return recentSuggestion;
      }
    }

    const suggestion = await db.Suggestion.create({
      userId,
      merchantName: data.merchantName,
      amount: data.amount,
      notificationData: data.notificationData,
      notificationTimestamp: data.notificationTimestamp,
      status: "pending" as const,
    });
    logger.info(`Created suggestion for user ${userId}: ${suggestion.id}`);

    return suggestion;
  } catch (error) {
    // Обработка race condition: если уникальный индекс сработал, возвращаем существующую запись
    if (error instanceof UniqueConstraintError) {
      logger.info(
        `Race condition handled: duplicate suggestion for user ${userId}, fetching existing`
      );
      const existing = await db.Suggestion.findOne({
        where: {
          userId,
          notificationData: data.notificationData,
          ...(data.notificationTimestamp !== undefined
            ? { notificationTimestamp: data.notificationTimestamp }
            : {}),
        },
      });
      if (existing) {
        return existing;
      }
    }
    logger.error(`Error creating suggestion for user ${userId}:`, error);
    throw new Error("Не удалось создать предложение.");
  }
};

export const acceptSuggestion = async (
  suggestionId: string,
  userId: string
) => {
  try {
    const suggestion = await db.Suggestion.findOne({
      where: { id: suggestionId, userId },
    });

    if (!suggestion) {
      logger.warn(
        `Suggestion not found or no access (ID: ${suggestionId}, User: ${userId})`
      );
      return null;
    }

    suggestion.status = "accepted";
    await suggestion.save();

    logger.info(`Accepted suggestion ${suggestionId} for user ${userId}`);
    return suggestion;
  } catch (error) {
    logger.error(`Error accepting suggestion ${suggestionId}:`, error);
    throw new Error("Не удалось принять предложение.");
  }
};

export const dismissSuggestion = async (
  suggestionId: string,
  userId: string
) => {
  try {
    const suggestion = await db.Suggestion.findOne({
      where: { id: suggestionId, userId },
    });

    if (!suggestion) {
      logger.warn(
        `Suggestion not found or no access (ID: ${suggestionId}, User: ${userId})`
      );
      return null;
    }

    suggestion.status = "dismissed";
    await suggestion.save();

    logger.info(`Dismissed suggestion ${suggestionId} for user ${userId}`);
    return suggestion;
  } catch (error) {
    logger.error(`Error dismissing suggestion ${suggestionId}:`, error);
    throw new Error("Не удалось отклонить предложение.");
  }
};

export const bulkCreateSuggestions = async (
  userId: string,
  suggestions: SuggestionData[]
) => {
  try {
    const created = await db.Suggestion.bulkCreate(
      suggestions.map((s) => ({
        userId,
        merchantName: s.merchantName,
        amount: s.amount,
        notificationData: s.notificationData,
        status: "pending" as const,
      }))
    );
    logger.info(
      `Bulk created ${created.length} suggestions for user ${userId}`
    );

    return created;
  } catch (error) {
    logger.error(`Error bulk creating suggestions for user ${userId}:`, error);
    throw new Error("Не удалось создать предложения.");
  }
};
