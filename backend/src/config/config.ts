import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "supersecret", // Используйте надежный секрет из .env
  jwtPasswordResetSecret:
    process.env.JWT_RESET_SECRET || "anotherSuperSecretForPasswordReset", // Секрет для токена сброса пароля
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "1433", 10),
    username: process.env.DB_USER || "SA",
    password: process.env.DB_PASSWORD || "YourStrong!Password",
    database: process.env.DB_NAME || "PaymentServiceDB",
    dialect: "mssql",
    dialectOptions: {
      options: {
        trustedConnection: false, // Установите true, если используете Windows Authentication
        encrypt: false, // Установите true, если используете SSL/TLS (рекомендуется в продакшене)
        enableArithAbort: true, // Рекомендуется для MS SQL
      },
    },
    logging: false, // Установите true для логирования SQL запросов (полезно при отладке)
  },
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  mailerSend: {
    apiKey: process.env.MAILERSEND_API_TOKEN || "",
    senderEmail: process.env.MAILER_SENDER_EMAIL || "test@test.com",
    senderName: process.env.MAILER_SENDER_NAME || "Хочу Плачу",
  },
};
