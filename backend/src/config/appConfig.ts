import dotenv from "dotenv";
import path from "path";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "supersecret", // Используйте надежный секрет из .env
  jwtPasswordResetSecret:
    process.env.JWT_RESET_SECRET || "anotherSuperSecretForPasswordReset", // Секрет для токена сброса пароля
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [], // Дополнительные разрешенные источники
  defaultTimezone: process.env.TZ || "UTC",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "payment_service",
    dialect: process.env.DB_DIALECT || "postgres",
    schema: process.env.DB_SCHEMA || "dbo",
    dialectOptions: undefined,
    logging: false, // Установите true для логирования SQL запросов (полезно при отладке)
  },
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads"),
  storage: {
    type: process.env.STORAGE_TYPE || "local", // 'local' или 'bunny'
    bunny: {
      apiKey: process.env.BUNNY_STORAGE_API_KEY || "",
      storageZone: process.env.BUNNY_STORAGE_ZONE || "",
      region: process.env.BUNNY_STORAGE_REGION || "", // de, ny, la, sg, etc.
      cdnHostname: process.env.BUNNY_CDN_HOSTNAME || "",
    },
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_SECURE !== "false",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    fromName: process.env.SMTP_FROM_NAME,
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },
  fluentBit: {
    host: process.env.FLUENT_BIT_HOST,
    port: parseInt(process.env.FLUENT_BIT_PORT || "24224", 10),
    timeout: 3.0,
  },
};
