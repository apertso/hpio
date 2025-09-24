import { initTracing } from "./config/tracing";
initTracing(); // 👈 MUST BE THE FIRST LINE

import express from "express";
import cors from "cors";
import db from "./models"; // Подключение к БД и инициализация моделей
import { config } from "./config/appConfig";
import apiRoutes from "./routes";
import { setupCronJobs } from "./utils/cronJobs";
import logger from "./config/logger";
import { errorHandler } from "./middleware/errorMiddleware"; // 👈 1. Import the new middleware
import path from "path"; // Для работы с путями файлов

const app = express();

// Middleware
const allowedOrigins = [
  config.frontendUrl || "http://localhost:5173", // Используем URL фронтенда из конфигурации для поддержки разных окружений (dev, prod)
  "tauri://localhost",
  "https://tauri.localhost",
  ...config.allowedOrigins, // Дополнительные источники из переменных окружения
];

app.use(
  cors({
    origin: allowedOrigins, // Поддержка множественных источников, включая Tauri приложения
  })
);
app.use(express.json()); // Для парсинга JSON-тела запросов
app.use(express.urlencoded({ extended: false })); // Для парсинга URL-encoded тел запросов

// TODO: Добавить middleware для валидации данных (например, express-validator)
// TODO: Добавить middleware для ограничения частоты запросов (rate limiting)

// Обслуживание статических файлов (загруженные файлы и иконки)
// !!! ВАЖНО: Этот подход делает файлы ПУБЛИЧНО доступными по URL!
// Для обеспечения безопасности, доступ к файлам должен быть через защищенный API эндпоинт (см. ТЗ 3.3 Безопасность)
// Пример защищенного подхода: GET /api/files/:fileId, который проверяет права пользователя перед отправкой файла.
// Ниже - ПРИМЕР для простоты разработки, НО НЕПРАВИЛЬНО ДЛЯ ПРОДАКШЕНА С ЧУВСТВИТЕЛЬНЫМИ ДАННЫМИ!
// app.use('/uploads', express.static(path.join(__dirname, '..', config.uploadDir)));

// Маршруты API
app.use("/api", apiRoutes);
app.use(errorHandler);

// Тестовый маршрут (не защищенный)
app.get("/", (req, res) => {
  res.send("Payment Service API");
});

// TODO: Добавить обработку ошибок (middleware для обработки ошибок)

const startServer = async () => {
  process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION! 💥", {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("UNHANDLED REJECTION! 💥", {
      reason,
    });
  });

  try {
    // Подключение к базе данных (уже происходит при импорте db)
    await db.sequelize.authenticate();
    logger.info("Database connected!");

    // Запуск Cron задач
    setupCronJobs();

    // Создание папки для загрузок, если она не существует
    // const uploadPath = path.join(__dirname, '..', config.uploadDir);
    // if (!fs.existsSync(uploadPath)) {
    //     fs.mkdirSync(uploadPath, { recursive: true });
    // }
    // TODO: Реализовать создание папок для каждого пользователя/платежа при необходимости

    // Запуск сервера
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    // process.exit(1); // Остановка приложения при ошибке запуска
  }
};

startServer();
