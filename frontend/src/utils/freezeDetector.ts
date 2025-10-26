import { logStructuredError } from "./fileLogger";
import logger from "./logger";

const HEARTBEAT_INTERVAL = 5000; // Проверка каждые 5 секунд
const FREEZE_THRESHOLD = 10000; // Считаем зависанием если UI не отвечает 10+ секунд

let lastHeartbeat = Date.now();
let heartbeatInterval: number | null = null;
let checkInterval: number | null = null;

/**
 * Обновление времени последнего heartbeat
 */
function updateHeartbeat(): void {
  lastHeartbeat = Date.now();
}

/**
 * Проверка на зависание UI
 */
function checkForFreeze(): void {
  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeat;

  if (timeSinceLastHeartbeat > FREEZE_THRESHOLD) {
    logger.error(
      `UI freeze detected: ${timeSinceLastHeartbeat}ms since last heartbeat`
    );

    logStructuredError(
      "UI_FREEZE",
      `UI was frozen for ${timeSinceLastHeartbeat}ms`,
      {
        duration: timeSinceLastHeartbeat,
        threshold: FREEZE_THRESHOLD,
      }
    );

    // Сброс счетчика после обнаружения зависания
    updateHeartbeat();
  }
}

/**
 * Инициализация детектора зависаний UI
 */
export function initializeFreezeDetector(): void {
  if (heartbeatInterval !== null) return;

  // Основной heartbeat в UI thread
  heartbeatInterval = window.setInterval(() => {
    updateHeartbeat();
  }, HEARTBEAT_INTERVAL);

  // Проверка в отдельном таймере
  checkInterval = window.setInterval(() => {
    checkForFreeze();
  }, HEARTBEAT_INTERVAL);

  logger.info("Freeze detector initialized");
}

/**
 * Остановка детектора зависаний
 */
export function stopFreezeDetector(): void {
  if (heartbeatInterval !== null) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (checkInterval !== null) {
    clearInterval(checkInterval);
    checkInterval = null;
  }

  logger.info("Freeze detector stopped");
}
