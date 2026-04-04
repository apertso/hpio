import db from "../models";
import logger from "../config/logger";
import { getCategoryById } from "./categoryService";
import { MerchantCategoryRuleInstance } from "../models/MerchantCategoryRule";
import { updatePaymentsCategoryByMerchant } from "./paymentService";

interface MerchantRuleData {
  categoryId: string;
  merchantKeyword: string;
}

export const getMerchantRules = async (): Promise<
  MerchantCategoryRuleInstance[]
> => {
  try {
    const rules = await db.MerchantCategoryRule.findAll({
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "builtinIconName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    logger.info(`Fetched ${rules.length} merchant rules`);
    return rules;
  } catch (error) {
    logger.error("Error fetching merchant rules:", error);
    throw new Error("Не удалось получить список правил.");
  }
};

export const findRuleByMerchant = async (
  merchantKeyword: string
): Promise<MerchantCategoryRuleInstance | null> => {
  try {
    const rule = await db.MerchantCategoryRule.findOne({
      where: { merchantKeyword },
      include: [
        {
          model: db.TransactionCategory,
          as: "transactionCategory",
          attributes: ["id", "name", "builtinIconName"],
        },
      ],
    });
    return rule;
  } catch (error) {
    logger.error(
      `Error finding rule for merchant ${merchantKeyword}:`,
      error
    );
    throw new Error("Не удалось найти правило.");
  }
};

export const createMerchantRule = async (
  data: MerchantRuleData
): Promise<MerchantCategoryRuleInstance> => {
  try {
    const category = await getCategoryById(data.categoryId);

    if (!category) {
      throw new Error("Категория не найдена или нет прав доступа.");
    }

    const existingRule = await db.MerchantCategoryRule.findOne({
      where: { merchantKeyword: data.merchantKeyword },
    });

    if (existingRule) {
      existingRule.categoryId = data.categoryId;
      await existingRule.save();
      logger.info(
        `Updated existing merchant rule: ${existingRule.id}`
      );
      await updatePaymentsCategoryByMerchant(
        data.merchantKeyword,
        data.categoryId
      );
      return existingRule;
    }

    const rule = await db.MerchantCategoryRule.create({
      categoryId: data.categoryId,
      merchantKeyword: data.merchantKeyword,
    });

    await updatePaymentsCategoryByMerchant(
      data.merchantKeyword,
      data.categoryId
    );
    logger.info(`Created merchant rule: ${rule.id}`);
    return rule;
  } catch (error) {
    logger.error("Error creating merchant rule:", error);
    throw error;
  }
};

export const deleteMerchantRule = async (
  ruleId: string
): Promise<boolean> => {
  try {
    const rule = await db.MerchantCategoryRule.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      logger.warn(`Merchant rule not found (ID: ${ruleId})`);
      return false;
    }

    await rule.destroy();
    logger.info(`Deleted merchant rule ${ruleId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting merchant rule ${ruleId}:`, error);
    throw new Error("Не удалось удалить правило.");
  }
};
