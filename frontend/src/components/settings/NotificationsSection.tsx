import React, { useState, useEffect } from "react";
import { BellAlertIcon } from "@heroicons/react/24/outline";
import SettingsSection from "../SettingsSection";
import ToggleSwitch from "../ToggleSwitch";
import { TextInputField } from "../Input";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { isTauriMobile } from "../../utils/platform";
import {
  checkAppNotificationPermission,
  openAppNotificationSettings,
} from "../../api/notificationPermission";
import userApi from "../../api/userApi";
import getErrorMessage from "../../utils/getErrorMessage";

const NotificationsSection: React.FC = () => {
  const { showToast } = useToast();
  const { user, refreshUser } = useAuth();
  const [
    appNotificationPermissionGranted,
    setAppNotificationPermissionGranted,
  ] = useState(false);
  const [isCheckingAppPermission, setIsCheckingAppPermission] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [pushNotifications, setPushNotifications] = useState<boolean>(false);
  const [notificationTime, setNotificationTime] = useState("09:30");
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  // Инициализируем значения из данных пользователя
  useEffect(() => {
    if (user) {
      setEmailNotifications(user.emailNotifications ?? true);
      setPushNotifications(user.pushNotifications ?? false);
      setNotificationTime(user.notificationTime || "09:30");
    }
  }, [user]);

  useEffect(() => {
    if (isTauriMobile()) {
      const checkPermission = async () => {
        setIsCheckingAppPermission(true);
        try {
          const appStatus = await checkAppNotificationPermission();
          setAppNotificationPermissionGranted(appStatus.granted);
        } catch (error) {
          console.error("Failed to check app notification permission:", error);
        } finally {
          setIsCheckingAppPermission(false);
        }
      };
      checkPermission();
    }
  }, []);

  const handleOpenAppNotificationSettings = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      await openAppNotificationSettings();
      showToast("Откройте настройки и разрешите уведомления", "info");
      // Перепроверяем разрешение через 2 секунды
      setTimeout(async () => {
        const status = await checkAppNotificationPermission();
        setAppNotificationPermissionGranted(status.granted);
        if (status.granted) {
          showToast("Уведомления приложения разрешены!", "success");
        }
      }, 2000);
    } catch {
      showToast("Не удалось открыть настройки", "error");
    }
  };

  const handleEmailNotificationsChange = async (enabled: boolean) => {
    if (!user) return;

    setIsUpdatingPreferences(true);

    try {
      await userApi.updateProfile({
        emailNotifications: enabled,
      });
      setEmailNotifications(enabled);
      await refreshUser();
      showToast("Предпочтения уведомлений обновлены", "success");
    } catch (error) {
      showToast(
        `Не удалось обновить предпочтения: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handlePushNotificationsChange = async (enabled: boolean) => {
    if (!user) return;

    setIsUpdatingPreferences(true);

    try {
      await userApi.updateProfile({
        pushNotifications: enabled,
      });
      setPushNotifications(enabled);
      await refreshUser();
      showToast("Предпочтения уведомлений обновлены", "success");
    } catch (error) {
      showToast(
        `Не удалось обновить предпочтения: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleNotificationTimeChange = async (time: string) => {
    if (!user) return;

    setIsUpdatingPreferences(true);

    try {
      await userApi.updateUser({
        notificationTime: time,
      });
      setNotificationTime(time);
      await refreshUser();
      showToast("Время уведомлений обновлено", "success");
    } catch (error) {
      showToast(
        `Не удалось обновить время: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* App Notifications Section (Android only) */}

      <SettingsSection>
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <BellAlertIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Уведомления приложения
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Получайте напоминания о предстоящих платежах и уведомления о новых
              предложениях автоплатежей
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isTauriMobile() && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Отображение уведомлений
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isCheckingAppPermission
                    ? "Проверка..."
                    : appNotificationPermissionGranted
                    ? "Разрешено"
                    : "Не разрешено"}
                </p>
              </div>
              {!appNotificationPermissionGranted &&
                !isCheckingAppPermission && (
                  <button
                    onClick={handleOpenAppNotificationSettings}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Настроить
                  </button>
                )}
              {appNotificationPermissionGranted && (
                <div className="text-green-600 dark:text-green-400">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email уведомления
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Получать напоминания о платежах по email
              </p>
            </div>
            <ToggleSwitch
              checked={emailNotifications}
              onChange={handleEmailNotificationsChange}
              disabled={isUpdatingPreferences}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Push уведомления
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Получать push-уведомления в приложении
              </p>
            </div>
            <ToggleSwitch
              checked={pushNotifications}
              onChange={handlePushNotificationsChange}
              disabled={isUpdatingPreferences}
            />
          </div>

          {(emailNotifications || pushNotifications) && (
            <div>
              <TextInputField
                label="Напоминать в"
                inputId="notificationTime"
                type="time"
                value={notificationTime}
                onChange={(e) => handleNotificationTimeChange(e.target.value)}
                disabled={isUpdatingPreferences}
              />
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
};

export default NotificationsSection;
