import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getPendingSuggestions,
  createSuggestion,
  acceptSuggestion,
  dismissSuggestion,
  bulkCreateSuggestions,
} from "../services/suggestionService";
import logger from "../config/logger";

const router = Router();

router.use(protect);

router.get("/", async (req: Request, res: Response) => {
  try {
    const suggestions = await getPendingSuggestions(req.user!.id);
    res.json(suggestions);
  } catch (error: any) {
    logger.error("Error in GET /api/suggestions:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const newSuggestion = await createSuggestion(req.user!.id, req.body);
    res.status(201).json(newSuggestion);
  } catch (error: any) {
    logger.error("Error in POST /api/suggestions:", error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const suggestions = await bulkCreateSuggestions(
      req.user!.id,
      req.body.suggestions
    );
    res.status(201).json(suggestions);
  } catch (error: any) {
    logger.error("Error in POST /api/suggestions/bulk:", error);
    res.status(400).json({ message: error.message });
  }
});

router.post("/:id/accept", async (req: Request, res: Response) => {
  try {
    const suggestion = await acceptSuggestion(req.params.id, req.user!.id);
    if (!suggestion) {
      return res
        .status(404)
        .json({ message: "Предложение не найдено или нет прав доступа." });
    }
    res.json(suggestion);
  } catch (error: any) {
    logger.error(
      `Error in POST /api/suggestions/${req.params.id}/accept:`,
      error
    );
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

router.post("/:id/dismiss", async (req: Request, res: Response) => {
  try {
    const suggestion = await dismissSuggestion(req.params.id, req.user!.id);
    if (!suggestion) {
      return res
        .status(404)
        .json({ message: "Предложение не найдено или нет прав доступа." });
    }
    res.json(suggestion);
  } catch (error: any) {
    logger.error(
      `Error in POST /api/suggestions/${req.params.id}/dismiss:`,
      error
    );
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

export default router;
