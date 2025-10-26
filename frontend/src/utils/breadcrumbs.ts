import { logBreadcrumb } from "./fileLogger";

/**
 * Записывает breadcrumb для отслеживания действий пользователя
 */
export function trackBreadcrumb(
  action: string,
  details?: Record<string, any>
): void {
  logBreadcrumb(action, details);
}

/**
 * Автоматическое отслеживание навигации
 */
export function trackNavigation(path: string): void {
  trackBreadcrumb("navigation", { to: path });
}

/**
 * Отслеживание кликов по кнопкам и ссылкам
 */
export function trackClick(
  elementName: string,
  details?: Record<string, any>
): void {
  trackBreadcrumb("click", { element: elementName, ...details });
}

/**
 * Отслеживание отправки форм
 */
export function trackFormSubmit(
  formName: string,
  details?: Record<string, any>
): void {
  trackBreadcrumb("form_submit", { form: formName, ...details });
}

/**
 * Отслеживание API запросов
 */
export function trackApiRequest(
  method: string,
  url: string,
  status?: number
): void {
  trackBreadcrumb("api_request", { method, url, status });
}

/**
 * Отслеживание ошибок API
 */
export function trackApiError(
  method: string,
  url: string,
  error: string
): void {
  trackBreadcrumb("api_error", { method, url, error });
}
