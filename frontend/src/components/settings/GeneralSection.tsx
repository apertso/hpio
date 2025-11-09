import React from "react";
import Select from "../Select";
import SettingsSection from "../SettingsSection";
import { CogIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../context/ThemeContext";

const GeneralSection: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (value: string | null) => {
    if (value === "system" || value === "light" || value === "dark") {
      setTheme(value);
    }
  };

  const themeOptions = [
    { label: "Системная", value: "system" },
    { label: "Светлая", value: "light" },
    { label: "Тёмная", value: "dark" },
  ];

  return (
    <div className="space-y-8">
      <SettingsSection>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center">
            <CogIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Общие настройки
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Настройте внешний вид приложения и основные параметры отображения
              данных
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Тема приложения
            </label>
            <Select
              options={themeOptions}
              value={theme}
              onChange={handleThemeChange}
            />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
};

export default GeneralSection;
