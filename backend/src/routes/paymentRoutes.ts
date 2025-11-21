/// <reference path="../types/express.d.ts" />
import { Router, Response, Request } from "express";
import { ParsedQs } from "qs";
import { protect } from "../middleware/authMiddleware";
import {
  getUpcomingPayments,
  getFilteredPayments,
  PaymentFilterParams,
  createPayment,
  getPaymentById,
  updatePayment,
  deletePayment, // Логическое удаление
  completePayment,
  permanentDeletePaymentAutoCreated, // Безвозвратное удаление для autoCreated платежей
  // TODO: Импортировать getArchivedPayments, restorePayment, permanentDeletePayment (Часть 17)
} from "../services/paymentService";
import logger from "../config/logger";

const router = Router();

// Все маршруты платежей должны быть защищены
router.use(protect);

// GET /api/payments/upcoming - Получить активные предстоящие платежи для ленты (2.2)
router.get("/upcoming", async (req: Request, res: Response) => {
  try {
    let days = 10; // Значение по умолчанию
    if (req.query.days && typeof req.query.days === "string") {
      const parsedDays = parseInt(req.query.days, 10);
      if (!isNaN(parsedDays) && parsedDays > 0) {
        days = parsedDays;
      }
    }
    // req.user.id добавлен middleware protect
    const payments = await getUpcomingPayments(req.user!.id, days);
    res.json(payments);
  } catch (error: any) {
    logger.error("Error in GET /api/payments/upcoming:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// GET /api/payments/list - Получить полный список платежей с фильтрацией (2.3)
// Принимает параметры запроса для фильтрации, сортировки, пагинации (пока базовая фильтрация по статусу)
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

router.get("/list", async (req: Request, res: Response) => {
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
      hasFile: normalizeQueryParam(hasFile) as
        | "true"
        | "false"
        | undefined,
    };
    const payments = await getFilteredPayments(req.user!.id, filterParams);
    res.json(payments);
  } catch (error: any) {
    logger.error("Error in GET /api/payments/list:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// POST /api/payments - Создать платеж (2.2)
router.post("/", async (req: Request, res: Response) => {
  // TODO: Добавить валидацию входящих данных req.body перед вызовом сервиса
  try {
    const newPayment = await createPayment(req.user!.id, req.body);
    res.status(201).json(newPayment);
  } catch (error: any) {
    logger.error("Error in POST /api/payments:", error);
    // Возвращаем 400 для ошибок валидации или бизнес-логики из сервиса
    res.status(400).json({ message: error.message });
  }
});

// GET /api/payments/:id - Получить детали платежа (2.2)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const payment = await getPaymentById(req.params.id, req.user!.id);
    if (!payment) {
      return res
        .status(404)
        .json({ message: "Платеж не найден или нет прав доступа." });
    }
    res.json(payment);
  } catch (error: any) {
    logger.error(`Error in GET /api/payments/${req.params.id}:`, error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// PUT /api/payments/:id - Редактировать платеж (2.2)
router.put("/:id", async (req: Request, res: Response) => {
  // TODO: Добавить валидацию входящих данных req.body
  try {
    // updatePayment возвращает null, если платеж не найден или нет прав
    const updatedPayment = await updatePayment(
      req.params.id,
      req.user!.id,
      req.body
    );
    if (!updatedPayment) {
      return res
        .status(404)
        .json({ message: "Платеж не найден или нет прав доступа." });
    }
    res.json(updatedPayment);
  } catch (error: any) {
    logger.error(`Error in PUT /api/payments/${req.params.id}:`, error);
    res.status(400).json({ message: error.message }); // 400 для ошибок валидации/логики
  }
});

// PUT /api/payments/:id/complete - Отметить платеж как выполненный (2.2, 2.7)
router.put("/:id/complete", async (req: Request, res: Response) => {
  try {
    const { completionDate } = req.body;
    const completedPayment = await completePayment(
      req.params.id,
      req.user!.id,
      completionDate
    );
    if (!completedPayment) {
      return res.status(404).json({
        message: "Платеж не найден, нет прав или его нельзя завершить.",
      });
    }
    res.json(completedPayment);
  } catch (error: any) {
    logger.error(
      `Error in PUT /api/payments/${req.params.id}/complete:`,
      error
    );
    res.status(400).json({ message: error.message }); // 400 для ошибок логики (например, уже завершен)
  }
});

// DELETE /api/payments/:id - Удалить платеж (логически, статус 'deleted') (2.2, 2.7)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deletedPayment = await deletePayment(req.params.id, req.user!.id);
    if (!deletedPayment) {
      // 404, если не найден, или 400, если нельзя удалить в текущем статусе
      return res.status(404).json({
        message: "Платеж не найден, нет прав доступа или уже удален.",
      });
    }
    // Возвращаем статус 200 или 204 (No Content) при успешном удалении. 200 с объектом удаленного - тоже ок.
    res.json({
      message: "Платеж помещен в архив (статус удален)",
      id: req.params.id,
    });
  } catch (error: any) {
    logger.error(`Error in DELETE /api/payments/${req.params.id}:`, error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// DELETE /api/payments/:id/permanent - Безвозвратное удаление autoCreated платежа (например, когда пользователь отменяет авто-добавление)
router.delete("/:id/permanent", async (req: Request, res: Response) => {
  try {
    const result = await permanentDeletePaymentAutoCreated(
      req.params.id,
      req.user!.id
    );
    if (!result) {
      return res.status(404).json({
        message:
          "Платеж не найден, нет прав доступа или платеж не может быть безвозвратно удален.",
      });
    }
    res.json({
      message: "Платеж безвозвратно удален",
      id: req.params.id,
    });
  } catch (error: any) {
    logger.error(
      `Error in DELETE /api/payments/${req.params.id}/permanent:`,
      error
    );
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// TODO: Добавить маршруты для Архива (Часть 17)
// GET /api/archive
// PUT /api/archive/:id/restore
// DELETE /api/archive/:id/permanent

// TODO: Добавить маршруты для Категорий (Часть 9)
// /api/categories

// TODO: Добавить маршруты для Файлов (Часть 11)
// /api/files/upload
// /api/files/:fileId

// TODO: Добавить маршруты для Иконок (Часть 13)
// /api/icons/upload
// /api/icons/:iconId

// TODO: Добавить маршруты для Статистики (Часть 19)
// /api/stats/current-month

// TODO: Добавить маршруты для Уведомлений
// /api/notifications

// TODO: Добавить маршруты для Настроек пользователя
// /api/user/settings

export default router;
