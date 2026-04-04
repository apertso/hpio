import db from "../models";
import { Op } from "sequelize";
import logger from "../config/logger";
import { TagInstance } from "../models/Tag";

export const TagModel = db.Tag;

interface TagData {
  name: string;
}

export const getTags = async (userId: string): Promise<TagInstance[]> => {
  try {
    const tags = await db.Tag.findAll({
      where: { userId: userId },
      order: [["name", "ASC"]],
    });
    logger.info(`Fetched ${tags.length} tags for user ${userId}`);
    return tags as TagInstance[];
  } catch (error: unknown) {
    logger.error(`Error fetching tags for user ${userId}:`, error);
    throw new Error("Не удалось получить список тегов.");
  }
};

export const getTagById = async (
  tagId: string,
  userId: string
): Promise<TagInstance | null> => {
  try {
    const tag = await db.Tag.findOne({
      where: {
        id: tagId,
        userId: userId,
      },
    });

    if (!tag) {
      logger.warn(
        `Tag not found or no access (ID: ${tagId}, User: ${userId})`
      );
      return null;
    }

    logger.info(`Fetched tag details (ID: ${tag.id}, User: ${userId})`);
    return tag as TagInstance;
  } catch (error: unknown) {
    logger.error(`Error fetching tag (ID: ${tagId}, User: ${userId}):`, error);
    throw new Error("Не удалось получить данные тега.");
  }
};

export const createTag = async (
  userId: string,
  tagData: TagData
): Promise<TagInstance> => {
  if (!tagData.name || tagData.name.trim() === "") {
    throw new Error("Название тега обязательно.");
  }
  const tagName = tagData.name.trim();

  try {
    const existingTag = await db.Tag.findOne({
      where: {
        userId: userId,
        name: tagName,
      },
    });
    if (existingTag) {
      throw new Error(`Тег с названием "${tagName}" уже существует.`);
    }

    const tag = await db.Tag.create({
      userId: userId,
      name: tagName,
    });

    logger.info(`Tag created (ID: ${tag.id}, User: ${userId})`);
    return tag as TagInstance;
  } catch (error: unknown) {
    logger.error(`Error creating tag for user ${userId}:`, error);
    const errorName =
      error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name)
        : "";
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "";
    if (errorName === "SequelizeUniqueConstraintError") {
      throw new Error("Тег с таким названием уже существует.");
    }
    throw new Error(errorMessage || "Не удалось создать тег.");
  }
};

export const updateTag = async (
  tagId: string,
  userId: string,
  tagData: Partial<TagData>
): Promise<TagInstance | null> => {
  if (!tagData.name || tagData.name.trim() === "") {
    throw new Error("Название тега обязательно.");
  }
  const newTagName = tagData.name.trim();

  try {
    const tag = await db.Tag.findOne({
      where: {
        id: tagId,
        userId: userId,
      },
    });

    if (!tag) {
      logger.warn(
        `Tag not found for update or no access (ID: ${tagId}, User: ${userId})`
      );
      return null;
    }

    const existingTag = await db.Tag.findOne({
      where: {
        userId: userId,
        name: newTagName,
        id: { [Op.ne]: tagId },
      },
    });
    if (existingTag) {
      throw new Error(`Тег с названием "${newTagName}" уже существует.`);
    }

    await tag.update({
      name: newTagName,
    });

    logger.info(`Tag updated (ID: ${tag.id}, User: ${userId})`);
    return tag as TagInstance;
  } catch (error: unknown) {
    logger.error(`Error updating tag (ID: ${tagId}, User: ${userId}):`, error);
    const errorName =
      error && typeof error === "object" && "name" in error
        ? String((error as { name?: unknown }).name)
        : "";
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "";
    if (errorName === "SequelizeUniqueConstraintError") {
      throw new Error("Тег с таким названием уже существует.");
    }
    throw new Error(errorMessage || "Не удалось обновить тег.");
  }
};

export const deleteTag = async (
  tagId: string,
  userId: string
): Promise<boolean | null> => {
  try {
    const tag = await db.Tag.findOne({
      where: {
        id: tagId,
        userId: userId,
      },
    });

    if (!tag) {
      logger.warn(
        `Tag not found for deletion or no access (ID: ${tagId}, User: ${userId})`
      );
      return null;
    }

    await tag.destroy();

    logger.info(`Tag deleted (ID: ${tag.id}, User: ${userId})`);
    return true;
  } catch (error: unknown) {
    logger.error(`Error deleting tag (ID: ${tagId}, User: ${userId}):`, error);
    const errorMessage =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message)
        : "";
    throw new Error(errorMessage || "Не удалось удалить тег.");
  }
};

export const getTagsByIds = async (
  userId: string,
  tagIds: string[]
): Promise<TagInstance[]> => {
  if (tagIds.length === 0) {
    return [];
  }
  const tags = await db.Tag.findAll({
    where: {
      userId: userId,
      id: { [Op.in]: tagIds },
    },
  });
  return tags as TagInstance[];
};

export const ensureTagsExist = async (
  userId: string,
  tagIds: string[]
): Promise<void> => {
  if (tagIds.length === 0) {
    return;
  }
  const tags = await getTagsByIds(userId, tagIds);
  if (tags.length !== tagIds.length) {
    throw new Error("Некорректные теги.");
  }
};

export const attachPaymentTags = async (
  paymentId: string,
  tagIds: string[]
): Promise<void> => {
  if (tagIds.length === 0) {
    return;
  }
  await db.PaymentTag.bulkCreate(
    tagIds.map((tagId) => ({
      paymentId: paymentId,
      tagId: tagId,
    }))
  );
};

export const replacePaymentTags = async (
  paymentId: string,
  tagIds: string[]
): Promise<void> => {
  await db.PaymentTag.destroy({
    where: {
      paymentId: paymentId,
    },
  });
  if (tagIds.length === 0) {
    return;
  }
  await db.PaymentTag.bulkCreate(
    tagIds.map((tagId) => ({
      paymentId: paymentId,
      tagId: tagId,
    }))
  );
};
