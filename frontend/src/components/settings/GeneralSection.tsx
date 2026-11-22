import { useLanguage } from "../../context/LanguageContext";
import React, { useEffect, useState } from "react";
import Select from "../Select";
import { Button } from "../Button";
import { SettingsGroup, SettingsHeader, SettingsRow } from "./SettingsLayout";
import { useTheme } from "../../context/ThemeContext";
import { isLanguage } from "../../i18n/translate";
import { useAuth, usePreferredCurrency } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import userApi from "../../api/userApi";
import { useAppUpdate } from "../../context/AppUpdateContext";
import getErrorMessage from "../../utils/getErrorMessage";
import { CURRENCY_OPTIONS } from "../../utils/currencies";

const GeneralSection: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const preferredCurrency = usePreferredCurrency();
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const {
    update: appUpdate,
    isInstalling: isInstallingUpdate,
    install: handleAppUpdate,
    checkForUpdate,
  } = useAppUpdate();

  // При открытии настроек перепроверяем обновление (с учётом 5-минутного кэша)
  useEffect(() => {
    void checkForUpdate();
  }, [checkForUpdate]);

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

  return (
    <div>
      <SettingsHeader
        title={t("Общие")}
        description={t("Внешний вид приложения и параметры отображения данных")}
      />

      <div className="space-y-8">
        <SettingsGroup title={t("Интерфейс")}>
          <SettingsRow
            label={t("Язык интерфейса")}
            description={t("Язык меню, подписей и уведомлений")}
            htmlFor="settings-language"
            control={
              <Select
                id="settings-language"
                options={languageOptions}
                value={language}
                onChange={handleLanguageChange}
              />
            }
          />
          <SettingsRow
            label={t("Тема приложения")}
            description={t("Системная тема следует настройкам устройства")}
            htmlFor="settings-theme"
            control={
              <Select
                id="settings-theme"
                options={themeOptions}
                value={theme}
                onChange={handleThemeChange}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t("Данные")}>
          <SettingsRow
            label={t("Основная валюта")}
            description={t("В эту валюту пересчитываются итоги и аналитика")}
            htmlFor="settings-currency"
            control={
              <Select
                id="settings-currency"
                options={CURRENCY_OPTIONS.map((option) => ({
                  ...option,
                  label: t(option.label),
                }))}
                value={preferredCurrency}
                onChange={handleCurrencyChange}
                disabled={isSavingCurrency || !user}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t("О приложении")}>
          <SettingsRow
            label={t("Версия")}
            description={
              appUpdate
                ? t("Доступна новая версия {1}", appUpdate.version)
                : undefined
            }
            controlWidth="auto"
            control={
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="font-mono text-xs tabular-nums text-gray-500 dark:text-gray-400">
                  {import.meta.env.VITE_APP_VERSION}
                </span>
                {appUpdate && (
                  <Button
                    variant="secondary"
                    size="small"
                    label={
                      isInstallingUpdate
                        ? t("Загрузка обновления...")
                        : t("Обновить до {1}", appUpdate.version)
                    }
                    onClick={() => {
                      void handleAppUpdate();
                    }}
                    disabled={isInstallingUpdate}
                  />
                )}
              </div>
            }
          />
        </SettingsGroup>
      </div>
    </div>
  );
};

export default GeneralSection;
