// backend/src/routes/categoryRoutes.ts
import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/categoryService";
import logger from "../config/logger";

const router = Router();

// Все маршруты категорий должны быть защищены
router.use(protect);

// GET /api/categories - Получить все категории пользователя
router.get("/", async (req: Request, res: Response) => {
  try {
    const categories = await getCategories(req.user!.id);
    res.json(categories);
  } catch (error: any) {
    logger.error("Error in GET /api/categories:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// GET /api/categories/:id - Получить категорию по ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const category = await getCategoryById(req.params.id, req.user!.id);
    if (!category) {
      return res
        .status(404)
        .json({ message: "Категория не найдена или нет прав доступа." });
    }
    res.json(category);
  } catch (error: any) {
    logger.error(`Error in GET /api/categories/${req.params.id}:`, error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// POST /api/categories - Создать новую категорию
router.post("/", async (req: Request, res: Response) => {
  // TODO: Добавить валидацию req.body (проверка наличия name)
  try {
    const newCategory = await createCategory(req.user!.id, req.body);
    res.status(201).json(newCategory);
  } catch (error: any) {
    logger.error("Error in POST /api/categories:", error);
    res.status(400).json({ message: error.message }); // 400 для ошибок валидации или бизнес-логики
  }
});

// PUT /api/categories/:id - Обновить категорию
router.put("/:id", async (req: Request, res: Response) => {
  // TODO: Добавить валидацию req.body (проверка наличия name)
  try {
    const updatedCategory = await updateCategory(
      req.params.id,
      req.user!.id,
      req.body
    );
    if (!updatedCategory) {
      return res
        .status(404)
        .json({ message: "Категория не найдена или нет прав доступа." });
    }
    res.json(updatedCategory);
  } catch (error: any) {
    logger.error(`Error in PUT /api/categories/${req.params.id}:`, error);
    res.status(400).json({ message: error.message }); // 400 для ошибок валидации или бизнес-логики
  }
});

// DELETE /api/categories/:id - Удалить категорию
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const success = await deleteCategory(req.params.id, req.user!.id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Категория не найдена или нет прав доступа." });
    }
    res.json({ message: "Категория успешно удалена.", id: req.params.id });
  } catch (error: any) {
    logger.error(`Error in DELETE /api/categories/${req.params.id}:`, error);
    // Возвращаем 400, если ошибка бизнес-логики (например, нельзя удалить категорию с привязанными платежами)
    if (error.message.includes("Нельзя удалить категорию")) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  }
});

export default router;
