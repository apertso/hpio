import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getArchivedPayments,
  restorePayment,
  permanentDeletePayment,
} from "../services/paymentService"; // Функции для архива из paymentService
import logger from "../config/logger";

const router = Router();

// Все маршруты архива должны быть защищены
router.use(protect);

// GET /api/archive - Получить список платежей из архива
router.get("/", async (req: Request, res: Response) => {
  try {
    // req.query могут содержать параметры фильтрации/сортировки для архива
    const filterParams = req.query;
    const archivedPayments = await getArchivedPayments(
      req.user!.id,
      filterParams
    );
    res.json(archivedPayments);
  } catch (error: any) {
    logger.error("Error in GET /api/archive:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// PUT /api/archive/:id/restore - Восстановить платеж из архива
router.put("/:id/restore", async (req: Request, res: Response) => {
  try {
    const restoredPayment = await restorePayment(req.params.id, req.user!.id);
    if (!restoredPayment) {
      return res
        .status(404)
        .json({ message: "Платеж не найден в архиве или нет прав доступа." });
    }
    res.json({
      message: "Платеж успешно восстановлен.",
      payment: restoredPayment,
    });
  } catch (error: any) {
    logger.error(`Error in PUT /api/archive/${req.params.id}/restore:`, error);
    res.status(400).json({ message: error.message }); // 400 для ошибок логики (например, уже не в архиве - хотя restorePayment это обрабатывает)
  }
});

// DELETE /api/archive/:id/permanent - Полностью (перманентно) удалить платеж из архива
router.delete("/:id/permanent", async (req: Request, res: Response) => {
  try {
    const success = await permanentDeletePayment(req.params.id, req.user!.id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Платеж не найден в архиве или нет прав доступа." });
    }
    res.json({ message: "Платеж полностью удален.", id: req.params.id });
  } catch (error: any) {
    logger.error(
      `Error in DELETE /api/archive/${req.params.id}/permanent:`,
      error
    );
    // Возвращаем 400, если ошибка бизнес-логики (например, нельзя удалить родительскую серию)
    if (error.message.includes("Нельзя удалить категорию")) {
      // Пример обработки специфической ошибки
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Ошибка сервера", error: error.message });
    }
  }
});

export default router;
