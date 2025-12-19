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

const DeveloperSection: React.FC = () => {
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
      `Debug toast уведомлений ${enabled ? "включены" : "выключены"}.`,
      "info"
    );
  };

  const handleSimulateNotification = async () => {
    if (!isTauriMobile()) {
      showToast("Симуляция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("simulate_app_payment_notification", {
        title: "Заплатили картой *9012",
        body: "− 689.68 ₽ в Пятерочка. Теперь на карте 34 574.90 ₽",
      });
      showToast("Тестовое уведомление отправлено", "success");
    } catch (error) {
      logger.error("Failed to simulate payment notification:", error);
      showToast("Не удалось отправить тестовое уведомление", "error");
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      await userApi.sendTestEmailNotification();
      showToast("Тестовое email-уведомление отправлено", "success");
    } catch (error) {
      logger.error("Failed to send developer test email:", error);
      showToast("Не удалось отправить тестовое письмо", "error");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleDownloadLogs = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      const logContent = await readLogFile();

      if (!logContent) {
        showToast("Файл логов пуст или не существует", "info");
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
        showToast("Логи успешно сохранены", "success");
      }
    } catch (error) {
      logger.error("Error downloading logs:", error);
      showToast("Не удалось скачать логи", "error");
    }
  };

  const handleClearLogs = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    setIsClearingLogs(true);
    try {
      const success = await clearLogFile();
      if (success) {
        showToast("Логи успешно очищены", "success");
        setIsClearLogsModalOpen(false);
      } else {
        showToast("Не удалось очистить логи", "error");
      }
    } catch (error) {
      logger.error("Error clearing logs:", error);
      showToast("Не удалось очистить логи", "error");
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
          "Функция копирования логов доступна только в мобильном приложении",
          "error"
        );
        setIsCopyingLogs(false);
        return;
      }

      if (!logContent) {
        showToast("Файл логов пуст или не существует", "info");
        setIsCopyingLogs(false);
        return;
      }

      const success = await writeToClipboard(logContent);
      if (success) {
        showToast("Логи скопированы в буфер обмена", "success");
      } else {
        showToast("Не удалось скопировать логи", "error");
      }
    } catch (error) {
      logger.error("Error copying logs:", error);
      showToast("Не удалось скопировать логи", "error");
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
              Разработка
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Инструменты для разработчиков и тестирования функциональности
              приложения
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Мобильный режим
            </label>
            <Select
              options={[
                { label: "-", value: "-" },
                { label: "Включен", value: "on" },
                { label: "Выключен", value: "off" },
              ]}
              value={mobileOverride}
              onChange={handleMobileOverrideChange}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Принудительно включает/выключает мобильный интерфейс для
              тестирования
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Показать onboarding уведомлений
            </label>
            <Select
              options={[
                { label: "-", value: "-" },
                { label: "Показать", value: "on" },
                { label: "Скрыть", value: "off" },
              ]}
              value={notificationOnboardingOverride}
              onChange={handleNotificationOnboardingOverride}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Принудительно показывает/скрывает onboarding автоматизации
              уведомлений
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Показать отладочные уведомления
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Показывает техническую информацию о обработке уведомлений
                  платежей
                </p>
              </div>
              <ToggleSwitch
                checked={showDebugToasts}
                onChange={handleDebugToastsToggle}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Тестовое email-уведомление
          </h4>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Отправляет письмо с контрольной фразой "email notifications
              functionality check" на ваш текущий email. Используйте для
              проверки SMTP-настроек.
            </p>
            <button
              onClick={handleSendTestEmail}
              disabled={isSendingTestEmail}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSendingTestEmail
                ? "Отправка..."
                : "Отправить тестовое email-уведомление"}
            </button>
          </div>
        </div>

        {/* Notification Simulation Section */}
        {isTauriMobile() && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Симуляция уведомлений
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Тестирование:</strong> Симулирует получение
                  уведомления от Райффайзен банка для проверки автоматической
                  обработки платежей.
                </p>
              </div>
              <button
                onClick={handleSimulateNotification}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
              >
                Симулировать уведомление Райффайзен
              </button>
            </div>
          </div>
        )}

        {/* Log Download Section */}
        {isTauriMobile() && (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Логи приложения
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Файл логов:</strong> Все логи приложения за сегодня
                  сохраняются в файл logs.txt. Вы можете скачать, скопировать
                  или очистить этот файл.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadLogs}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Скачать логи
                </button>
                <button
                  onClick={handleCopyLogs}
                  disabled={isCopyingLogs}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isCopyingLogs ? "Копирование..." : "Копировать в буфер"}
                </button>
                <button
                  onClick={() => setIsClearLogsModalOpen(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Очистить логи
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-start gap-3 mb-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Демонстрация Particle Notification
            </h4>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowParticleNotification(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              Показать тестовое уведомление
            </button>
          </div>
        </div>
      </SettingsSection>

      <ConfirmModal
        isOpen={isClearLogsModalOpen}
        onClose={() => setIsClearLogsModalOpen(false)}
        onConfirm={handleClearLogs}
        title="Очистить логи?"
        message="Вы уверены, что хотите очистить все логи? Это действие нельзя будет отменить."
        confirmText="Очистить"
        isConfirming={isClearingLogs}
      />

      <ParticleNotification
        text="Тестовое уведомление"
        isOpen={showParticleNotification}
        onClose={() => setShowParticleNotification(false)}
      />
    </div>
  );
};

export default DeveloperSection;
