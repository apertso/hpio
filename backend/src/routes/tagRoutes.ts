import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
} from "../services/tagService";
import logger from "../config/logger";

const router = Router();

router.use(protect);

router.get("/", async (req: Request, res: Response) => {
  try {
    const tags = await getTags(req.user!.id);
    res.json(tags);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error in GET /api/tags:", error);
    res.status(500).json({ message: "Ошибка запроса", error: message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tag = await getTagById(req.params.id, req.user!.id);
    if (!tag) {
      return res
        .status(404)
        .json({ message: "Тег не найден или у вас нет доступа." });
    }
    res.json(tag);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error in GET /api/tags/${req.params.id}:`, error);
    res.status(500).json({ message: "Ошибка запроса", error: message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const newTag = await createTag(req.user!.id, req.body);
    res.status(201).json(newTag);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Error in POST /api/tags:", error);
    res.status(400).json({ message: message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const updatedTag = await updateTag(req.params.id, req.user!.id, req.body);
    if (!updatedTag) {
      return res
        .status(404)
        .json({ message: "Тег не найден или у вас нет доступа." });
    }
    res.json(updatedTag);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error in PUT /api/tags/${req.params.id}:`, error);
    res.status(400).json({ message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const success = await deleteTag(req.params.id, req.user!.id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Тег не найден или у вас нет доступа." });
    }
    res.json({ message: "Тег успешно удален.", id: req.params.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error in DELETE /api/tags/${req.params.id}:`, error);
    res.status(500).json({ message: "Ошибка запроса", error: message });
  }
});

export default router;
