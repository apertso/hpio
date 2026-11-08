import { useLanguage } from "../../context/LanguageContext";
import React, { useState, useEffect } from "react";
import {
  SparklesIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import SettingsSection from "../SettingsSection";
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

  return (
    <div className="space-y-8">
      {/* Automation Toggle */}
      {isTauriMobile() && (
        <SettingsSection className="card-base p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 accent-icon rounded-full flex items-center justify-center">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t("Автоматизация уведомлений")}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("Автоматически создавайте записи о платежах на основе банковских уведомлений")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("Включить автоматизацию")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t("Автоматически создавать платежи из уведомлений")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ToggleSwitch
                checked={automationEnabled}
                onChange={handleAutomationToggle}
                disabled={!prerequisitesReady}
              />
              {!prerequisitesReady && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("Выполните действия ниже.")}
                </p>
              )}
            </div>
          </div>
          {automationEnabled && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mt-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t("Состояние сервиса")}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {serviceHeartbeat
                    ? t("Последний пинг: {1}", formatHeartbeatTime(serviceHeartbeat, locale))
                    : t("Пинг пока не получен")}
                </p>
              </div>
              {isCheckingServiceStatus || serviceActive === null ? (
                <Spinner size="sm" />
              ) : serviceActive ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">{t("Сервис активен")}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm2.828-10.828a1 1 0 00-1.414-1.414L10 8.172 8.586 6.758a1 1 0 00-1.414 1.414L8.586 9.586 7.172 11a1 1 0 001.414 1.414L10 11.414l1.414 1.414A1 1 0 0012.828 11l-1.414-1.414 1.414-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">{t("Сервис не активен")}</span>
                </div>
              )}
            </div>
          )}
          {automationEnabled && serviceActive === false && (
            <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                {t("Попробуйте отключить и заново включить разрешение «Чтение, ответ и управление уведомлениями» или перезапустите телефон.")}
              </p>
              {prerequisitesReady && isXiaomiDevice && (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                  {t("На Xiaomi/Poco режим «Ультраэкономия энергии» может полностью отключать сервис, и обойти это ограничение невозможно. Помогает только перезапустить телефон или снова включить разрешение на чтение уведомлений.")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleOpenNotificationSettings}
                  className="primary-action cursor-pointer px-4 py-2 text-sm font-medium rounded-md transition-colors"
                >
                  {t("Открыть настройки")}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 accent-icon rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {t("Чеклист перед запуском")}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Настройте разрешения и питание, чтобы служба не останавливалась")}
                </p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  prerequisitesReady
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                }`}
              >
                {prerequisitesReady ? t("Все готово") : t("Нужно действие")}
              </span>
            </div>

            {prerequisitesReady ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  {t("Все условия выполнены — можно включать автоматизацию. При необходимости вы всегда можете вернуться и проверить настройки.")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("Доступ к уведомлениям")}
                        </p>
                        <Tooltip content={t("Доступ к уведомлениям позволяет сервису считывать входящие уведомления от банков и запускать правила сразу после получения сообщения.")}>
                          <button
                            type="button"
                            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
                          >
                            <InformationIcon className="h-[16px] w-[16px]" />
                          </button>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isCheckingPermission
                          ? t("Проверка...")
                          : notificationPermissionGranted
                          ? t("Предоставлен")
                          : t("Не предоставлен")}
                      </p>
                    </div>
                  </div>
                  {!notificationPermissionGranted && !isCheckingPermission && (
                    <Button
                      variant="primary"
                      onClick={handleOpenNotificationSettings}
                      label={t("Настроить")}
                    ></Button>
                  )}
                  {notificationPermissionGranted && (
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

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("Оптимизация батареи")}
                        </p>
                        <Tooltip content={t("Отключите оптимизацию батареи, чтобы служба автоматически обрабатывала уведомления даже когда приложение закрыто.")}>
                          <button
                            type="button"
                            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
                          >
                            <InformationIcon className="h-[16px] w-[16px]" />
                          </button>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isCheckingBatteryOptimization
                          ? t("Проверка...")
                          : batteryOptimizationDisabled
                          ? t("Отключена")
                          : t("Включена")}
                      </p>
                    </div>
                  </div>
                  {!batteryOptimizationDisabled &&
                    !isCheckingBatteryOptimization && (
                      <Button
                        variant="primary"
                        onClick={handleOpenBatteryOptimizationSettings}
                        label={t("Настроить")}
                      ></Button>
                    )}
                  {batteryOptimizationDisabled && (
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

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t("Автозапуск в фоне")}
                        </p>
                        <Tooltip content={t("Добавьте приложение в список автозапуска, чтобы система не выгружала сервис после очистки памяти.")}>
                          <button
                            type="button"
                            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer"
                          >
                            <InformationIcon className="h-[16px] w-[16px]" />
                          </button>
                        </Tooltip>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isCheckingAutostart
                          ? t("Проверка...")
                          : autostartEnabled
                          ? t("Добавлено")
                          : t("Не добавлено")}
                      </p>
                    </div>
                  </div>
                  {!autostartEnabled && !isCheckingAutostart && (
                    <Button
                      variant="primary"
                      onClick={handleOpenAutostartSettings}
                      label={t("Настроить")}
                    ></Button>
                  )}
                  {autostartEnabled && (
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
              </div>
            )}

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>{t("Конфиденциальность:")}</strong>{t(" Все уведомления обрабатываются только на вашем устройстве. Данные не передаются на сервер.")}
              </p>
            </div>
          </div>
        </SettingsSection>
      )}

    </div>
  );
};

export default AutomationSection;
