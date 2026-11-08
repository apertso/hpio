// backend/src/services/categoryService.ts
import db from "../models";
import { Op } from "sequelize";
import logger from "../config/logger";
import { TransactionCategoryInstance } from "../models/TransactionCategory";
// Импорт типов моделей, если нужно

interface CategoryData {
  name: string;
  nameEn: string;
  builtinIconName?: string;
}

function requireCategoryName(value: string | undefined, message: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new Error(message);
  }
  return trimmed;
}

function duplicateCategoryMessage(error: {
  original?: { constraint?: string };
  parent?: { constraint?: string };
}): string {
  const constraint = error.original?.constraint ?? error.parent?.constraint;
  return constraint === "transactionCategoryNameEnUnique"
    ? "Категория с таким английским названием уже существует."
    : "Категория с таким названием уже существует.";
}

// Получить все категории пользователя
export const getCategories = async (): Promise<
  TransactionCategoryInstance[]
> => {
  try {
    const categories = await db.TransactionCategory.findAll({
      order: [["name", "ASC"]],
    });

    logger.info(`Fetched ${categories.length} transaction categories`);
    return categories;
  } catch (error) {
    logger.error("Error fetching transaction categories:", error);
    throw new Error("Не удалось получить список категорий.");
  }
};

// Получить категорию по ID
export const getCategoryById = async (
  categoryId: string
): Promise<TransactionCategoryInstance | null> => {
  try {
    const category = await db.TransactionCategory.findOne({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      logger.warn(`Category not found (ID: ${categoryId})`);
      return null;
    }

    logger.info(`Fetched category details (ID: ${category.id})`);
    return category;
  } catch (error) {
    logger.error(`Error fetching category (ID: ${categoryId}):`, error);
    throw new Error("Не удалось получить детали категории.");
  }
};

// Создать новую категорию
export const createCategory = async (
  categoryData: CategoryData
): Promise<TransactionCategoryInstance> => {
  const categoryName = requireCategoryName(
    categoryData.name,
    "Название категории обязательно."
  );
  const categoryNameEn = requireCategoryName(
    categoryData.nameEn,
    "Английское название категории обязательно."
  );

  try {
    const existingCategory = await db.TransactionCategory.findOne({
      where: {
        [Op.or]: [{ name: categoryName }, { nameEn: categoryNameEn }],
      },
    });
    if (existingCategory) {
      throw new Error(
        existingCategory.nameEn === categoryNameEn
          ? "Категория с таким английским названием уже существует."
          : "Категория с таким названием уже существует."
      );
    }
    const category = await db.TransactionCategory.create({
      name: categoryName,
      nameEn: categoryNameEn,
      builtinIconName: categoryData.builtinIconName || null,
    });

    logger.info(`Category created (ID: ${category.id})`);
    return category;
  } catch (error: any) {
    logger.error("Error creating category:", error);
    // Проверяем, не является ли ошибка уникальности из БД
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new Error(duplicateCategoryMessage(error));
    }
    throw new Error(error.message || "Не удалось создать категорию.");
  }
};

// Обновить категорию
export const updateCategory = async (
  categoryId: string,
  categoryData: Partial<CategoryData>
): Promise<TransactionCategoryInstance | null> => {
  const newCategoryName = requireCategoryName(
    categoryData.name,
    "Название категории обязательно."
  );
  const newCategoryNameEn = requireCategoryName(
    categoryData.nameEn,
    "Английское название категории обязательно."
  );

  try {
    const category = await db.TransactionCategory.findOne({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      logger.warn(`Category not found for update (ID: ${categoryId})`);
      return null;
    }

    // Проверка на уникальность нового имени (исключая текущую категорию)
    const existingCategory = await db.TransactionCategory.findOne({
      where: {
        [Op.or]: [{ name: newCategoryName }, { nameEn: newCategoryNameEn }],
        id: { [Op.ne]: categoryId },
      },
    });
    if (existingCategory) {
      throw new Error(
        existingCategory.nameEn === newCategoryNameEn
          ? "Категория с таким английским названием уже существует."
          : "Категория с таким названием уже существует."
      );
    }

    await category.update({
      name: newCategoryName,
      nameEn: newCategoryNameEn,
      builtinIconName: categoryData.builtinIconName,
    });

    logger.info(`Category updated (ID: ${category.id})`);
    return category;
  } catch (error: any) {
    logger.error(`Error updating category (ID: ${categoryId}):`, error);
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new Error(duplicateCategoryMessage(error));
    }
    throw new Error(error.message || "Не удалось обновить категорию.");
  }
};

// Удалить категорию
export const deleteCategory = async (
  categoryId: string
): Promise<boolean | null> => {
  try {
    const category = await db.TransactionCategory.findOne({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      logger.warn(`Category not found for deletion (ID: ${categoryId})`);
      return null;
    }

    // При удалении категории, благодаря ассоциации Payment.belongsTo с onDelete: 'SET NULL',
    // все платежи, которые ссылались на эту категорию, будут иметь categoryId = NULL.
    // Sequelize сам позаботится об этом при вызове category.destroy().

    // Опционально: Проверить, есть ли связанные платежи и, возможно, запретить удаление,
    // если есть связанные платежи, пока они не будут отвязаны (или потребовать подтверждения).
    // В нашем ТЗ сказано "При удалении категории необходимо предусмотреть обработку связанных платежей (например, отвязка категории или запрос на выбор другой)".
    // Наш подход "SET NULL" соответствует "отвязке". Если нужно запретить удаление при наличии платежей:
    // const paymentCount = await db.Payment.count({ where: { categoryId: categoryId } });
    // if (paymentCount > 0) {
    //     throw new Error(`Нельзя удалить категорию "${category.name}", пока есть связанные платежи (${paymentCount}).`);
    // }

    await category.destroy();

    logger.info(`Category deleted (ID: ${category.id})`);
    return true; // Возвращаем true при успешном удалении
  } catch (error: any) {
    logger.error(`Error deleting category (ID: ${categoryId}):`, error);
    // Если ошибка связана с ограничениями (например, если мы запретили удаление при наличии платежей)
    if (error.message.includes("Нельзя удалить категорию")) {
      throw error; // Пробрасываем бизнес-ошибку
    }
    throw new Error(error.message || "Не удалось удалить категорию.");
  }
};
