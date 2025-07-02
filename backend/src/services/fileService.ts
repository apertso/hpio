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

// --- Настройки для пользовательских иконок ---
const allowedMimeTypesIcons = ["image/svg+xml"];
const maxFileSizeIcon = 0.5 * 1024 * 1024; // 0.5 МБ (500 КБ)

const storageIcon = multer.diskStorage({
  destination: async (req: Request, file, cb) => {
    const userId = (req as any).user?.id;
    const paymentId = req.params.paymentId; // Ожидаем paymentId в параметрах пути

    if (!userId || !paymentId) {
      return cb(
        new Error("User ID or Payment ID is missing for icon upload."),
        ""
      );
    }

    const uploadPath = getUploadPathFile(userId, paymentId); // Используем тот же путь, что и для файлов

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath); // Путь для сохранения файла
    } catch (error: any) {
      logger.error("Error creating upload directory for icon:", error);
      cb(new Error("Не удалось создать папку для загрузки иконки."), "");
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const newFileName = `icon-${uniqueSuffix}${path
      .extname(file.originalname)
      .toLowerCase()}`; // Имя файла иконки

    // TODO: Возможно, проверить, что файл действительно SVG и безопасен (например, нет вредоносного JS)
    // Это важно для безопасности, т.к. SVG может содержать исполняемый код при просмотре в браузере.
    // Простая проверка MIME-типа и размера - это минимум. Более строгая: парсинг XML.

    cb(null, newFileName);
  },
});

const fileFilterIcon = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Проверяем MIME-тип (только SVG)
  if (!allowedMimeTypesIcons.includes(file.mimetype)) {
    logger.warn(`Icon upload rejected: Invalid mime type ${file.mimetype}`);
    return cb(new Error("Недопустимый тип иконки. Разрешен только SVG."));
  }

  // Проверка размера уже есть в limits

  cb(null, true);
};

const uploadIcon = multer({
  storage: storageIcon,
  limits: { fileSize: maxFileSizeIcon }, // Ограничение размера для иконки
  fileFilter: fileFilterIcon,
}).single("paymentIcon"); // Имя поля для иконки платежа

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

// --- Сервисные функции для работы с иконками ---

// Функция для привязки загруженной пользовательской иконки к платежу в БД
// Вызывается после успешной загрузки файла через Multer
const attachIconToPayment = async (
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
      // Если платеж не найден, удаляем загруженную иконку
      await deleteFileFromFS(userId, paymentId, file.filename).catch(
        (fsError) => {
          logger.error(
            `Failed to cleanup uploaded icon file ${file.filename} for non-existent payment:`,
            fsError
          );
        }
      );
      logger.warn(
        `Attempted to attach icon to non-existent or unauthorized payment (ID: ${paymentId}, User: ${userId})`
      );
      throw new Error("Платеж не найден или нет прав доступа.");
    }

    // Если у платежа уже была прикреплена пользовательская иконка, удаляем ее перед прикреплением новой
    if (payment.iconType === "custom" && payment.iconPath) {
      logger.info(
        `Deleting old custom icon for payment ${paymentId}: ${payment.iconPath}`
      );
      try {
        // iconPath хранится относительно uploadDir. Находим имя файла.
        const parts = payment.iconPath.split(path.sep);
        const filenameInFS = parts[parts.length - 1]; // Последняя часть пути - имя файла
        // Вызываем удаление конкретного файла иконки
        await deleteFileFromFS(userId, paymentId, filenameInFS).catch(
          (unlinkError) => {
            logger.error(
              `Failed to delete old icon file ${payment.iconPath} for payment ${paymentId}:`,
              unlinkError
            );
          }
        );
      } catch (parseError) {
        logger.error(
          `Failed to parse old iconPath ${payment.iconPath} for deletion:`,
          parseError
        );
      }
    }

    // Сохраняем путь к иконке и тип в полях платежа
    // Путь относительный от корневой папки загрузок
    const relativePath = path.join(
      "users",
      userId,
      "payments",
      paymentId,
      file.filename
    );

    await payment.update({
      iconPath: relativePath, // Сохраняем относительный путь к пользовательской иконке
      iconType: "custom", // Указываем тип иконки
      builtinIconName: null, // Сбрасываем имя встроенной иконки, если было
    });

    logger.info(
      `Custom icon '${file.originalname}' attached to payment ${paymentId}. Stored as ${file.filename}`
    );
    return payment; // Возвращаем обновленный платеж
  } catch (error: any) {
    logger.error(`Error attaching icon to payment ${paymentId}:`, error);
    // Если ошибка произошла после загрузки файла, нужно его удалить
    if (file?.filename) {
      await deleteFileFromFS(userId, paymentId, file.filename).catch(
        (fsError) => {
          logger.error(
            `Failed to cleanup newly uploaded icon file ${file.filename} after database error:`,
            fsError
          );
        }
      );
    }
    throw new Error("Не удалось прикрепить иконку к платежу.");
  }
};

// Функция для получения полного пути к иконке по относительному пути
const getFullIconPath = (relativePath: string) => {
  return path.join(config.uploadDir, relativePath);
};

// Функция для безопасной проверки доступа и получения информации о пользовательской иконке платежа
const getPaymentIconInfo = async (paymentId: string, userId: string) => {
  // fileId в ТЗ для файлов, но для иконок, вероятно, тоже нужен способ получить иконку платежа.
  // Эндпоинт может быть GET /api/icons/:paymentId. В этом случае ID в пути - paymentId.

  try {
    // Находим платеж, чтобы убедиться, что пользователь имеет к нему доступ и у платежа есть *пользовательская* иконка
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Проверка прав
        iconType: "custom", // Только пользовательские иконки
        iconPath: { [Op.ne]: null }, // Путь должен быть заполнен
      },
      attributes: ["id", "userId", "iconPath"], // Выбираем только нужные поля
    });

    if (!(payment && payment.iconPath)) {
      logger.warn(
        `Custom icon not found or no access for payment ${paymentId}, user ${userId}`
      );
      // Важно: Если иконка встроенная, возвращаем null или специальный статус, но не 404, если запрос на custom icon
      // Если нужно получить любую иконку (и встроенную тоже), логика будет сложнее
      throw new Error("Пользовательская иконка не найдена."); // Указываем, что не найдена именно пользовательская иконка
    }

    const fullPath = getFullIconPath(payment.iconPath);

    // Проверяем, что файл иконки существует в файловой системе
    try {
      await fs.access(fullPath); // Проверяем доступность файла
    } catch (fsError: any) {
      logger.error(
        `Icon file not found in FS despite DB record: ${fullPath}`,
        fsError
      );
      // TODO: Возможно, пометить запись в БД как некорректную
      throw new Error("Файл иконки не найден на сервере.");
    }

    // Возвращаем путь к файлу и его mime-тип для отправки
    return {
      fullPath: fullPath,
      mimeType: "image/svg+xml", // SVG mime type
      // Оригинальное имя файла иконки, возможно, не хранится, используем генерированное имя из пути
      // fileName: path.basename(fullPath) // Имя файла в ФС
    };
  } catch (error: any) {
    logger.error(`Error getting payment icon ${paymentId}:`, error);
    if (error.message.includes("Пользовательская иконка не найдена")) {
      throw error; // Пробрасываем специфическую ошибку 404
    }
    throw new Error(error.message || "Ошибка сервера при получении иконки.");
  }
};

// Функция для удаления пользовательской иконки из файловой системы И из БД платежа
// Отличается от detachFileFromPayment тем, что она специфична для иконок и сбрасывает поля иконки в БД.
const detachIconFromPayment = async (paymentId: string, userId: string) => {
  try {
    // Находим платеж, убеждаемся, что он принадлежит пользователю и имеет *пользовательскую* иконку
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId,
        iconType: "custom", // Удаляем только пользовательскую иконку
        iconPath: { [Op.ne]: null },
      },
    });

    if (!payment) {
      logger.warn(
        `Custom icon not found for detaching or no access (ID: ${paymentId}, User: ${userId})`
      );
      // Возвращаем true, если иконки не было или она не пользовательская - это не ошибка удаления
      return true; // Успех, т.к. нужной иконки для удаления не нашлось
    }

    // Получаем путь к файлу иконки перед сбросом
    const iconPathToDelete = payment.iconPath;

    // Сбрасываем поля иконки в БД
    await payment.update({
      iconPath: null,
      iconType: null,
      builtinIconName: null, // Сбрасываем и имя встроенной иконки на всякий случай
    });

    logger.info(`Detached custom icon from payment ${paymentId} in DB.`);

    // Удаляем файл иконки из файловой системы после успешного обновления БД
    if (iconPathToDelete) {
      // Извлекаем paymentId и filename из относительного пути для deleteFileFromFS
      // Относительный путь: users/[user_id]/payments/[payment_id]/[filename]
      const parts = iconPathToDelete.split(path.sep);
      if (
        parts.length >= 5 &&
        parts[0] === "users" &&
        parts[2] === "payments" &&
        parts[3] === paymentId
      ) {
        const iconUserId = parts[1]; // Получаем userId из пути к файлу
        const filenameInFS = parts[4]; // Получаем имя файла в ФS
        // Вызываем удаление конкретного файла (для иконок)
        // Переиспользуем deleteFileFromFS
        await deleteFileFromFS(iconUserId, paymentId, filenameInFS).catch(
          (fsError) => {
            logger.error(
              `Failed to delete icon file from FS after detaching from payment ${paymentId}:`,
              fsError
            );
          }
        );
      } else {
        logger.error(
          `Could not parse iconPath ${iconPathToDelete} to delete icon file from FS for payment ${paymentId}.`
        );
      }
    }

    return true; // Успешное удаление иконки
  } catch (error: any) {
    logger.error(`Error detaching icon from payment ${paymentId}:`, error);
    throw new Error("Не удалось открепить иконку от платежа.");
  }
};

// TODO: Реализовать логику удаления ВСЕХ файлов иконок платежа при перманентном удалении платежа (Часть 17)
// Эта логика будет вызываться из permanentDeletePayment. deleteFileFromFS с filename=undefined уже умеет удалять папку.
// Нужно просто убедиться, что permanentDeletePayment вызывает deleteFileFromFS(userId, paymentId).

// Экспортируем upload middleware и сервисные функции
export {
  uploadFile, // Для файлов платежей
  uploadIcon, // Для иконок платежей
  uploadUserPhoto, // <-- ADD THIS
  attachFileToPayment,
  getPaymentFileInfo,
  detachFileFromPayment,
  attachIconToPayment,
  getPaymentIconInfo,
  detachIconFromPayment,
  deleteFileFromFS, // Экспортируем для использования в других сервисах (например, permanentDeletePayment)
};
