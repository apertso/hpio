import { useLanguage } from "../../context/LanguageContext";
import React, { useState } from "react";
import ToggleSwitch from "../ToggleSwitch";
import Select from "../Select";
import SettingsSection from "../SettingsSection";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
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
    <div className="space-y-8">
      <SettingsSection className="card-base p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <CodeBracketIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t("Разработка")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("Инструменты для разработчиков и тестирования функциональности приложения")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Мобильный режим")}
            </label>
            <Select
              options={[
                { label: "-", value: "-" },
                { label: t("Включен"), value: "on" },
                { label: t("Выключен"), value: "off" },
              ]}
              value={mobileOverride}
              onChange={handleMobileOverrideChange}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("Принудительно включает/выключает мобильный интерфейс для тестирования")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("Показать onboarding уведомлений")}
            </label>
            <Select
              options={[
                { label: "-", value: "-" },
                { label: t("Показать"), value: "on" },
                { label: t("Скрыть"), value: "off" },
              ]}
              value={notificationOnboardingOverride}
              onChange={handleNotificationOnboardingOverride}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t("Принудительно показывает/скрывает onboarding автоматизации уведомлений")}
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("Показать отладочные уведомления")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("Показывает техническую информацию о обработке уведомлений платежей")}
                </p>
              </div>
              <ToggleSwitch
                checked={showDebugToasts}
                onChange={handleDebugToastsToggle}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("Доходы и источники (экспериментально)")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("Включает разделы \"Доходы\" и \"Источники\", поддержку мультивалютности и метод оплаты в платежах")}
                </p>
              </div>
              <ToggleSwitch
                checked={incomeAndCardsEnabled}
                onChange={handleIncomeAndCardsToggle}
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("Теги и категории")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("Включено для всех по умолчанию")}
                </p>
              </div>
              <ToggleSwitch
                checked={tagsAndCategoriesEnabled}
                onChange={handleTagsAndCategoriesToggle}
                disabled
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("Тестовое email-уведомление")}
          </h4>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("Отправляет письмо с контрольной фразой \"email notifications functionality check\" на ваш текущий email. Используйте для проверки SMTP-настроек.")}
            </p>
            <button
              onClick={handleSendTestEmail}
              disabled={isSendingTestEmail}
              className="primary-action cursor-pointer px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSendingTestEmail
                ? t("Отправка...")
                : t("Отправить тестовое email-уведомление")}
            </button>
          </div>
        </div>

        {/* Notification Simulation Section */}
        {isTauriMobile() && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t("Симуляция уведомлений")}
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>{t("Тестирование:")}</strong>{t(" Симулирует получение уведомления от Райффайзен банка для проверки автоматической обработки платежей.")}
                </p>
              </div>
              <button
                onClick={handleSimulateNotification}
                className="primary-action cursor-pointer px-4 py-2 text-sm font-medium rounded-md transition-colors"
              >
                {t("Симулировать уведомление Райффайзен")}
              </button>
            </div>
          </div>
        )}

        {/* Log Download Section */}
        {isTauriMobile() && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t("Логи приложения")}
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{t("Файл логов:")}</strong>{t(" Все логи приложения за сегодня сохраняются в файл logs.txt. Вы можете скачать, скопировать или очистить этот файл.")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadLogs}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  {t("Скачать логи")}
                </button>
                <button
                  onClick={handleCopyLogs}
                  disabled={isCopyingLogs}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isCopyingLogs ? t("Копирование...") : t("Копировать в буфер")}
                </button>
                <button
                  onClick={() => setIsClearLogsModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  {t("Очистить логи")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-3 mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              {t("Демонстрация Particle Notification")}
            </h4>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowParticleNotification(true)}
              className="primary-action cursor-pointer px-4 py-2 text-sm font-medium rounded-md transition-colors"
            >
              {t("Показать тестовое уведомление")}
            </button>
          </div>
        </div>
      </SettingsSection>

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
