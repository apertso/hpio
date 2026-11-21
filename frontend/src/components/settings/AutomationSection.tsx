import { useLanguage } from "../../context/LanguageContext";
import React, { useState, useEffect } from "react";
import {
  SettingsCheckIcon,
  SettingsGroup,
  SettingsHeader,
  SettingsNotice,
  SettingsRow,
} from "./SettingsLayout";
import ToggleSwitch from "../ToggleSwitch";
import Spinner from "../Spinner";
import { useToast } from "../../context/ToastContext";
import { Tooltip } from "../Tooltip";
import { InformationIcon } from "../InformationIcon";
import { isTauriMobile } from "../../utils/platform";
import {
  checkNotificationPermission,
  openNotificationSettings,
  checkBatteryOptimizationDisabled,
  openBatteryOptimizationSettings,
  checkAutostartEnabled,
  openAutostartSettings,
  getNotificationServiceHeartbeat,
  pingNotificationService,
  getDeviceManufacturer,
} from "../../api/notificationPermission";
import logger from "../../utils/logger";
import { Button } from "../Button";

const SERVICE_HEARTBEAT_TIMEOUT_MS = 5000;
const SERVICE_HEARTBEAT_POLL_INTERVAL_MS = 500;

const formatHeartbeatTime = (timestamp: number, locale: string): string => {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const AutomationSection: React.FC = () => {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const [automationEnabled, setAutomationEnabled] = useState<boolean>(() => {
    return localStorage.getItem("automation_enabled") !== "false";
  });
  const [notificationPermissionGranted, setNotificationPermissionGranted] =
    useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [batteryOptimizationDisabled, setBatteryOptimizationDisabled] =
    useState(false);
  const [isCheckingBatteryOptimization, setIsCheckingBatteryOptimization] =
    useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [isCheckingAutostart, setIsCheckingAutostart] = useState(false);
  const [serviceHeartbeat, setServiceHeartbeat] = useState<number | null>(null);
  const [serviceActive, setServiceActive] = useState<boolean | null>(null);
  const [isCheckingServiceStatus, setIsCheckingServiceStatus] = useState(false);
  const [deviceManufacturer, setDeviceManufacturer] = useState("");
  const [initialCheckComplete, setInitialCheckComplete] = useState(
    !isTauriMobile()
  );
  const prerequisitesReady =
    notificationPermissionGranted &&
    batteryOptimizationDisabled &&
    autostartEnabled;
  const isXiaomiDevice =
    deviceManufacturer.includes("xiaomi") ||
    deviceManufacturer.includes("poco");

  // Проверяем статус разрешения уведомлений и загружаем правила
  useEffect(() => {
    if (isTauriMobile()) {
      const checkPermission = async () => {
        setIsCheckingPermission(true);
        setIsCheckingBatteryOptimization(true);
        setIsCheckingAutostart(true);
        try {
          const status = await checkNotificationPermission();
          setNotificationPermissionGranted(status.granted);

          const batteryStatus = await checkBatteryOptimizationDisabled();
          setBatteryOptimizationDisabled(batteryStatus);
          const autostartStatus = await checkAutostartEnabled();
          setAutostartEnabled(autostartStatus);
          const manufacturer = await getDeviceManufacturer();
          setDeviceManufacturer(manufacturer ?? "");
        } catch (error) {
          logger.error("Failed to check notification permission:", error);
        } finally {
          setIsCheckingPermission(false);
          setIsCheckingBatteryOptimization(false);
          setIsCheckingAutostart(false);
          setInitialCheckComplete(true);
        }
      };
      checkPermission();
    }
  }, [showToast]);

  useEffect(() => {
    if (!isTauriMobile()) {
      return;
    }

    let cancelled = false;

    const checkServiceHeartbeat = async () => {
      setIsCheckingServiceStatus(true);
      try {
        const initialHeartbeat = await getNotificationServiceHeartbeat();
        if (cancelled) {
          return;
        }
        setServiceHeartbeat(initialHeartbeat);

        await pingNotificationService();

        const startTime = Date.now();
        let latestHeartbeat = initialHeartbeat;

        while (Date.now() - startTime < SERVICE_HEARTBEAT_TIMEOUT_MS) {
          await new Promise((resolve) =>
            setTimeout(resolve, SERVICE_HEARTBEAT_POLL_INTERVAL_MS)
          );

          if (cancelled) {
            return;
          }

          latestHeartbeat = await getNotificationServiceHeartbeat();

          if (cancelled) {
            return;
          }

          const heartbeatChanged =
            (initialHeartbeat === null && latestHeartbeat !== null) ||
            (latestHeartbeat !== null &&
              initialHeartbeat !== null &&
              latestHeartbeat > initialHeartbeat);

          if (heartbeatChanged && latestHeartbeat !== null) {
            setServiceHeartbeat(latestHeartbeat);
            setServiceActive(true);
            return;
          }
        }

        if (cancelled) {
          return;
        }

        if (latestHeartbeat !== null) {
          setServiceHeartbeat(latestHeartbeat);
        }

        setServiceActive(false);
      } catch (error) {
        if (cancelled) {
          return;
        }
        logger.error(
          "Failed to refresh notification service heartbeat:",
          error
        );
        setServiceActive(false);
      } finally {
        if (!cancelled) {
          setIsCheckingServiceStatus(false);
        }
      }
    };

    checkServiceHeartbeat();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialCheckComplete) {
      return;
    }
    if (!prerequisitesReady && automationEnabled) {
      setAutomationEnabled(false);
      localStorage.setItem("automation_enabled", "false");
    }
  }, [prerequisitesReady, automationEnabled, initialCheckComplete]);

  const handleAutomationToggle = (enabled: boolean) => {
    setAutomationEnabled(enabled);
    localStorage.setItem("automation_enabled", String(enabled));
    showToast(
      t("Автоматизация по уведомлениям {1}.", t(enabled ? "включена" : "выключена")),
      "info"
    );
  };

  const handleOpenNotificationSettings = async () => {
    if (!isTauriMobile()) {
      showToast(t("Эта функция доступна только в мобильном приложении"), "error");
      return;
    }

    try {
      await openNotificationSettings();
      showToast(t("Откройте настройки и предоставьте доступ"), "info");
      // Перепроверяем разрешение через 2 секунды
      setTimeout(async () => {
        const status = await checkNotificationPermission();
        setNotificationPermissionGranted(status.granted);
        if (status.granted) {
          showToast(t("Доступ к уведомлениям предоставлен!"), "success");
        }
      }, 2000);
    } catch {
      showToast(t("Не удалось открыть настройки"), "error");
    }
  };

  const handleOpenBatteryOptimizationSettings = async () => {
    if (!isTauriMobile()) {
      showToast(t("Эта функция доступна только в мобильном приложении"), "error");
      return;
    }

    try {
      await openBatteryOptimizationSettings();
      showToast(t("Отключите оптимизацию батареи для приложения"), "info");
      // Перепроверяем статус через 2 секунды
      setTimeout(async () => {
        const status = await checkBatteryOptimizationDisabled();
        setBatteryOptimizationDisabled(status);
        if (status) {
          showToast(t("Оптимизация батареи отключена!"), "success");
        }
      }, 2000);
    } catch {
      showToast(t("Не удалось открыть настройки"), "error");
    }
  };

  const handleOpenAutostartSettings = async () => {
    if (!isTauriMobile()) {
      showToast(t("Эта функция доступна только в мобильном приложении"), "error");
      return;
    }

    try {
      await openAutostartSettings();
      showToast(t("Добавьте приложение в список автозапуска"), "info");
      setTimeout(async () => {
        const status = await checkAutostartEnabled();
        setAutostartEnabled(status);
        if (status) {
          showToast(t("Автозапуск включен!"), "success");
        }
      }, 2000);
    } catch {
      showToast(t("Не удалось открыть настройки"), "error");
    }
  };

  // Строка чеклиста: статус условия и кнопка перехода в системные настройки
  const renderChecklistRow = (options: {
    label: string;
    tooltip: string;
    isChecking: boolean;
    isDone: boolean;
    doneText: string;
    pendingText: string;
    onOpen: () => void;
  }): React.ReactNode => (
    <SettingsRow
      inline
      label={
        <span className="inline-flex items-center gap-1">
          {options.label}
          <Tooltip content={options.tooltip}>
            <button
              type="button"
              aria-label={options.tooltip}
              className="flex size-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <InformationIcon className="size-4" />
            </button>
          </Tooltip>
        </span>
      }
      description={
        options.isChecking
          ? t("Проверка...")
          : options.isDone
          ? options.doneText
          : options.pendingText
      }
      control={
        options.isChecking ? (
          <Spinner size="sm" />
        ) : options.isDone ? (
          <SettingsCheckIcon label={options.doneText} />
        ) : (
          <Button
            variant="secondary"
            size="small"
            onClick={options.onOpen}
            label={t("Настроить")}
          />
        )
      }
    />
  );

  return (
    <div>
      <SettingsHeader
        title={t("Автоматизация")}
        description={t("Автоматически создавайте записи о платежах на основе банковских уведомлений")}
      />

      {!isTauriMobile() ? (
        <SettingsNotice>
          {t("Эта функция доступна только в мобильном приложении")}
        </SettingsNotice>
      ) : (
        <div className="space-y-8">
          <SettingsGroup title={t("Автоматизация уведомлений")}>
            <SettingsRow
              inline
              label={t("Включить автоматизацию")}
              description={
                prerequisitesReady
                  ? t("Автоматически создавать платежи из уведомлений")
                  : `${t("Автоматически создавать платежи из уведомлений")}. ${t("Выполните действия ниже.")}`
              }
              control={
                <ToggleSwitch
                  checked={automationEnabled}
                  onChange={handleAutomationToggle}
                  disabled={!prerequisitesReady}
                />
              }
            />
            {automationEnabled && (
              <SettingsRow
                inline
                label={t("Состояние сервиса")}
                description={
                  serviceHeartbeat
                    ? t("Последний пинг: {1}", formatHeartbeatTime(serviceHeartbeat, locale))
                    : t("Пинг пока не получен")
                }
                control={
                  isCheckingServiceStatus || serviceActive === null ? (
                    <Spinner size="sm" />
                  ) : serviceActive ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                      <SettingsCheckIcon />
                      {t("Сервис активен")}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {t("Сервис не активен")}
                    </span>
                  )
                }
              >
                {serviceActive === false && (
                  <SettingsNotice tone="danger" className="mt-3">
                    <p>
                      {t("Попробуйте отключить и заново включить разрешение «Чтение, ответ и управление уведомлениями» или перезапустите телефон.")}
                    </p>
                    {prerequisitesReady && isXiaomiDevice && (
                      <p className="mt-2 text-xs">
                        {t("На Xiaomi/Poco режим «Ультраэкономия энергии» может полностью отключать сервис, и обойти это ограничение невозможно. Помогает только перезапустить телефон или снова включить разрешение на чтение уведомлений.")}
                      </p>
                    )}
                    <Button
                      variant="secondary"
                      size="small"
                      className="mt-3"
                      onClick={handleOpenNotificationSettings}
                      label={t("Открыть настройки")}
                    />
                  </SettingsNotice>
                )}
              </SettingsRow>
            )}
          </SettingsGroup>

          <SettingsGroup
            title={
              <span className="flex items-center justify-between gap-3">
                {t("Чеклист перед запуском")}
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    prerequisitesReady
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-200"
                  }`}
                >
                  {prerequisitesReady ? t("Все готово") : t("Нужно действие")}
                </span>
              </span>
            }
            description={t("Настройте разрешения и питание, чтобы служба не останавливалась")}
          >
            {renderChecklistRow({
              label: t("Доступ к уведомлениям"),
              tooltip: t("Доступ к уведомлениям позволяет сервису считывать входящие уведомления от банков и запускать правила сразу после получения сообщения."),
              isChecking: isCheckingPermission,
              isDone: notificationPermissionGranted,
              doneText: t("Предоставлен"),
              pendingText: t("Не предоставлен"),
              onOpen: handleOpenNotificationSettings,
            })}
            {renderChecklistRow({
              label: t("Оптимизация батареи"),
              tooltip: t("Отключите оптимизацию батареи, чтобы служба автоматически обрабатывала уведомления даже когда приложение закрыто."),
              isChecking: isCheckingBatteryOptimization,
              isDone: batteryOptimizationDisabled,
              doneText: t("Отключена"),
              pendingText: t("Включена"),
              onOpen: handleOpenBatteryOptimizationSettings,
            })}
            {renderChecklistRow({
              label: t("Автозапуск в фоне"),
              tooltip: t("Добавьте приложение в список автозапуска, чтобы система не выгружала сервис после очистки памяти."),
              isChecking: isCheckingAutostart,
              isDone: autostartEnabled,
              doneText: t("Добавлено"),
              pendingText: t("Не добавлено"),
              onOpen: handleOpenAutostartSettings,
            })}
          </SettingsGroup>

          <SettingsNotice>
            <strong>{t("Конфиденциальность:")}</strong>
            {t(" Все уведомления обрабатываются только на вашем устройстве. Данные не передаются на сервер.")}
          </SettingsNotice>
        </div>
      )}
    </div>
  );
};

export default AutomationSection;
