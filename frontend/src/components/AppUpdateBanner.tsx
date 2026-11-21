import React from "react";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { useAppUpdate } from "../context/AppUpdateContext";
import Spinner from "./Spinner";

interface AppUpdateBannerProps {
  className?: string;
}

/**
 * Полоса над содержимым с предложением обновить приложение до новой версии.
 */
const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({ className = "" }) => {
  const { t } = useLanguage();
  const { update, isInstalling, isDismissed, install, dismiss } =
    useAppUpdate();

  if (!update || isDismissed) {
    return null;
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-3 border-b border-[var(--ui-border)] bg-blue-50/60 px-4 py-2 dark:bg-blue-400/[0.06] md:px-6 md:py-2.5 ${className}`.trim()}
      role="status"
    >
      <ArrowDownTrayIcon className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <p className="min-w-0 flex-grow truncate text-sm font-medium text-gray-900 dark:text-gray-100">
        {t("Доступна новая версия {1}", update.version)}
      </p>
      <button
        type="button"
        onClick={() => {
          void install();
        }}
        disabled={isInstalling}
        className="flex h-7 min-w-24 shrink-0 items-center justify-center rounded-md border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-2.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-white/[0.06] cursor-pointer"
      >
        {isInstalling ? <Spinner size="sm" /> : t("Установить")}
      </button>
      <button
        type="button"
        onClick={dismiss}
        disabled={isInstalling}
        aria-label={t("Позже")}
        title={t("Позже")}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors cursor-pointer"
      >
        <XMarkIcon className="size-4" />
      </button>
    </div>
  );
};

export default AppUpdateBanner;
