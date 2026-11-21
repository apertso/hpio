import { useLanguage } from "../../context/LanguageContext";
import React, { useState, useEffect } from "react";
import { Button } from "../Button";
import {
  SettingsCheckIcon,
  SettingsGroup,
  SettingsHeader,
  SettingsRow,
} from "./SettingsLayout";
import ToggleSwitch from "../ToggleSwitch";
import TimeInput from "../TimeInput";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { isTauriMobile } from "../../utils/platform";
import {
  checkAppNotificationPermission,
  openAppNotificationSettings,
} from "../../api/notificationPermission";
import userApi from "../../api/userApi";
import getErrorMessage from "../../utils/getErrorMessage";
import logger from "../../utils/logger";

const NotificationsSection: React.FC = () => {
  const { t } = useLanguage();
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
          logger.error("Failed to check app notification permission:", error);
        } finally {
          setIsCheckingAppPermission(false);
        }
      };
      checkPermission();
    }
  }, []);

  const handleOpenAppNotificationSettings = async () => {
    if (!isTauriMobile()) {
      showToast(t("Эта функция доступна только в мобильном приложении"), "error");
      return;
    }

    try {
      await openAppNotificationSettings();
      showToast(t("Откройте настройки и разрешите уведомления"), "info");
      // Перепроверяем разрешение через 2 секунды
      setTimeout(async () => {
        const status = await checkAppNotificationPermission();
        setAppNotificationPermissionGranted(status.granted);
        if (status.granted) {
          showToast(t("Уведомления приложения разрешены!"), "success");
        }
      }, 2000);
    } catch {
      showToast(t("Не удалось открыть настройки"), "error");
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
      showToast(t("Предпочтения уведомлений обновлены"), "success");
    } catch (error) {
      showToast(
        t("Не удалось обновить предпочтения: {1}", t(getErrorMessage(error))),
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
      showToast(t("Предпочтения уведомлений обновлены"), "success");
    } catch (error) {
      showToast(
        t("Не удалось обновить предпочтения: {1}", t(getErrorMessage(error))),
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
      await userApi.updateProfile({
        notificationTime: time,
      });
      setNotificationTime(time);
      await refreshUser();
      showToast(t("Время уведомлений обновлено"), "success");
    } catch (error) {
      showToast(
        t("Не удалось обновить время: {1}", t(getErrorMessage(error))),
        "error"
      );
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  return (
    <div>
      <SettingsHeader
        title={t("Уведомления")}
        description={t("Получайте напоминания о предстоящих платежах и уведомления о новых предложениях автоплатежей")}
      />

      <div className="space-y-8">
        <SettingsGroup title={t("Каналы")}>
          {isTauriMobile() && (
            <SettingsRow
              inline
              label={t("Отображение уведомлений")}
              description={
                isCheckingAppPermission
                  ? t("Проверка...")
                  : appNotificationPermissionGranted
                  ? t("Разрешено")
                  : t("Не разрешено")
              }
              control={
                isCheckingAppPermission ? null : appNotificationPermissionGranted ? (
                  <SettingsCheckIcon label={t("Разрешено")} />
                ) : (
                  <Button
                    variant="secondary"
                    size="small"
                    label={t("Настроить")}
                    onClick={handleOpenAppNotificationSettings}
                  />
                )
              }
            />
          )}
          <SettingsRow
            inline
            label={t("Email уведомления")}
            description={t("Получать напоминания о платежах по email")}
            control={
              <ToggleSwitch
                checked={emailNotifications}
                onChange={handleEmailNotificationsChange}
                disabled={isUpdatingPreferences}
              />
            }
          />
          <SettingsRow
            inline
            label={t("Push уведомления")}
            description={t("Получать push-уведомления в приложении")}
            control={
              <ToggleSwitch
                checked={pushNotifications}
                onChange={handlePushNotificationsChange}
                disabled={isUpdatingPreferences}
              />
            }
          />
        </SettingsGroup>

        {(emailNotifications || pushNotifications) && (
          <SettingsGroup title={t("Расписание")}>
            <SettingsRow
              inline
              label={t("Напоминать в")}
              description={t("Время ежедневного напоминания о платежах")}
              htmlFor="notificationTime-hours"
              control={
                <TimeInput
                  id="notificationTime"
                  value={notificationTime}
                  onChange={handleNotificationTimeChange}
                />
              }
            />
          </SettingsGroup>
        )}
      </div>
    </div>
  );
};

export default NotificationsSection;
