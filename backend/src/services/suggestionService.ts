import db from "../models";
import logger from "../config/logger";

interface SuggestionData {
  merchantName: string;
  amount: number;
  notificationData: string;
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
    const suggestion = await db.Suggestion.create({
      userId,
      merchantName: data.merchantName,
      amount: data.amount,
      notificationData: data.notificationData,
      status: "pending" as const,
    });
    logger.info(`Created suggestion for user ${userId}: ${suggestion.id}`);

    return suggestion;
  } catch (error) {
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
