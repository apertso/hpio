import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  BellAlertIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { openNotificationSettings } from "../api/notificationPermission";
import { useToast } from "../context/ToastContext";

interface NotificationOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const NotificationOnboardingModal: React.FC<
  NotificationOnboardingModalProps
> = ({ isOpen, onClose, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleOpenSettings = async () => {
    try {
      setIsLoading(true);
      await openNotificationSettings();
      // Даём пользователю время разобраться с настройками
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      console.error("Failed to open settings:", error);
      showToast("Не удалось открыть настройки", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <BellAlertIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Автоматизация платежей
          </h2>
          <p className="text-indigo-100 text-sm">
            Экономьте время на записи повторяющихся платежей
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Feature 1 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <DevicePhoneMobileIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Умное распознавание
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Приложение анализирует уведомления от банковских приложений и
                автоматически создаёт записи о платежах
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Конфиденциальность
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Анализ происходит <strong>только на вашем устройстве</strong>.
                Текст уведомлений никогда не отправляется на сервер
              </p>
            </div>
          </div>

          {/* Permission explanation */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Требуется разрешение:</strong> Для работы функции
              необходимо предоставить доступ к уведомлениям в системных
              настройках Android.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleOpenSettings}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Открытие настроек..." : "Открыть настройки"}
          </button>
          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 transition-colors"
            disabled={isLoading}
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationOnboardingModal;
