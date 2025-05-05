import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import { getDashboardStats } from "../services/paymentService"; // Или из statsService, если создали отдельный
import logger from "../config/logger";

const router = Router();

// Все маршруты статистики должны быть защищены
router.use(protect);

// GET /api/stats/current-month - Получить статистику для дашборда за текущий месяц
router.get("/current-month", async (req: Request, res: Response) => {
  try {
    const stats = await getDashboardStats(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    logger.error("Error in GET /api/stats/current-month:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// TODO: Добавить эндпоинт для получения статистики за другие периоды, если будет реализовано (см. ТЗ 2.3 фильтры)
// GET /api/stats?period=month&date=YYYY-MM-DD
// GET /api/stats?period=week&date=YYYY-MM-DD
// GET /api/stats?startDate=...&endDate=...

export default router;
