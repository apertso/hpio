// backend/src/services/fileService.ts
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { config } from "../config/config";
import db from "../models";
import logger from "../config/logger";
import { Request } from "express";
import { Op } from "sequelize"; // Импорт Op для Sequelize операторов

// --- Настройки для файлов платежей (уже есть) ---
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

const getUploadPathFile = (userId: string, paymentId: string) => {
  return path.join(config.uploadDir, "users", userId, "payments", paymentId);
};

const storageFile = multer.diskStorage({
  destination: async (req: Request, file, cb) => {
    const userId = (req as any).user?.id;
    const paymentId = req.params.paymentId;

    if (!userId || !paymentId) {
      return cb(
        new Error("User ID or Payment ID is missing for file upload."),
        ""
      );
    }

    const uploadPath = getUploadPathFile(userId, paymentId);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error: any) {
      logger.error("Error creating upload directory for file:", error);
      cb(new Error("Не удалось создать папку для загрузки файла."), "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const newFileName = `paymentFile-${uniqueSuffix}${fileExtension}`; // Имя файла платежа

    cb(null, newFileName);
  },
});

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
}).single("paymentFile"); // Имя поля для файла платежа

// --- Настройки для фото профиля пользователя ---
const allowedMimeTypesUserPhoto = ["image/jpeg", "image/png", "image/webp"];
const maxFileSizeUserPhoto = 2 * 1024 * 1024; // 2 МБ

const storageUserPhoto = multer.diskStorage({
  destination: async (req: Request, file, cb) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return cb(new Error("User ID is missing for photo upload."), "");
    }
    // Фото профиля хранятся в отдельной папке
    const uploadPath = path.join(config.uploadDir, "users", userId, "profile");
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error: any) {
      logger.error("Error creating upload directory for user photo:", error);
      cb(new Error("Не удалось создать папку для загрузки фото."), "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const newFileName = `profile-${uniqueSuffix}${fileExtension}`;
    cb(null, newFileName);
  },
});

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
}).single("userPhoto"); // Имя поля для фото профиля

// --- Сервисные функции для работы с файлами платежей ---

// Функция для привязки загруженного файла к платежу в БД
const attachFileToPayment = async (
  paymentId: string,
  userId: string,
  file: Express.Multer.File
) => {
  try {
    // Находим платеж, чтобы убедиться, что он принадлежит пользователю
    const payment = await db.Payment.findOne({
      where: { id: paymentId, userId: userId },
    });

    if (!payment) {
      // Если платеж не найден, удаляем загруженный файл
      await deleteFileFromFS(userId, paymentId, file.filename).catch(
        (fsError) => {
          logger.error(
            `Failed to cleanup uploaded file ${file.filename} for non-existent payment:`,
            fsError
          );
        }
      );
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
        // filePath хранится относительно uploadDir. Находим имя файла.
        const parts = payment.filePath.split(path.sep);
        const filenameInFS = parts[parts.length - 1]; // Последняя часть пути - имя файла
        // Вызываем удаление конкретного файла
        await deleteFileFromFS(userId, paymentId, filenameInFS).catch(
          (unlinkError) => {
            logger.error(
              `Failed to delete old file ${payment.filePath} for payment ${paymentId}:`,
              unlinkError
            );
          }
        );
      } catch (parseError) {
        logger.error(
          `Failed to parse old filePath ${payment.filePath} for deletion:`,
          parseError
        );
      }
    }

    // Сохраняем путь к файлу и оригинальное имя в полях платежа
    // Путь относительный от корневой папки загрузок
    const relativePath = path.join(
      "users",
      userId,
      "payments",
      paymentId,
      file.filename
    );

    await payment.update({
      filePath: relativePath, // Сохраняем относительный путь
      fileName: file.originalname, // Сохраняем оригинальное имя файла
    });

    logger.info(
      `File '${file.originalname}' attached to payment ${paymentId}. Stored as ${file.filename}`
    );
    return payment; // Возвращаем обновленный платеж
  } catch (error: any) {
    logger.error(`Error attaching file to payment ${paymentId}:`, error);
    // Если ошибка произошла после загрузки файла, нужно его удалить
    if (file?.filename) {
      await deleteFileFromFS(userId, paymentId, file.filename).catch(
        (fsError) => {
          logger.error(
            `Failed to cleanup newly uploaded file ${file.filename} after database error:`,
            fsError
          );
        }
      );
    }
    throw new Error("Не удалось прикрепить файл к платежу.");
  }
};

// Функция для получения полного пути к файлу по относительному пути и проверки прав
const getPaymentFileInfo = async (paymentId: string, userId: string) => {
  try {
    // Находим платеж, чтобы убедиться, что пользователь имеет к нему доступ и у платежа есть файл
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Проверка прав
        filePath: { [Op.ne]: null }, // Путь должен быть заполнен
      },
      attributes: ["id", "userId", "filePath", "fileName"], // Выбираем только нужные поля
    });

    if (!(payment && payment.filePath && payment.fileName)) {
      logger.warn(
        `File not found or no access for payment ${paymentId}, user ${userId}`
      );
      return null; // Файл не найден или нет прав
    }

    const { filePath, fileName } = payment;
    const fullPath = path.join(config.uploadDir, filePath);

    // Проверяем, что файл существует в файловой системе
    try {
      await fs.access(fullPath); // Проверяем доступность файла
    } catch (fsError: any) {
      logger.error(
        `File not found in FS despite DB record: ${fullPath}`,
        fsError
      );
      // TODO: Возможно, пометить запись в БД как некорректную
      throw new Error("Файл не найден на сервере.");
    }

    // Возвращаем путь к файлу, оригинальное имя и mime-тип для отправки
    // TODO: Определить mime-тип файла по расширению или из Multer file.mimetype при загрузке
    // Для простоты пока используем универсальный mime-тип или определим по расширению
    const mimeType =
      allowedMimeTypesFiles.find((type) =>
        type.includes(path.extname(fileName).toLowerCase().replace(".", ""))
      ) || "application/octet-stream";

    return {
      fullPath,
      fileName, // Оригинальное имя файла для скачивания
      mimeType,
    };
  } catch (error: any) {
    logger.error(`Error getting payment file ${paymentId}:`, error);
    if (error.message.includes("Файл не найден на сервере")) {
      throw error; // Пробрасываем специфическую ошибку 404
    }
    throw new Error(error.message || "Ошибка сервера при получении файла.");
  }
};

// Функция для удаления файла из файловой системы И из БД платежа
const detachFileFromPayment = async (paymentId: string, userId: string) => {
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
      // Возвращаем true, если файла не было - это не ошибка удаления
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

    // Удаляем файл из файловой системы после успешного обновления БД
    if (filePathToDelete) {
      // Извлекаем paymentId и filename из относительного пути для deleteFileFromFS
      // Относительный путь: users/[user_id]/payments/[payment_id]/[filename]
      const parts = filePathToDelete.split(path.sep);
      if (
        parts.length >= 5 &&
        parts[0] === "users" &&
        parts[2] === "payments" &&
        parts[3] === paymentId
      ) {
        const fileUserId = parts[1]; // Получаем userId из пути к файлу
        const filenameInFS = parts[4]; // Получаем имя файла в ФС
        // Вызываем удаление конкретного файла
        await deleteFileFromFS(fileUserId, paymentId, filenameInFS).catch(
          (fsError) => {
            logger.error(
              `Failed to delete file from FS after detaching from payment ${paymentId}:`,
              fsError
            );
          }
        );
      } else {
        logger.error(
          `Could not parse filePath ${filePathToDelete} to delete file from FS for payment ${paymentId}.`
        );
      }
    }

    return true; // Успешное удаление файла
  } catch (error: any) {
    logger.error(`Error detaching file from payment ${paymentId}:`, error);
    throw new Error("Не удалось открепить файл от платежа.");
  }
};

// Функция для удаления файла или папки платежа из файловой системы
// Если filename не указан, удаляет всю папку платежа.
const deleteFileFromFS = async (
  userId: string,
  paymentId: string,
  filename?: string
) => {
  const basePath = path.join(
    config.uploadDir,
    "users",
    userId,
    "payments",
    paymentId
  );
  const targetPath = filename ? path.join(basePath, filename) : basePath;

  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      // Удаляем папку рекурсивно
      await fs.rm(targetPath, { recursive: true, force: true });
      logger.info(`Directory deleted successfully: ${targetPath}`);
    } else {
      // Удаляем файл
      await fs.unlink(targetPath);
      logger.info(`File deleted successfully: ${targetPath}`);
    }
  } catch (error: any) {
    // Игнорируем ошибку, если файл/папка не существует
    if (error.code === "ENOENT") {
      logger.warn(
        `Attempted to delete non-existent file or directory: ${targetPath}`
      );
    } else {
      logger.error(`Error deleting file or directory ${targetPath}:`, error);
      throw error; // Перебрасываем другие ошибки
    }
  }
};

// Экспортируем upload middleware и сервисные функции
export {
  uploadFile, // Для файлов платежей
  uploadUserPhoto, // <-- ADD THIS
  attachFileToPayment,
  getPaymentFileInfo,
  detachFileFromPayment,
  deleteFileFromFS, // Экспортируем для использования в других сервисах (например, permanentDeletePayment)
};
