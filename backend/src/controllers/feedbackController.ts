import { Request, Response } from "express";
import db from "../models";
import logger from "../config/logger";
import path from "path";
import { config } from "../config/appConfig";
import { StorageFactory } from "../services/storage/StorageFactory";

export const createFeedback = async (req: Request, res: Response) => {
  const storage = StorageFactory.getStorage();

  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { description } = req.body as { description?: string };
    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    let attachmentPath: string | null = null;
    if (req.file && req.file.buffer) {
      // Генерируем уникальное имя файла
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileExtension = path.extname(req.file.originalname);
      const newFileName = `feedback-${uniqueSuffix}${fileExtension}`;

      // Относительный путь
      attachmentPath = ["users", userId, "feedback", newFileName].join("/");

      // Загружаем файл через стратегию
      await storage.upload(attachmentPath, req.file.buffer, req.file.mimetype);
    }

    const feedback = await (db as any).Feedback.create({
      userId,
      description: description.trim(),
      attachmentPath,
    });

    return res.status(201).json({ id: feedback.id });
  } catch (error: any) {
    logger.error("Failed to create feedback", error);
    return res.status(500).json({ message: "Failed to submit feedback" });
  }
};
