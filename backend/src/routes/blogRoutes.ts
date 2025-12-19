import { Router, Request, Response } from "express";
import { getPostBySlug, getPublishedPosts } from "../services/blogPostService";
import logger from "../config/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const posts = await getPublishedPosts();
    res.json(posts);
  } catch (error: any) {
    logger.error("Error in GET /api/blog:", error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const post = await getPostBySlug(req.params.slug);
    if (!post) {
      return res.status(404).json({ message: "Статья не найдена." });
    }
    res.json(post);
  } catch (error: any) {
    logger.error(`Error in GET /api/blog/${req.params.slug}:`, error);
    res.status(500).json({ message: "Ошибка сервера", error: error.message });
  }
});

export default router;


