import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  BellAlertIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  BellIcon,
  CalendarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  openNotificationSettings,
  requestAppNotificationPermission,
  openAppNotificationSettings,
} from "../api/notificationPermission";
import { useToast } from "../context/ToastContext";
import MobilePanel from "./MobilePanel";

interface NotificationOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type ContentVariant = "desktop" | "mobile";
type OnboardingStep = 1 | 2;

const NotificationOnboardingModal: React.FC<
  NotificationOnboardingModalProps
> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleStep1Continue = async () => {
    try {
      setIsLoading(true);
      await openNotificationSettings();
      setTimeout(() => {
        setCurrentStep(2);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to open settings:", error);
      showToast("Не удалось открыть настройки", "error");
      setIsLoading(false);
    }
  };

  const handleStep2Continue = async () => {
    try {
      setIsLoading(true);
      const result = await requestAppNotificationPermission();

      if (!result.granted) {
        setTimeout(async () => {
          await openAppNotificationSettings();
          setTimeout(() => {
            onComplete();
          }, 1000);
        }, 500);
      } else {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to request app notification permission:", error);
      showToast("Не удалось запросить разрешение", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else {
      onComplete();
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const renderStep1Content = () => (
    <>
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

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-indigo-600 rounded-full"></div>
            <span className="text-xs font-medium text-indigo-600">Шаг 1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <span className="text-xs font-medium text-gray-400">Шаг 2</span>
          </div>
        </div>

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

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Требуется разрешение:</strong> Для работы функции необходимо
            предоставить доступ к уведомлениям в системных настройках Android.
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <button
          onClick={handleStep1Continue}
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
    </>
  );

  const renderStep2Content = () => (
    <>
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
          <BellIcon className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Уведомления приложения
        </h2>
        <p className="text-blue-100 text-sm">
          Получайте важные напоминания вовремя
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <span className="text-xs font-medium text-gray-400">Шаг 1</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-indigo-600 rounded-full"></div>
            <span className="text-xs font-medium text-indigo-600">Шаг 2</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Напоминания о платежах
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Мы напомним вам о предстоящих платежах, чтобы вы ничего не
              пропустили
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Предложения автоплатежей
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Получайте уведомления, когда мы обнаружим новые повторяющиеся
              платежи
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Важно:</strong> Без этого разрешения вы не будете получать
            напоминания и уведомления от приложения.
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <button
          onClick={handleStep2Continue}
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Запрос разрешения..." : "Разрешить уведомления"}
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleBack}
            className="flex-1 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 transition-colors"
            disabled={isLoading}
          >
            Назад
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-2 transition-colors"
            disabled={isLoading}
          >
            Пропустить
          </button>
        </div>
      </div>
    </>
  );

  const renderContent = (variant: ContentVariant) => (
    <div
      className={`bg-white dark:bg-gray-900 shadow-2xl overflow-hidden ${
        variant === "mobile" ? "rounded-xl" : "rounded-2xl w-full max-w-md"
      }`}
    >
      {currentStep === 1 ? renderStep1Content() : renderStep2Content()}
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(
        <div className="hidden md:flex fixed inset-0 bg-black/50 backdrop-blur-sm justify-center items-center z-50 p-4">
          {renderContent("desktop")}
        </div>,
        document.body
      )}
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title=""
        showCloseButton={false}
      >
        {renderContent("mobile")}
      </MobilePanel>
    </>
  );
};

export default NotificationOnboardingModal;
