import { useLanguage } from "../../context/LanguageContext";
import React, { useState } from "react";
import ToggleSwitch from "../ToggleSwitch";
import Select from "../Select";
import { Button } from "../Button";
import { SettingsGroup, SettingsHeader, SettingsRow } from "./SettingsLayout";
import { useToast } from "../../context/ToastContext";
import { isTauriMobile } from "../../utils/platform";
import {
  readLogFile,
  clearLogFile,
  writeToClipboard,
} from "../../utils/fileLogger";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import logger from "../../utils/logger";
import ConfirmModal from "../ConfirmModal";
import userApi from "../../api/userApi";
import ParticleNotification from "../ParticleNotification";
import { getFeatureFlags, setFeatureFlag } from "../../utils/featureFlags";

const DeveloperSection: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [showParticleNotification, setShowParticleNotification] =
    useState(false);
  const [mobileOverride, setMobileOverride] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("dev_mobile_override") || "-"
      : "-"
  );
  const [notificationOnboardingOverride, setNotificationOnboardingOverride] =
    useState<string>(() =>
      typeof window !== "undefined"
        ? localStorage.getItem("dev_show_notification_onboarding") || "-"
        : "-"
    );
  const [showDebugToasts, setShowDebugToasts] = useState<boolean>(() => {
    return localStorage.getItem("dev_show_debug_toasts") === "true";
  });
  const [incomeAndCardsEnabled, setIncomeAndCardsEnabled] = useState<boolean>(
    () => getFeatureFlags().incomeAndCardsEnabled
  );
  const [tagsAndCategoriesEnabled, setTagsAndCategoriesEnabled] =
    useState<boolean>(() => getFeatureFlags().tagsAndCategoriesEnabled);
  const [isClearLogsModalOpen, setIsClearLogsModalOpen] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [isCopyingLogs, setIsCopyingLogs] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const handleMobileOverrideChange = (value: string | null) => {
    const newValue = value || "-";
    setMobileOverride(newValue);
    if (newValue === "-") {
      localStorage.removeItem("dev_mobile_override");
    } else {
      localStorage.setItem("dev_mobile_override", newValue);
    }
    // Принудительно перезагружаем страницу для применения изменений режима мобильный/десктоп
    window.location.reload();
  };

  const handleNotificationOnboardingOverride = (value: string | null) => {
    const newValue = value || "-";
    setNotificationOnboardingOverride(newValue);
    if (newValue === "-") {
      localStorage.removeItem("dev_show_notification_onboarding");
    } else {
      localStorage.setItem("dev_show_notification_onboarding", newValue);
    }
    if (newValue === "on") {
      // Также сбросим флаг завершения онбординга
      localStorage.removeItem("notification_onboarding_completed");
    }
  };

  const handleDebugToastsToggle = (enabled: boolean) => {
    setShowDebugToasts(enabled);
    localStorage.setItem("dev_show_debug_toasts", String(enabled));
    showToast(
      t("Debug toast уведомлений {1}.", t(enabled ? "включены" : "выключены")),
      "info"
    );
  };

  const handleIncomeAndCardsToggle = (enabled: boolean) => {
    setIncomeAndCardsEnabled(enabled);
    setFeatureFlag("incomeAndCardsEnabled", enabled);
    showToast(
      t("Доходы и источники {1}. Перезагрузите страницу для применения.", t(enabled ? "включены" : "выключены")),
      "info"
    );
  };

  const handleTagsAndCategoriesToggle = (enabled: boolean) => {
    setTagsAndCategoriesEnabled(enabled);
    setFeatureFlag("tagsAndCategoriesEnabled", enabled);
    showToast(
      t("Теги и категории {1}. Перезагрузите страницу для применения.", t(enabled ? "включены" : "выключены")),
      "info"
    );
  };

  const handleSimulateNotification = async () => {
    if (!isTauriMobile()) {
      showToast(t("Симуляция доступна только в мобильном приложении"), "error");
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("simulate_app_payment_notification", {
        title: "Заплатили картой *9012",
        body: "− 689.68 ₽ в Пятерочка. Теперь на карте 34 574.90 ₽",
      });
      showToast(t("Тестовое уведомление отправлено"), "success");
    } catch (error) {
      logger.error("Failed to simulate payment notification:", error);
      showToast(t("Не удалось отправить тестовое уведомление"), "error");
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      await userApi.sendTestEmailNotification();
      showToast(t("Тестовое email-уведомление отправлено"), "success");
    } catch (error) {
      logger.error("Failed to send developer test email:", error);
      showToast(t("Не удалось отправить тестовое письмо"), "error");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleDownloadLogs = async () => {
    if (!isTauriMobile()) {
      showToast(t("Эта функция доступна только в мобильном приложении"), "error");
      return;
    }

    try {
      const logContent = await readLogFile();

      if (!logContent) {
        showToast(t("Файл логов пуст или не существует"), "info");
        return;
      }

      // Открываем диалог сохранения файла
      const filePath = await save({
        defaultPath: "logs.txt",
        filters: [
          {
            name: "Text Files",
            extensions: ["txt"],
          },
        ],
      });

      if (filePath) {
        await writeTextFile(filePath, logContent);
        showToast(t("Логи успешно сохранены"), "success");
      }
    } catch (error) {
      logger.error("Error downloading logs:", error);
      showToast(t("Не удалось скачать логи"), "error");
    }
  };

  const handleClearLogs = async () => {
    if (!isTauriMobile()) {
      showToast(t("Эта функция доступна только в мобильном приложении"), "error");
      return;
    }

    setIsClearingLogs(true);
    try {
      const success = await clearLogFile();
      if (success) {
        showToast(t("Логи успешно очищены"), "success");
        setIsClearLogsModalOpen(false);
      } else {
        showToast(t("Не удалось очистить логи"), "error");
      }
    } catch (error) {
      logger.error("Error clearing logs:", error);
      showToast(t("Не удалось очистить логи"), "error");
    } finally {
      setIsClearingLogs(false);
    }
  };

  const handleCopyLogs = async () => {
    setIsCopyingLogs(true);
    try {
      let logContent: string | null = null;

      if (isTauriMobile()) {
        logContent = await readLogFile();
      } else if (navigator.clipboard && window.isSecureContext) {
        // Для веб-версии мы могли бы собирать логи консоли, но пока просто показываем сообщение
        showToast(
          t("Функция копирования логов доступна только в мобильном приложении"),
          "error"
        );
        setIsCopyingLogs(false);
        return;
      }

      if (!logContent) {
        showToast(t("Файл логов пуст или не существует"), "info");
        setIsCopyingLogs(false);
        return;
      }

      const success = await writeToClipboard(logContent);
      if (success) {
        showToast(t("Логи скопированы в буфер обмена"), "success");
      } else {
        showToast(t("Не удалось скопировать логи"), "error");
      }
    } catch (error) {
      logger.error("Error copying logs:", error);
      showToast(t("Не удалось скопировать логи"), "error");
    } finally {
      setIsCopyingLogs(false);
    }
  };

  return (
    <div>
      <SettingsHeader
        title={t("Разработка")}
        description={t("Инструменты для разработчиков и тестирования функциональности приложения")}
      />

      <div className="space-y-8">
        <SettingsGroup title={t("Интерфейс")}>
          <SettingsRow
            label={t("Мобильный режим")}
            description={t("Принудительно включает/выключает мобильный интерфейс для тестирования")}
            htmlFor="dev-mobile-override"
            control={
              <Select
                id="dev-mobile-override"
                options={[
                  { label: "-", value: "-" },
                  { label: t("Включен"), value: "on" },
                  { label: t("Выключен"), value: "off" },
                ]}
                value={mobileOverride}
                onChange={handleMobileOverrideChange}
              />
            }
          />
          <SettingsRow
            label={t("Показать onboarding уведомлений")}
            description={t("Принудительно показывает/скрывает onboarding автоматизации уведомлений")}
            htmlFor="dev-notification-onboarding"
            control={
              <Select
                id="dev-notification-onboarding"
                options={[
                  { label: "-", value: "-" },
                  { label: t("Показать"), value: "on" },
                  { label: t("Скрыть"), value: "off" },
                ]}
                value={notificationOnboardingOverride}
                onChange={handleNotificationOnboardingOverride}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t("Функции")}>
          <SettingsRow
            inline
            label={t("Показать отладочные уведомления")}
            description={t("Показывает техническую информацию о обработке уведомлений платежей")}
            control={
              <ToggleSwitch
                checked={showDebugToasts}
                onChange={handleDebugToastsToggle}
              />
            }
          />
          <SettingsRow
            inline
            label={t("Доходы и источники (экспериментально)")}
            description={t("Включает разделы \"Доходы\" и \"Источники\" и метод оплаты в платежах")}
            control={
              <ToggleSwitch
                checked={incomeAndCardsEnabled}
                onChange={handleIncomeAndCardsToggle}
              />
            }
          />
          <SettingsRow
            inline
            label={t("Теги и категории")}
            description={t("Включено для всех по умолчанию")}
            control={
              <ToggleSwitch
                checked={tagsAndCategoriesEnabled}
                onChange={handleTagsAndCategoriesToggle}
                disabled
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t("Проверки")}>
          <SettingsRow
            label={t("Тестовое email-уведомление")}
            description={t("Отправляет письмо с контрольной фразой \"email notifications functionality check\" на ваш текущий email. Используйте для проверки SMTP-настроек.")}
            controlWidth="auto"
            control={
              <Button
                variant="secondary"
                size="small"
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail}
                label={isSendingTestEmail ? t("Отправка...") : t("Отправить")}
              />
            }
          />
          {isTauriMobile() && (
            <SettingsRow
              label={t("Симуляция уведомлений")}
              description={t(" Симулирует получение уведомления от Райффайзен банка для проверки автоматической обработки платежей.").trim()}
              controlWidth="auto"
              control={
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleSimulateNotification}
                  label={t("Симулировать")}
                />
              }
            />
          )}
          <SettingsRow
            label={t("Демонстрация Particle Notification")}
            controlWidth="auto"
            control={
              <Button
                variant="secondary"
                size="small"
                onClick={() => setShowParticleNotification(true)}
                label={t("Показать")}
              />
            }
          />
        </SettingsGroup>

        {isTauriMobile() && (
          <SettingsGroup
            title={t("Логи приложения")}
            description={t(" Все логи приложения за сегодня сохраняются в файл logs.txt. Вы можете скачать, скопировать или очистить этот файл.").trim()}
          >
            <SettingsRow
              label={t("Файл логов")}
              controlWidth="auto"
              control={
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleDownloadLogs}
                    label={t("Скачать")}
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={handleCopyLogs}
                    disabled={isCopyingLogs}
                    label={isCopyingLogs ? t("Копирование...") : t("Копировать")}
                  />
                  <Button
                    variant="destructive"
                    size="small"
                    onClick={() => setIsClearLogsModalOpen(true)}
                    label={t("Очистить")}
                  />
                </div>
              }
            />
          </SettingsGroup>
        )}
      </div>

      <ConfirmModal
        isOpen={isClearLogsModalOpen}
        onClose={() => setIsClearLogsModalOpen(false)}
        onConfirm={handleClearLogs}
        title={t("Очистить логи?")}
        message={t("Вы уверены, что хотите очистить все логи? Это действие нельзя будет отменить.")}
        confirmText={t("Очистить")}
        isConfirming={isClearingLogs}
      />

      <ParticleNotification
        text={t("Тестовое уведомление")}
        isOpen={showParticleNotification}
        onClose={() => setShowParticleNotification(false)}
      />
    </div>
  );
};

export default DeveloperSection;
