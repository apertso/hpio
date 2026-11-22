// src/utils/routeBack.ts
import { splitLocalePath } from "../i18n/localePath";

/**
 * Что сделать по кнопке «Назад», когда поверх страницы нет открытых слоёв:
 * - `history` — вернуться на предыдущую запись истории приложения;
 * - `navigate` — перейти на родительский экран (с заменой текущей записи);
 * - `exit` — это корневой экран, приложение сворачивается.
 */
export type RouteBackAction =
  | { type: "history" }
  | { type: "navigate"; to: string }
  | { type: "exit" };

/** Корневой экран авторизованного приложения. */
export const APP_HOME_PATH = "/dashboard";

// Разделы бокового меню: «Назад» из них ведёт на главную (как в Material-навигации)
const TOP_LEVEL_PATHS = new Set([
  "/payments",
  "/categories",
  "/automation-rules",
  "/tags",
  "/settings",
  "/incomes",
  "/sources",
]);

// Экраны создания/редактирования и их родительские списки
const DETAIL_PARENTS: ReadonlyArray<[RegExp, string]> = [
  [/^\/payments\/(new|edit\/[^/]+)$/, "/payments"],
  [/^\/categories\/(new|edit\/[^/]+)$/, "/categories"],
  [/^\/tags\/(new|edit\/[^/]+)$/, "/tags"],
  [/^\/sources\/(new|edit\/[^/]+)$/, "/sources"],
];

// Вспомогательные экраны входа: «Назад» возвращает на форму входа
const AUTH_FLOW_PATHS = new Set([
  "/register",
  "/forgot-password",
  "/reset-password",
]);

/** Родительский экран для страницы создания/редактирования, если это она. */
export const getDetailParentPath = (pathname: string): string | null => {
  const { bare } = splitLocalePath(pathname);
  const match = DETAIL_PARENTS.find(([pattern]) => pattern.test(bare));
  return match ? match[1] : null;
};

/**
 * Есть ли позади запись истории, созданная самим приложением.
 * React Router хранит порядковый номер записи в `history.state.idx`;
 * на первой записи он равен 0, поэтому `history.back()` вывел бы из приложения
 * (или, в WebView, не сделал бы ничего).
 */
export const canGoBackInApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const state: unknown = window.history.state;
  if (typeof state !== "object" || state === null || !("idx" in state)) {
    return false;
  }
  const idx = (state as { idx: unknown }).idx;
  return typeof idx === "number" && idx > 0;
};

/** Определяет действие кнопки «Назад» для текущего маршрута. */
export const resolveRouteBack = (
  pathname: string,
  isAuthenticated: boolean,
  hasAppHistory: boolean,
): RouteBackAction => {
  const { bare } = splitLocalePath(pathname);
  const home = isAuthenticated ? APP_HOME_PATH : "/login";

  if (bare === APP_HOME_PATH || bare === "/login" || bare === "/") {
    return { type: "exit" };
  }

  const detailParent = getDetailParentPath(bare);
  if (detailParent) {
    // Возвращаемся туда, откуда открыли форму (главная, список, …)
    return hasAppHistory
      ? { type: "history" }
      : { type: "navigate", to: detailParent };
  }

  if (TOP_LEVEL_PATHS.has(bare)) {
    return { type: "navigate", to: APP_HOME_PATH };
  }

  if (AUTH_FLOW_PATHS.has(bare)) {
    return { type: "navigate", to: "/login" };
  }

  // Прочие экраны (соглашение, политика, 404, …): назад по истории или домой
  return hasAppHistory ? { type: "history" } : { type: "navigate", to: home };
};
