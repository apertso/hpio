// backend/src/routes/fileRoutes.ts
import { Router, Request, Response } from "express";
import { protect } from "../middleware/authMiddleware"; // Защита маршрутов
import {
  uploadFile,
  attachFileToPayment,
  getPaymentFileInfo,
  detachFileFromPayment, // Функции для файлов
} from "../services/fileService"; // Сервис файлов
import logger from "../config/logger";
import path from "path";
import { config } from "../config/config";

const router = Router();
router.use(protect);

// --- Маршруты для файлов платежей (обновлены для ясности) ---

// POST /api/files/upload/payment/:paymentId - Загрузка файла для конкретного платежа
router.post(
  "/upload/payment/:paymentId",
  uploadFile,
  async (req: Request, res: Response) => {
    // Переименовал путь для ясности
    if (!req.file) {
      /* ... обработка ошибки Multer ... */ return res.status(400).json({
        message:
          (req as any).fileValidationError?.message || "Файл не был загружен.",
      });
    }

    const userId = req.user!.id;
    const paymentId = req.params.paymentId;

    try {
      // Привязываем загруженный файл к платежу в БД
      const updatedPayment = await attachFileToPayment(
        paymentId,
        userId,
        req.file
      );
      // attachFileToPayment уже обработал ошибки и удалил файл при необходимости
      // Если attachFileToPayment вернул null (платеж не найден), он должен был выбросить ошибку
      // Этот блок unreachable, если attachFileToPayment бросает
      // if (!updatedPayment) { /* ... return 404 ... */ }

      // Возвращаем информацию о прикрепленном файле
      res.status(200).json({
        message: "Файл успешно загружен и прикреплен.",
        file: {
          // Возвращаем данные, которые нужны фронтенду для отображения/ссылки
          filePath: updatedPayment.filePath, // Относительный путь
          fileName: updatedPayment.fileName, // Оригинальное имя
          // TODO: mimeType, size?
        },
      });
    } catch (error: any) {
      logger.error(
        `Error attaching uploaded file to payment ${paymentId}:`,
        error
      );
      res.status(400).json({ message: error.message }); // Сообщение об ошибке из сервиса
    }
  }
);

// GET /api/files/payment/:paymentId - Получение файла платежа (скачивание)
// paymentId используется как идентификатор, связанный с файлом платежа
router.get("/payment/:paymentId", async (req: Request, res: Response) => {
  // Переименовал путь для ясности
  const userId = req.user!.id;
  const paymentId = req.params.paymentId; // paymentId как ID файла в ТЗ

  try {
    const fileInfo = await getPaymentFileInfo(paymentId, userId);

    if (!fileInfo) {
      // getPaymentFileInfo выбрасывает ошибку, если файл не найден в ФС
      // или возвращает null, если платеж не найден / нет прав / нет файла
      return res
        .status(404)
        .json({ message: "Файл не найден или нет прав доступа." });
    }

    // Отправляем файл как скачиваемый ресурс
    res.download(
      fileInfo.fullPath,
      fileInfo.fileName,
      {
        headers: {
          "Content-Type": fileInfo.mimeType || "application/octet-stream",
        },
      },
      (err) => {
        // Добавил headers
        if (err) {
          // Если произошла ошибка при отправке файла (например, файл удален из ФС после проверки access)
          logger.error(`Error sending file ${fileInfo.fullPath}:`, err);
          // Проверяем, не является ли ошибка связана с отсутствием файла
          if ((err as any).code === "ENOENT") {
            res.status(404).json({ message: "Файл не найден на сервере." });
          } else {
            res.status(500).json({ message: "Не удалось скачать файл." });
          }
        }
      }
    );
  } catch (error: any) {
    logger.error(`Error getting payment file ${paymentId}:`, error);
    if (error.message.includes("Файл не найден на сервере")) {
      // Специфическая ошибка из сервиса
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({
        message: error.message || "Ошибка сервера при получении файла.",
      });
    }
  }
});

// DELETE /api/files/payment/:paymentId - Удаление файла из платежа и ФС
router.delete("/payment/:paymentId", async (req: Request, res: Response) => {
  // Переименовал путь для ясности
  const userId = req.user!.id;
  const paymentId = req.params.paymentId;

  try {
    // detachFileFromPayment удалит ссылку из БД и файл из ФС
    const success = await detachFileFromPayment(paymentId, userId);

    if (!success) {
      // detachFileFromPayment возвращает true даже если файла не было
      // Если бы он возвращал null при не найденном платеже:
      // return res.status(404).json({ message: 'Платеж не найден или нет прав доступа.' });
    }

    res.json({ message: "Файл успешно удален.", paymentId: paymentId });
  } catch (error: any) {
    logger.error(`Error deleting file for payment ${paymentId}:`, error);
    res
      .status(500)
      .json({ message: error.message || "Не удалось удалить файл." });
  }
});

// TODO: Маршруты для архива (Часть 17), статистики (Часть 19) и т.д.

export default router;
