import { Request, Response } from "express";
import * as authService from "../services/authService";
import logger from "../config/logger";
import path from "path";
import { config } from "../config/appConfig";
import fs from "fs";

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
  try {
    const user = await authService.getUserProfile(req.user!.id);
    if (!user || !user.photoPath) {
      return res.status(404).send("Photo not found.");
    }
    const photoFullPath = path.resolve(config.uploadDir, user.photoPath);

    if (fs.existsSync(photoFullPath)) {
      res.sendFile(photoFullPath);
    } else {
      logger.warn(`User photo not found on disk: ${photoFullPath}`);
      res.status(404).send("Photo not found.");
    }
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
