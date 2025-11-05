import { logStructuredError } from "./fileLogger";
import logger from "./logger";

let isInitialized = false;

/**
 * Инициализация глобальных обработчиков ошибок JavaScript
 */
export function initializeErrorHandlers(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Обработка синхронных ошибок JavaScript
  window.addEventListener("error", (event: ErrorEvent) => {
    const error = event.error || new Error(event.message);

    logger.error("Uncaught error:", error);

    logStructuredError("JS_ERROR", error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Не предотвращаем дефолтное поведение, чтобы ошибка попала в консоль
  });

  // Обработка необработанных Promise rejection
  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      logger.error("Unhandled promise rejection:", error);

      logStructuredError("JS_UNHANDLED_PROMISE", error, {
        reason: event.reason,
      });

      // Не предотвращаем дефолтное поведение
    }
  );

  logger.info("Global error handlers initialized");
}

/**
 * Ручная запись ошибки в лог (для использования в try-catch блоках)
 */
export function logError(
  error: Error | string,
  context?: Record<string, unknown>
): void {
  const err = error instanceof Error ? error : new Error(error);
  logger.error("Manual error log:", err, context);
  logStructuredError("JS_ERROR", err, context);
}
