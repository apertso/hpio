import { useLanguage } from "../../context/LanguageContext";
import React, { useEffect, useState } from "react";
import Select from "../Select";
import SettingsSection from "../SettingsSection";
import { CogIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../context/ThemeContext";
import { isLanguage } from "../../i18n/translate";
import { useAuth, usePreferredCurrency } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import userApi from "../../api/userApi";
import { findAppUpdate, installAppUpdate } from "../../api/appUpdate";
import getErrorMessage from "../../utils/getErrorMessage";
import logger from "../../utils/logger";
import { isTauri, isTauriMobile } from "../../utils/platform";
import { CURRENCY_OPTIONS } from "../../utils/currencies";
import type { AppUpdate } from "../../utils/appUpdate";

const GeneralSection: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const preferredCurrency = usePreferredCurrency();
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [appUpdate, setAppUpdate] = useState<AppUpdate | null>(null);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);

  useEffect(() => {
    if (!isTauri() || !isTauriMobile()) return;
    let cancelled = false;
    void findAppUpdate(import.meta.env.VITE_APP_VERSION || "")
      .then((update) => {
        if (!cancelled) setAppUpdate(update);
      })
      .catch((error: unknown) => {
        logger.error("Failed to check for app update:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLanguageChange = (value: string | null): void => {
    if (isLanguage(value)) setLanguage(value);
  };

  const languageOptions = [
    { label: "Русский", value: "ru" },
    { label: "English", value: "en" },
  ];

  const handleThemeChange = (value: string | null) => {
    if (value === "system" || value === "light" || value === "dark") {
      setTheme(value);
    }
  };

  const themeOptions = [
    { label: t("Системная"), value: "system" },
    { label: t("Светлая"), value: "light" },
    { label: t("Тёмная"), value: "dark" },
  ];

  const handleCurrencyChange = async (value: string | null): Promise<void> => {
    if (!user || !value || value === preferredCurrency) return;

    setIsSavingCurrency(true);
    try {
      await userApi.updateProfile({ preferredCurrency: value });
      await refreshUser();
      showToast(t("Основная валюта обновлена"), "success");
    } catch (error) {
      showToast(
        t("Не удалось обновить валюту: {1}", t(getErrorMessage(error))),
        "error"
      );
    } finally {
      setIsSavingCurrency(false);
    }
  };

  const handleAppUpdate = async (): Promise<void> => {
    if (!appUpdate || isInstallingUpdate) return;
    setIsInstallingUpdate(true);
    try {
      const status = await installAppUpdate(appUpdate.url);
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
    } catch (error) {
      logger.error("Failed to install app update:", error);
      showToast(
        t("Не удалось скачать обновление: {1}", t(getErrorMessage(error))),
        "error",
      );
    } finally {
      setIsInstallingUpdate(false);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsSection className="card-base p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center">
            <CogIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("Общие настройки")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("Настройте внешний вид приложения и основные параметры отображения данных")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("Язык интерфейса")}
            </label>
            <Select
              options={languageOptions}
              value={language}
              onChange={handleLanguageChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("Тема приложения")}
            </label>
            <Select
              options={themeOptions}
              value={theme}
              onChange={handleThemeChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("Основная валюта")}
            </label>
            <Select
              options={CURRENCY_OPTIONS.map((option) => ({
                ...option,
                label: t(option.label),
              }))}
              value={preferredCurrency}
              onChange={handleCurrencyChange}
              disabled={isSavingCurrency || !user}
            />
          </div>
        </div>
      </SettingsSection>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {t("Версия приложения: ")}{import.meta.env.VITE_APP_VERSION}
        </p>
        {appUpdate && (
          <button
            type="button"
            className="mt-2 cursor-pointer text-xs font-medium text-indigo-700 underline underline-offset-2 transition-opacity hover:opacity-80 disabled:opacity-60 dark:text-indigo-300"
            onClick={() => {
              void handleAppUpdate();
            }}
            disabled={isInstallingUpdate}
          >
            {isInstallingUpdate
              ? t("Загрузка обновления...")
              : t("Обновить до {1}", appUpdate.version)}
          </button>
        )}
      </div>
    </div>
  );
};

export default GeneralSection;
