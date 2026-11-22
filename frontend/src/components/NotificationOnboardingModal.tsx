import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
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
import { useBackHandler } from "../hooks/useBackHandler";
import { Button } from "./Button";
import logger from "../utils/logger";

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
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  // «Назад» на втором шаге возвращает к первому, а не закрывает онбординг
  useBackHandler(isOpen && currentStep === 2, () => setCurrentStep(1));

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
      logger.error("Failed to open settings:", error);
      showToast(t("Не удалось открыть настройки"), "error");
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
      logger.error("Failed to request app notification permission:", error);
      showToast(t("Не удалось запросить разрешение"), "error");
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
      <div className="border-b border-[var(--ui-border)] px-6 pt-7 pb-5 text-center">
        <div className="inline-flex items-center justify-center size-10 rounded-lg border border-[var(--ui-border)] bg-gray-50 dark:bg-white/[0.04] mb-3">
          <SparklesIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">
          {t("Автоматизация платежей")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("Экономьте время на записи повторяющихся платежей")}
        </p>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-indigo-600 rounded-full"></div>
            <span className="text-xs font-medium text-indigo-600">{t("Шаг 1")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <span className="text-xs font-medium text-gray-400">{t("Шаг 2")}</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 size-8 rounded-md border border-[var(--ui-border)] bg-gray-50 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400 flex items-center justify-center">
            <DevicePhoneMobileIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t("Умное распознавание")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Приложение анализирует уведомления от банковских приложений и автоматически создаёт записи о платежах")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 size-8 rounded-md border border-[var(--ui-border)] bg-gray-50 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400 flex items-center justify-center">
            <ShieldCheckIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t("Конфиденциальность")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Анализ происходит ")}<strong>{t("только на вашем устройстве")}</strong>{t(". Текст уведомлений никогда не отправляется на сервер")}
            </p>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>{t("Требуется разрешение:")}</strong>{t(" Для работы функции необходимо предоставить доступ к уведомлениям в системных настройках Android.")}
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <Button
          variant="primary"
          size="large"
          className="w-full"
          onClick={handleStep1Continue}
          loading={isLoading}
          label={t("Открыть настройки")}
        ></Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={handleSkip}
          label={t("Пропустить")}
          loading={isLoading}
        ></Button>
      </div>
    </>
  );

  const renderStep2Content = () => (
    <>
      <div className="border-b border-[var(--ui-border)] px-6 pt-7 pb-5 text-center">
        <div className="inline-flex items-center justify-center size-10 rounded-lg border border-[var(--ui-border)] bg-gray-50 dark:bg-white/[0.04] mb-3">
          <BellIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">
          {t("Уведомления приложения")}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("Получайте важные напоминания вовремя")}
        </p>
      </div>

      <div className="p-5 space-y-5">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            <span className="text-xs font-medium text-gray-400">{t("Шаг 1")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-1 bg-indigo-600 rounded-full"></div>
            <span className="text-xs font-medium text-indigo-600">{t("Шаг 2")}</span>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 size-8 rounded-md border border-[var(--ui-border)] bg-gray-50 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400 flex items-center justify-center">
            <CalendarIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t("Напоминания о платежах")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Мы напомним вам о предстоящих платежах, чтобы вы ничего не пропустили")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 size-8 rounded-md border border-[var(--ui-border)] bg-gray-50 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400 flex items-center justify-center">
            <SparklesIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t("Предложения автоплатежей")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Получайте уведомления, когда мы обнаружим новые повторяющиеся платежи")}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>{t("Важно:")}</strong>{t(" Без этого разрешения вы не будете получать напоминания и уведомления от приложения.")}
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-3">
        <Button
          variant="primary"
          size="large"
          className="w-full"
          onClick={handleStep2Continue}
          loading={isLoading}
          label={t("Разрешить уведомления")}
        ></Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={handleBack}
            loading={isLoading}
            label={t("Назад")}
          ></Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={handleSkip}
            loading={isLoading}
            label={t("Пропустить")}
          ></Button>
        </div>
      </div>
    </>
  );

  const renderContent = (variant: ContentVariant) => (
    <div
      className={`bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-2xl overflow-hidden ${
        variant === "mobile" ? "rounded-lg" : "rounded-lg w-full max-w-md"
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
      <MobilePanel isOpen={isOpen} onClose={onClose} title="">
        {renderContent("mobile")}
      </MobilePanel>
    </>
  );
};

export default NotificationOnboardingModal;
