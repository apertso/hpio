// backend/src/services/fileService.ts
import multer from "multer";
import path from "path";
import { config } from "../config/appConfig";
import db from "../models";
import logger from "../config/logger";
import { Request } from "express";
import { Op } from "sequelize";
import { StorageFactory } from "./storage/StorageFactory";

// --- Настройки для файлов платежей ---
const allowedMimeTypesFiles = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const maxFileSizeFile = 5 * 1024 * 1024; // 5 МБ

const storageFile = multer.memoryStorage();

const fileFilterFile = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!allowedMimeTypesFiles.includes(file.mimetype)) {
    logger.warn(`File upload rejected: Invalid mime type ${file.mimetype}`);
    return cb(new Error("Недопустимый тип файла."));
  }
  cb(null, true);
};

const uploadFile = multer({
  storage: storageFile,
  limits: { fileSize: maxFileSizeFile },
  fileFilter: fileFilterFile,
}).single("paymentFile");

// --- Настройки для фото профиля пользователя ---
const allowedMimeTypesUserPhoto = ["image/jpeg", "image/png", "image/webp"];
const maxFileSizeUserPhoto = 2 * 1024 * 1024; // 2 МБ

const storageUserPhoto = multer.memoryStorage();

const fileFilterUserPhoto = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!allowedMimeTypesUserPhoto.includes(file.mimetype)) {
    logger.warn(
      `User photo upload rejected: Invalid mime type ${file.mimetype}`
    );
    return cb(new Error("Недопустимый тип файла. Разрешены JPEG, PNG, WEBP."));
  }
  cb(null, true);
};

const uploadUserPhoto = multer({
  storage: storageUserPhoto,
  limits: { fileSize: maxFileSizeUserPhoto },
  fileFilter: fileFilterUserPhoto,
}).single("userPhoto");

// --- Настройки для вложений обратной связи ---
const maxFileSizeFeedback = 5 * 1024 * 1024; // 5 МБ

const storageFeedback = multer.memoryStorage();

const uploadFeedbackAttachment = multer({
  storage: storageFeedback,
  limits: { fileSize: maxFileSizeFeedback },
}).single("attachment");

// --- Вспомогательная функция для генерации относительного пути ---
const getRelativePath = (
  userId: string,
  type: "payments" | "profile" | "feedback",
  entityId?: string,
  filename?: string
): string => {
  const parts = ["users", userId, type];
  if (entityId) parts.push(entityId);
  if (filename) parts.push(filename);
  return parts.join("/");
};

// --- Функция для генерации уникального имени файла ---
const generateFileName = (
  prefix: string,
  originalExtension: string
): string => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${prefix}-${uniqueSuffix}${originalExtension}`;
};

// --- Сервисные функции для работы с файлами платежей ---

// Функция для привязки загруженного файла к платежу в БД
const attachFileToPayment = async (
  paymentId: string,
  userId: string,
  file: Express.Multer.File
) => {
  const storage = StorageFactory.getStorage();

  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю
    const payment = await db.Payment.findOne({
      where: { id: paymentId, userId: userId },
    });

    if (!payment) {
      logger.warn(
        `Attempted to attach file to non-existent or unauthorized payment (ID: ${paymentId}, User: ${userId})`
      );
      throw new Error("Платеж не найден или нет прав доступа.");
    }

    // Если у платежа уже был прикреплен файл, удаляем его перед прикреплением нового
    if (payment.filePath) {
      logger.info(
        `Deleting old file for payment ${paymentId}: ${payment.filePath}`
      );
      try {
        await storage.delete(payment.filePath);
      } catch (deleteError) {
        logger.error(
          `Failed to delete old file ${payment.filePath} for payment ${paymentId}:`,
          deleteError
        );
      }
    }

    // Генерируем уникальное имя файла
    const fileExtension = path.extname(file.originalname);
    const newFileName = generateFileName("paymentFile", fileExtension);

    // Формируем относительный путь
    const relativePath = getRelativePath(
      userId,
      "payments",
      paymentId,
      newFileName
    );

    // Загружаем файл через стратегию
    await storage.upload(relativePath, file.buffer, file.mimetype);

    // Декодируем оригинальное имя файла
    const utf8Name = Buffer.from(file.originalname, "latin1").toString("utf8");

    // Обновляем платеж в БД
    await payment.update({
      filePath: relativePath,
      fileName: utf8Name,
    });

    logger.info(
      `File '${utf8Name}' attached to payment ${paymentId}. Stored as ${newFileName}`
    );
    return payment;
  } catch (error: any) {
    logger.error(`Error attaching file to payment ${paymentId}:`, error);
    throw new Error("Не удалось прикрепить файл к платежу.");
  }
};

// Функция для получения полного пути к файлу по относительному пути и проверки прав
const getPaymentFileInfo = async (paymentId: string, userId: string) => {
  const storage = StorageFactory.getStorage();

  try {
    // Находим платеж, чтобы убедиться, что пользователь имеет к нему доступ и у платежа есть файл
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        filePath: { [Op.ne]: null },
      },
      attributes: ["id", "userId", "filePath", "fileName"],
    });

    if (!(payment && payment.filePath && payment.fileName)) {
      logger.warn(
        `File not found or no access for payment ${paymentId}, user ${userId}`
      );
      return null;
    }

    const { filePath, fileName } = payment;

    // Проверяем, что файл существует в хранилище
    const fileExists = await storage.exists(filePath);
    if (!fileExists) {
      logger.error(`File not found in storage despite DB record: ${filePath}`);
      throw new Error("Файл не найден на сервере.");
    }

    // Загружаем файл из хранилища
    const downloadResult = await storage.download(filePath);

    // Определяем mime-тип
    const mimeType =
      downloadResult.mimeType ||
      allowedMimeTypesFiles.find((type) =>
        type.includes(path.extname(fileName).toLowerCase().replace(".", ""))
      ) ||
      "application/octet-stream";

    return {
      data: downloadResult.data,
      fileName,
      mimeType,
    };
  } catch (error: any) {
    logger.error(`Error getting payment file ${paymentId}:`, error);
    if (error.message.includes("Файл не найден")) {
      throw error;
    }
    throw new Error(error.message || "Ошибка сервера при получении файла.");
  }
};

// Функция для удаления файла из файловой системы И из БД платежа
const detachFileFromPayment = async (paymentId: string, userId: string) => {
  const storage = StorageFactory.getStorage();

  try {
    // Находим платеж, убеждаемся, что он принадлежит пользователю и имеет файл
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        filePath: { [Op.ne]: null },
      },
    });

    if (!payment) {
      logger.warn(
        `File not found for detaching or no access (ID: ${paymentId}, User: ${userId})`
      );
      return true;
    }

    // Получаем путь к файлу перед сбросом
    const filePathToDelete = payment.filePath;

    // Сбрасываем поля файла в БД
    await payment.update({
      filePath: null,
      fileName: null,
    });

    logger.info(`Detached file from payment ${paymentId} in DB.`);

    // Удаляем файл из хранилища после успешного обновления БД
    if (filePathToDelete) {
      try {
        await storage.delete(filePathToDelete);
      } catch (deleteError) {
        logger.error(
          `Failed to delete file from storage after detaching from payment ${paymentId}:`,
          deleteError
        );
      }
    }

    return true;
  } catch (error: any) {
    logger.error(`Error detaching file from payment ${paymentId}:`, error);
    throw new Error("Не удалось открепить файл от платежа.");
  }
};

// Функция для удаления файла или папки платежа из хранилища
const deleteFileFromFS = async (
  userId: string,
  paymentId: string,
  filename?: string
) => {
  const storage = StorageFactory.getStorage();
  const relativePath = filename
    ? getRelativePath(userId, "payments", paymentId, filename)
    : getRelativePath(userId, "payments", paymentId);

  try {
    await storage.delete(relativePath);
    logger.info(`File/directory deleted successfully: ${relativePath}`);
  } catch (error: any) {
    logger.error(`Error deleting file or directory ${relativePath}:`, error);
    throw error;
  }
};

// Экспортируем upload middleware и сервисные функции
export {
  uploadFile,
  uploadUserPhoto,
  uploadFeedbackAttachment,
  attachFileToPayment,
  getPaymentFileInfo,
  detachFileFromPayment,
  deleteFileFromFS,
};
