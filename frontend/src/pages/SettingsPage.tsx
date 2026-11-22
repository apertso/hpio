import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { PageHeader } from "../components/layout/Page";
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

const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "general",
  "account",
  "automation",
  "notifications",
  "developer",
];

/** Вкладка настроек по hash адреса; по умолчанию — «Общие». */
const sectionFromHash = (hash: string): SettingsSection => {
  const id = hash.replace("#", "");
  return SETTINGS_SECTIONS.find((section) => section === id) ?? "general";
};

const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const { setPageTitle } = usePageTitle();
  const navigate = useNavigate();
  const location = useLocation();
  const metadata = getPageMetadata("settings");

  const [activeSection, setActiveSection] = useState<SettingsSection>(() =>
    sectionFromHash(location.hash),
  );

  // Переход на /settings#… при уже открытых настройках (например, из бокового меню)
  // меняет только hash — переключаем вкладку вслед за ним
  React.useEffect(() => {
    setActiveSection(sectionFromHash(location.hash));
  }, [location.hash]);

  React.useEffect(() => {
    setPageTitle(t("Настройки"));
  }, [setPageTitle, t]);

  // Синхронизируем hash в адресе с активной вкладкой. Запись истории заменяется,
  // а не добавляется: вкладки — не экраны, и «Назад» не должен листать их по одной.
  // Переход через роутер сохраняет его служебное состояние в history.state.
  React.useEffect(() => {
    const nextHash = activeSection !== "general" ? `#${activeSection}` : "";
    if (location.hash !== nextHash) {
      navigate({ hash: nextHash }, { replace: true });
    }
    // location.hash намеренно не в зависимостях: иначе эффект откатывал бы
    // вкладку назад раньше, чем эффект выше успеет переключить её по новому hash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, navigate]);

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
        <PageHeader title={t("Настройки")} />
        <div className="w-full max-w-5xl px-3 py-4 md:px-6 md:py-6">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            {/* Навигация по разделам настроек */}
            <SettingsNavigation
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              // Определяем мобильный режим по ширине экрана менее 768px (md breakpoint)
              isMobile={window.innerWidth < 768}
            />

            {/* Содержимое активного раздела */}
            <div className="flex-1 min-w-0 max-w-3xl">{renderActiveSection()}</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
