// backend/src/services/categoryService.ts
import db from "../models"; // Доступ к моделям Category, Payment
import { Op } from "sequelize";
import logger from "../config/logger";
// Импорт типов моделей, если нужно

interface CategoryData {
  name: string;
  // iconName?: string; // Если добавлены в модель
  // color?: string;
}

// Получить все категории пользователя
export const getCategories = async (userId: string) => {
  try {
    const categories = await db.Category.findAll({
      where: { userId: userId },
      order: [["name", "ASC"]], // Сортировка по имени
    });
    logger.info(`Fetched ${categories.length} categories for user ${userId}`);
    return categories;
  } catch (error) {
    logger.error(`Error fetching categories for user ${userId}:`, error);
    throw new Error("Не удалось получить список категорий.");
  }
};

// Получить категорию по ID
export const getCategoryById = async (categoryId: string, userId: string) => {
  try {
    const category = await db.Category.findOne({
      where: {
        id: categoryId,
        userId: userId, // Проверка прав собственности
      },
    });

    if (!category) {
      logger.warn(
        `Category not found or no access (ID: ${categoryId}, User: ${userId})`
      );
      return null;
    }

    logger.info(
      `Fetched category details (ID: ${category.id}, User: ${userId})`
    );
    return category;
  } catch (error) {
    logger.error(
      `Error fetching category (ID: ${categoryId}, User: ${userId}):`,
      error
    );
    throw new Error("Не удалось получить детали категории.");
  }
};

// Создать новую категорию
export const createCategory = async (
  userId: string,
  categoryData: CategoryData
) => {
  // Валидация
  if (!categoryData.name || categoryData.name.trim() === "") {
    throw new Error("Название категории обязательно.");
  }
  const categoryName = categoryData.name.trim();

  try {
    // Проверка на уникальность имени категории для данного пользователя (индекс в БД уже есть, но явная проверка улучшает UX)
    const existingCategory = await db.Category.findOne({
      where: {
        userId: userId,
        name: categoryName,
      },
    });
    if (existingCategory) {
      throw new Error(
        `Категория с названием "${categoryName}" уже существует.`
      );
    }

    const category = await db.Category.create({
      userId: userId,
      name: categoryName,
      // ... другие поля ...
    });

    logger.info(`Category created (ID: ${category.id}, User: ${userId})`);
    return category;
  } catch (error: any) {
    logger.error(`Error creating category for user ${userId}:`, error);
    // Проверяем, не является ли ошибка уникальности из БД
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new Error(`Категория с таким названием уже существует.`);
    }
    throw new Error(error.message || "Не удалось создать категорию.");
  }
};

// Обновить категорию
export const updateCategory = async (
  categoryId: string,
  userId: string,
  categoryData: Partial<CategoryData>
) => {
  // Валидация
  if (!categoryData.name || categoryData.name.trim() === "") {
    throw new Error("Название категории обязательно.");
  }
  const newCategoryName = categoryData.name.trim();

  try {
    // Находим категорию, убеждаемся, что она принадлежит пользователю
    const category = await db.Category.findOne({
      where: {
        id: categoryId,
        userId: userId,
      },
    });

    if (!category) {
      logger.warn(
        `Category not found for update or no access (ID: ${categoryId}, User: ${userId})`
      );
      return null;
    }

    // Проверка на уникальность нового имени (исключая текущую категорию)
    const existingCategory = await db.Category.findOne({
      where: {
        userId: userId,
        name: newCategoryName,
        id: { [Op.ne]: categoryId }, // Исключаем текущую категорию
      },
    });
    if (existingCategory) {
      throw new Error(
        `Категория с названием "${newCategoryName}" уже существует.`
      );
    }

    await category.update({
      name: newCategoryName,
      // ... другие поля ...
    });

    logger.info(`Category updated (ID: ${category.id}, User: ${userId})`);
    return category;
  } catch (error: any) {
    logger.error(
      `Error updating category (ID: ${categoryId}, User: ${userId}):`,
      error
    );
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new Error(`Категория с таким названием уже существует.`);
    }
    throw new Error(error.message || "Не удалось обновить категорию.");
  }
};

// Удалить категорию
export const deleteCategory = async (categoryId: string, userId: string) => {
  try {
    // Находим категорию, убеждаемся, что она принадлежит пользователю
    const category = await db.Category.findOne({
      where: {
        id: categoryId,
        userId: userId,
      },
    });

    if (!category) {
      logger.warn(
        `Category not found for deletion or no access (ID: ${categoryId}, User: ${userId})`
      );
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

    logger.info(`Category deleted (ID: ${category.id}, User: ${userId})`);
    return true; // Возвращаем true при успешном удалении
  } catch (error: any) {
    logger.error(
      `Error deleting category (ID: ${categoryId}, User: ${userId}):`,
      error
    );
    // Если ошибка связана с ограничениями (например, если мы запретили удаление при наличии платежей)
    if (error.message.includes("Нельзя удалить категорию")) {
      throw error; // Пробрасываем бизнес-ошибку
    }
    throw new Error(error.message || "Не удалось удалить категорию.");
  }
};
