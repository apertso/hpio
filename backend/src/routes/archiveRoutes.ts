import { Router, Request, Response } from "express";
import { ParsedQs } from "qs";
import { protect } from "../middleware/authMiddleware";
import {
  getArchivedPayments,
  restorePayment,
  permanentDeletePayment,
  clearTrash,
  PaymentFilterParams,
} from "../services/paymentService"; // Функции для архива из paymentService
import logger from "../config/logger";

const router = Router();

// Все маршруты архива должны быть защищены
router.use(protect);

type QueryParam = string | ParsedQs | (string | ParsedQs)[] | undefined;

const normalizeQueryParam = (value: QueryParam): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return typeof value === "string" ? value : undefined;
};

// GET /api/archive - Получить список платежей из архива
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, search, categoryId, isRecurring, hasFile } = req.query;
    const filterParams: PaymentFilterParams = {
      status: normalizeQueryParam(status),
      search: normalizeQueryParam(search),
      categoryId: normalizeQueryParam(categoryId),
      isRecurring: normalizeQueryParam(isRecurring) as
        | "true"
        | "false"
        | undefined,
      hasFile: normalizeQueryParam(hasFile) as "true" | "false" | undefined,
    };
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
    const { reactivateSeries } = req.body;
    const restoredPayment = await restorePayment(req.params.id, req.user!.id, {
      reactivateSeries,
    });
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

// DELETE /api/archive/trash - очистка корзины
router.delete("/trash", async (req: Request, res: Response) => {
  try {
    const deletedCount = await clearTrash(req.user!.id);
    res.json({ message: "Корзина очищена.", deletedCount });
  } catch (error: any) {
    logger.error(`Error in DELETE /api/archive/trash:`, error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

export default router;
