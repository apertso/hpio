import React, { useState } from "react";
import ToggleSwitch from "../ToggleSwitch";
import Select from "../Select";
import SettingsSection from "../SettingsSection";
import { CodeBracketIcon } from "@heroicons/react/24/outline";
import { useToast } from "../../context/ToastContext";
import { isTauriMobile } from "../../utils/platform";
import { readLogFile, clearLogFile, writeToClipboard } from "../../utils/fileLogger";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import logger from "../../utils/logger";
import ConfirmModal from "../ConfirmModal";

const DeveloperSection: React.FC = () => {
  const { showToast } = useToast();
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

  const handleSimulateNotification = () => {
    // Симулируем добавление уведомления в очередь
    const simulatedNotification = {
      package_name: "ru.raiffeisennews",
      title: "Заплатили картой *9012",
      text: "− 689.68 ₽ в Пятерочка. Теперь на карте 34 574.90 ₽",
      timestamp: Date.now(),
    };

    // Добавляем в localStorage для обработки
    const existingNotifications = JSON.parse(
      localStorage.getItem("dev_simulated_notifications") || "[]"
    );
    existingNotifications.push(simulatedNotification);
    localStorage.setItem(
      "dev_simulated_notifications",
      JSON.stringify(existingNotifications)
    );

    showToast("Тестовое уведомление добавлено в очередь", "success");
  };

  const handleDownloadLogs = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      // Добавляем тестовую запись в лог для проверки работы логирования
      console.log("Testing file logger...");
      logger.info(
        "Test log entry from Settings page - download logs button clicked"
      );

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
      console.error("Error downloading logs:", error);
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
      console.error("Error clearing logs:", error);
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
      console.error("Error copying logs:", error);
      showToast("Не удалось скопировать логи", "error");
    } finally {
      setIsCopyingLogs(false);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsSection>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <CodeBracketIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Разработка
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Инструменты для разработчиков и тестирования функциональности приложения
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
                  Показывает техническую информацию о обработке
                  уведомлений платежей
                </p>
              </div>
              <ToggleSwitch
                checked={showDebugToasts}
                onChange={handleDebugToastsToggle}
              />
            </div>
          </div>
        </div>

        {/* Notification Simulation Section */}
        {isTauriMobile() && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Симуляция уведомлений
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Тестирование:</strong> Симулирует получение
                  уведомления от Райффайзен банка для проверки
                  автоматической обработки платежей.
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
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Логи приложения
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Файл логов:</strong> Все логи приложения за
                  сегодня сохраняются в файл logs.txt. Вы можете
                  скачать, скопировать или очистить этот файл.
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
                  {isCopyingLogs
                    ? "Копирование..."
                    : "Копировать в буфер"}
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
    </div>
  );
};

export default DeveloperSection;
