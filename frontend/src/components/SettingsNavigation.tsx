import React from "react";
import {
  Cog6ToothIcon,
  BellAlertIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { isTauriMobile } from "../utils/platform";
import { useLanguage } from "../context/LanguageContext";

export type SettingsSection =
  | "general"
  | "account"
  | "automation"
  | "notifications"
  | "developer";

interface SettingsNavigationProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  isMobile: boolean;
}

const baseSections = [
  {
    id: "general" as const,
    label: "Общие",
    icon: Cog6ToothIcon,
  },
  {
    id: "account" as const,
    label: "Аккаунт",
    icon: UserIcon,
  },
  ...(isTauriMobile()
    ? [
        {
          id: "automation" as const,
          label: "Автоматизация",
          icon: SparklesIcon,
        },
      ]
    : []),
  {
    id: "notifications" as const,
    label: "Уведомления",
    icon: BellAlertIcon,
  },
];

const developerSection = {
  id: "developer" as const,
  label: "Разработка",
  icon: WrenchScrewdriverIcon,
};

// Условно показываем вкладку разработчика только если включены функции разработки
const sections =
  import.meta.env.VITE_ENABLE_DEV_FEATURES === "true"
    ? [...baseSections, developerSection]
    : baseSections;

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  activeSection,
  onSectionChange,
  isMobile,
}) => {
  const { t } = useLanguage();
  if (isMobile) {
    // Мобильные вкладки
    return (
      <div className="flex border-b border-[var(--ui-border)] -mt-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              // Подпись не показываем: заголовок раздела виден внутри открытой вкладки
              aria-label={t(section.label)}
              title={t(section.label)}
              className={`-mb-px flex-1 flex items-center justify-center py-3 px-2 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? "text-gray-900 dark:text-gray-50 border-gray-900 dark:border-gray-100"
                  : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="size-6" />
            </button>
          );
        })}
      </div>
    );
  }

  // Боковая панель для десктопа
  return (
    <div className="w-52 shrink-0 pr-6">
      <nav className="flex flex-col gap-px">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center gap-2.5 px-2 h-8 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-gray-50"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <Icon className={`size-4 ${isActive ? "text-gray-700 dark:text-gray-200" : "text-gray-400"}`} />
              {t(section.label)}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsNavigation;
