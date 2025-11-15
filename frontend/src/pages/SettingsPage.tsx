import React, { useState, useEffect } from "react";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { usePageTitle } from "../context/PageTitleContext";
import SettingsNavigation, {
  SettingsSection,
} from "../components/SettingsNavigation";
import GeneralSection from "../components/settings/GeneralSection";
import AccountSection from "../components/settings/AccountSection";
import AutomationSection from "../components/settings/AutomationSection";
import NotificationsSection from "../components/settings/NotificationsSection";
import DeveloperSection from "../components/settings/DeveloperSection";

const SettingsPage: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("settings");

  // Get initial section from URL hash, default to "general"
  const getInitialSection = (): SettingsSection => {
    const hash = window.location.hash.replace("#", "");
    if (
      hash &&
      [
        "general",
        "account",
        "automation",
        "notifications",
        "developer",
      ].includes(hash)
    ) {
      return hash as SettingsSection;
    }
    return "general";
  };

  const [activeSection, setActiveSection] =
    useState<SettingsSection>(getInitialSection);

  React.useEffect(() => {
    setPageTitle("Настройки");
  }, [setPageTitle]);

  // Update URL hash when active section changes
  React.useEffect(() => {
    if (activeSection !== "general") {
      window.location.hash = activeSection;
    } else {
      // Remove hash for general section to keep clean URLs
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [activeSection]);

  const renderActiveSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSection />;
      case "account":
        return <AccountSection />;
      case "automation":
        return <AutomationSection />;
      case "notifications":
        return <NotificationsSection />;
      case "developer":
        return <DeveloperSection />;
      default:
        return <GeneralSection />;
    }
  };

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex justify-between items-center md:mb-6 px-4 md:px-0">
            <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Настройки
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-8 px-4 md:px-0">
            {/* Навигация по разделам настроек */}
            <SettingsNavigation
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              // Определяем мобильный режим по ширине экрана менее 768px (md breakpoint)
              isMobile={window.innerWidth < 768}
            />

            {/* Содержимое активного раздела */}
            <div className="flex-1 min-w-0">{renderActiveSection()}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
