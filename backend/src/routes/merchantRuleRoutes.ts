import { Router, Request, Response, NextFunction } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getMerchantRules,
  findRuleByMerchant,
  createMerchantRule,
  deleteMerchantRule,
} from "../services/merchantRuleService";
import { getUncategorizedAutoCreatedMerchants } from "../services/paymentService";
import logger from "../config/logger";

const router = Router();

router.use(protect);

const ensureAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Доступ запрещен" });
  }
  return next();
};

router.get("/", ensureAdmin, async (req: Request, res: Response) => {
  try {
    const rules = await getMerchantRules();
    res.json(rules);
  } catch (error: any) {
    logger.error("Error in GET /api/merchant-rules:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

router.get("/unassigned", ensureAdmin, async (_req: Request, res: Response) => {
  try {
    const merchants = await getUncategorizedAutoCreatedMerchants();
    res.json(merchants);
  } catch (error: any) {
    logger.error("Error in GET /api/merchant-rules/unassigned:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

router.get("/find", async (req: Request, res: Response) => {
  try {
    const { merchant } = req.query;
    if (!merchant || typeof merchant !== "string") {
      return res.status(400).json({ message: "Параметр merchant обязателен." });
    }

    const rule = await findRuleByMerchant(merchant);
    if (!rule) {
      return res.status(404).json({ message: "Правило не найдено." });
    }
    res.json(rule);
  } catch (error: any) {
    logger.error("Error in GET /api/merchant-rules/find:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

router.post("/", ensureAdmin, async (req: Request, res: Response) => {
  try {
    const newRule = await createMerchantRule(req.body);
    res.status(201).json(newRule);
  } catch (error: any) {
    logger.error("Error in POST /api/merchant-rules:", error);
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", ensureAdmin, async (req: Request, res: Response) => {
  try {
    const success = await deleteMerchantRule(req.params.id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Правило не найдено или нет прав доступа." });
    }
    res.json({ message: "Правило успешно удалено.", id: req.params.id });
  } catch (error: any) {
    logger.error(
      `Error in DELETE /api/merchant-rules/${req.params.id}:`,
      error
    );
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

export default router;
