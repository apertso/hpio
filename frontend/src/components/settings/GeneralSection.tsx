import { useLanguage } from "../../context/LanguageContext";
import React from "react";
import Select from "../Select";
import SettingsSection from "../SettingsSection";
import { CogIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../context/ThemeContext";
import { isLanguage } from "../../i18n/translate";

const GeneralSection: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

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
        </div>
      </SettingsSection>

      <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
        {t("Версия приложения: ")}{import.meta.env.VITE_APP_VERSION}
      </p>
    </div>
  );
};

export default GeneralSection;
