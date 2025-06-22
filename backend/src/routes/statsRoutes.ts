import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import { getDashboardStats } from "../services/paymentService"; // Или из statsService, если создали отдельный
import logger from "../config/logger";

const router = Router();

// Все маршруты статистики должны быть защищены
router.use(protect);

// GET /api/stats - Получить статистику для дашборда за указанный период
router.get("/", async (req: Request, res: Response) => {
  try {
    // Получаем startDate и endDate из query параметров
    const { startDate, endDate } = req.query;

    // Проверяем, что параметры являются строками
    if (startDate && typeof startDate !== "string") {
      return res
        .status(400)
        .json({ message: "Параметр startDate должен быть строкой." });
    }
    if (endDate && typeof endDate !== "string") {
      return res
        .status(400)
        .json({ message: "Параметр endDate должен быть строкой." });
    }

    const stats = await getDashboardStats(req.user!.id, startDate, endDate);
    res.json(stats);
  } catch (error: any) {
    logger.error("Error in GET /api/stats:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

// TODO: Добавить эндпоинт для получения статистики за другие периоды, если будет реализовано (см. ТЗ 2.3 фильтры)
// GET /api/stats?period=month&date=YYYY-MM-DD
// GET /api/stats?period=week&date=YYYY-MM-DD
// GET /api/stats?startDate=...&endDate=...

export default router;
