import React from "react";
import {
  Cog6ToothIcon,
  BellAlertIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { isTauriMobile } from "../utils/platform";

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
  if (isMobile) {
    // Мобильные вкладки
    return (
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              {section.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Боковая панель для десктопа
  return (
    <div className="w-64 pr-8 border-r border-gray-200 dark:border-gray-700">
      <nav className="space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {section.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsNavigation;
