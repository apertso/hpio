// src/utils/pageBackgrounds.ts

import { isTauriMobile } from "./platform";

/**
 * Определяет дополнительные классы фона для страницы на основе маршрута и условий
 * @param pathname - текущий путь
 * @returns строка с классами Tailwind для фона страницы
 */
export function getPageBackgroundClasses(pathname: string): string {
  // Для мобильной лендинг-страницы применяем dark:bg-gray-900
  if (pathname === "/" && isTauriMobile()) {
    return "dark:bg-gray-900";
  }

  // Для других страниц возвращаем пустую строку (используется фон по умолчанию)
  return "";
}
