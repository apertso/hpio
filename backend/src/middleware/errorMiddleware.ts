import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || res.statusCode || 500;

  // Логируем полную информацию об ошибке на уровне 'error'
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    statusCode: statusCode,
  });

  // Отправляем клиенту стандартизированный ответ
  res.status(statusCode).json({
    message:
      process.env.NODE_ENV === "production" && statusCode === 500
        ? "На сервере произошла непредвиденная ошибка."
        : err.message,
    // В режиме разработки можно отправлять и стек вызовов для отладки
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
