import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { findAppUpdate, installAppUpdate } from "../api/appUpdate";
import type { AppUpdate } from "../utils/appUpdate";
import { isTauri, isTauriMobile } from "../utils/platform";
import getErrorMessage from "../utils/getErrorMessage";
import logger from "../utils/logger";
import { useToast } from "./ToastContext";
import { useLanguage } from "./LanguageContext";

// Версия, которую пользователь отложил кнопкой «Позже»
const DISMISSED_VERSION_KEY = "app_update_dismissed_version";
// Не чаще одного запроса к GitHub в час (лимит API без токена — 60 в час)
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

interface AppUpdateContextValue {
  /** Доступное обновление или null */
  update: AppUpdate | null;
  /** Идёт скачивание APK */
  isInstalling: boolean;
  /** Пользователь отложил именно эту версию */
  isDismissed: boolean;
  /** Скачать и открыть системный установщик */
  install: () => Promise<void>;
  /** Скрыть баннер до выхода следующей версии */
  dismiss: () => void;
}

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

const readDismissedVersion = (): string | null => {
  try {
    return localStorage.getItem(DISMISSED_VERSION_KEY);
  } catch {
    return null;
  }
};

/**
 * Проверяет наличие новой версии приложения при запуске и при возврате
 * в приложение, хранит результат для баннера и раздела настроек.
 */
export const AppUpdateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(
    readDismissedVersion,
  );
  const lastCheckRef = useRef(0);
  const isCheckingRef = useRef(false);

  const checkForUpdate = useCallback(async (): Promise<void> => {
    if (isCheckingRef.current) return;
    if (Date.now() - lastCheckRef.current < CHECK_INTERVAL_MS) return;
    isCheckingRef.current = true;
    try {
      const found = await findAppUpdate(import.meta.env.VITE_APP_VERSION || "");
      lastCheckRef.current = Date.now();
      setUpdate(found);
      if (found) {
        logger.info(`App update available: ${found.version}`);
      }
    } catch (error: unknown) {
      logger.error("Failed to check for app update:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isTauri() || !isTauriMobile()) return;
    void checkForUpdate();
    const handleVisibility = (): void => {
      if (document.visibilityState === "visible") void checkForUpdate();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkForUpdate]);

  const install = useCallback(async (): Promise<void> => {
    if (!update || isInstalling) return;
    setIsInstalling(true);
    try {
      const status = await installAppUpdate(update.url);
      if (status === "need_permission") {
        showToast(
          t(
            "Разрешите установку приложений из этого источника. Загрузка начнётся, когда вы вернётесь.",
          ),
          "info",
        );
        return;
      }
      showToast(t("Подтвердите установку в системном окне"), "info");
    } catch (error: unknown) {
      logger.error("Failed to install app update:", error);
      showToast(
        t("Не удалось скачать обновление: {1}", t(getErrorMessage(error))),
        "error",
      );
    } finally {
      setIsInstalling(false);
    }
  }, [update, isInstalling, showToast, t]);

  const dismiss = useCallback((): void => {
    if (!update) return;
    setDismissedVersion(update.version);
    try {
      localStorage.setItem(DISMISSED_VERSION_KEY, update.version);
    } catch (error: unknown) {
      logger.warn("Failed to save dismissed app update version:", error);
    }
  }, [update]);

  const value = useMemo<AppUpdateContextValue>(
    () => ({
      update,
      isInstalling,
      isDismissed: Boolean(update && dismissedVersion === update.version),
      install,
      dismiss,
    }),
    [update, isInstalling, dismissedVersion, install, dismiss],
  );

  return (
    <AppUpdateContext.Provider value={value}>
      {children}
    </AppUpdateContext.Provider>
  );
};

export const useAppUpdate = (): AppUpdateContextValue => {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error("useAppUpdate must be used within AppUpdateProvider");
  }
  return context;
};
