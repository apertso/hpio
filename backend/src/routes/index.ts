import { Router } from "express";
import authRoutes from "./authRoutes";
import paymentRoutes from "./paymentRoutes";
import categoryRoutes from "./categoryRoutes"; // !!! Импорт маршрутов категорий
import fileRoutes from "./fileRoutes";
import archiveRoutes from "./archiveRoutes"; // !!! Импорт маршрутов архива
import statsRoutes from "./statsRoutes"; // !!! Импорт маршрутов статистики
import seriesRoutes from "./seriesRoutes"; // Import recurring series routes
import userRoutes from "./userRoutes"; // <-- ADD THIS
import feedbackRoutes from "./feedbackRoutes";
import suggestionRoutes from "./suggestionRoutes";
import merchantRuleRoutes from "./merchantRuleRoutes";
import notificationRoutes from "./notificationRoutes";
import blogRoutes from "./blogRoutes";
import cardRoutes from "./cardRoutes";
import incomeRoutes from "./incomeRoutes";
import cryptoRoutes from "./cryptoRoutes";
import tagRoutes from "./tagRoutes";
import cashRoutes from "./cashRoutes";
import fundsRoutes from "./fundsRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/cards", cardRoutes);
router.use("/incomes", incomeRoutes);
router.use("/crypto", cryptoRoutes);
router.use("/cash", cashRoutes);
router.use("/funds", fundsRoutes);
router.use("/payments", paymentRoutes);
router.use("/categories", categoryRoutes); // !!! Использование маршрутов категорий
router.use("/tags", tagRoutes);
router.use("/files", fileRoutes); // Используйте маршруты файлов
router.use("/archive", archiveRoutes); // !!! Использование маршрутов архива
router.use("/stats", statsRoutes); // !!! Использование маршрутов статистики
router.use("/series", seriesRoutes); // Use recurring series routes
router.use("/user", userRoutes);
router.use("/feedback", feedbackRoutes);
router.use("/suggestions", suggestionRoutes);
router.use("/merchant-rules", merchantRuleRoutes);
router.use("/notifications", notificationRoutes);
router.use("/blog", blogRoutes);
// Используйте другие маршруты:

export default router;
