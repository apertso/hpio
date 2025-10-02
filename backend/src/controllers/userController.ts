import { Request, Response } from "express";
import * as authService from "../services/authService";
import logger from "../config/logger";
import path from "path";
import { config } from "../config/appConfig";
import fs from "fs";
import crypto from "crypto";
import { StorageFactory } from "../services/storage/StorageFactory";

// Получить профиль пользователя
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    res.json(user);
  } catch (error: any) {
    logger.error(`Error fetching profile for user ${req.user!.id}:`, error);
    res.status(404).json({ message: error.message });
  }
};

// Легковесный эндпоинт профиля с поддержкой ETag/Last-Modified для условных запросов
export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await authService.getUserProfile(req.user!.id);
    // Сформируем компактный payload (без чувствительных полей)
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
      photoPath: user.photoPath ?? null,
      notificationMethod: user.notificationMethod,
      notificationTime: user.notificationTime,
      timezone: (user as any).timezone,
      updatedAt:
        (user as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };

    const bodyString = JSON.stringify(payload);
    const weakEtag = `W/"${crypto
      .createHash("sha1")
      .update(bodyString)
      .digest("hex")}"`;

    // Устанавливаем заголовки
    res.setHeader("ETag", weakEtag);
    // Используем updatedAt, если доступен, иначе текущее время
    const lastModified =
      (user as any).updatedAt?.toUTCString?.() ?? new Date().toUTCString();
    res.setHeader("Last-Modified", lastModified);

    const inm = req.headers["if-none-match"];
    const ims = req.headers["if-modified-since"];

    const notModifiedByEtag =
      typeof inm === "string" && inm.replace(/^\s+|\s+$/g, "") === weakEtag;
    const notModifiedByTime =
      typeof ims === "string" && new Date(ims) >= new Date(lastModified);

    if (notModifiedByEtag || notModifiedByTime) {
      return res.status(304).end();
    }

    return res.status(200).json(payload);
  } catch (error: any) {
    logger.error(`Error fetching /me for user ${req.user!.id}:`, error);
    res.status(500).json({ message: "Failed to fetch user profile." });
  }
};

// Обновить профиль пользователя
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const updatedUser = await authService.updateUserProfile(
      req.user!.id,
      req.body
    );
    res.json(updatedUser);
  } catch (error: any) {
    logger.error(`Error updating profile for user ${req.user!.id}:`, error);
    res.status(400).json({ message: error.message });
  }
};

// Загрузить фото профиля
export const uploadProfilePhoto = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  try {
    const result = await authService.attachPhotoToUser(req.user!.id, req.file);
    res.status(200).json(result);
  } catch (error: any) {
    logger.error(
      `Error uploading profile photo for user ${req.user!.id}:`,
      error
    );
    res.status(500).json({ message: "Error processing photo upload." });
  }
};

// Получить фото профиля
export const getProfilePhoto = async (req: Request, res: Response) => {
  const storage = StorageFactory.getStorage();

  try {
    const user = await authService.getUserProfile(req.user!.id);
    if (!user || !user.photoPath) {
      return res.status(404).send("Photo not found.");
    }

    const fileExists = await storage.exists(user.photoPath);
    if (!fileExists) {
      logger.warn(`User photo not found in storage: ${user.photoPath}`);
      return res.status(404).send("Photo not found.");
    }

    const downloadResult = await storage.download(user.photoPath);

    res.setHeader("Content-Type", downloadResult.mimeType || "image/jpeg");
    res.send(downloadResult.data);
  } catch (error: any) {
    logger.error(
      `Error getting profile photo for user ${req.user!.id}:`,
      error
    );
    res.status(500).send("Error retrieving photo.");
  }
};

// Удалить аккаунт
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const result = await authService.deleteUserAccount(req.user!.id);
    res.json(result);
  } catch (error: any) {
    logger.error(`Error deleting account for user ${req.user!.id}:`, error);
    res.status(500).json({ message: "Error deleting account." });
  }
};
