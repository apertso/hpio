import db from "../models";
import logger from "../config/logger";

interface MerchantRuleData {
  categoryId: string;
  merchantKeyword: string;
}

export const getMerchantRules = async (userId: string) => {
  try {
    const rules = await db.MerchantCategoryRule.findAll({
      where: { userId },
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    logger.info(`Fetched ${rules.length} merchant rules for user ${userId}`);
    return rules;
  } catch (error) {
    logger.error(`Error fetching merchant rules for user ${userId}:`, error);
    throw new Error("Не удалось получить список правил.");
  }
};

export const findRuleByMerchant = async (
  userId: string,
  merchantKeyword: string
) => {
  try {
    const rule = await db.MerchantCategoryRule.findOne({
      where: { userId, merchantKeyword },
      include: [
        {
          model: db.Category,
          as: "category",
          attributes: ["id", "name", "builtinIconName"],
        },
      ],
    });
    return rule;
  } catch (error) {
    logger.error(
      `Error finding rule for merchant ${merchantKeyword}, user ${userId}:`,
      error
    );
    throw new Error("Не удалось найти правило.");
  }
};

export const createMerchantRule = async (
  userId: string,
  data: MerchantRuleData
) => {
  try {
    const category = await db.Category.findOne({
      where: { id: data.categoryId, userId },
    });

    if (!category) {
      throw new Error("Категория не найдена или нет прав доступа.");
    }

    const existingRule = await db.MerchantCategoryRule.findOne({
      where: { userId, merchantKeyword: data.merchantKeyword },
    });

    if (existingRule) {
      existingRule.categoryId = data.categoryId;
      await existingRule.save();
      logger.info(
        `Updated existing merchant rule for user ${userId}: ${existingRule.id}`
      );
      return existingRule;
    }

    const rule = await db.MerchantCategoryRule.create({
      userId,
      categoryId: data.categoryId,
      merchantKeyword: data.merchantKeyword,
    });

    logger.info(`Created merchant rule for user ${userId}: ${rule.id}`);
    return rule;
  } catch (error) {
    logger.error(`Error creating merchant rule for user ${userId}:`, error);
    throw error;
  }
};

export const deleteMerchantRule = async (ruleId: string, userId: string) => {
  try {
    const rule = await db.MerchantCategoryRule.findOne({
      where: { id: ruleId, userId },
    });

    if (!rule) {
      logger.warn(
        `Merchant rule not found or no access (ID: ${ruleId}, User: ${userId})`
      );
      return false;
    }

    await rule.destroy();
    logger.info(`Deleted merchant rule ${ruleId} for user ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting merchant rule ${ruleId}:`, error);
    throw new Error("Не удалось удалить правило.");
  }
};
