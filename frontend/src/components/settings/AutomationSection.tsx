import React, { useState, useEffect } from "react";
import {
  SparklesIcon,
  TrashIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import SettingsSection from "../SettingsSection";
import ToggleSwitch from "../ToggleSwitch";
import Spinner from "../Spinner";
import ConfirmModal from "../ConfirmModal";
import { useToast } from "../../context/ToastContext";
import { Tooltip } from "../Tooltip";
import { InformationIcon } from "../InformationIcon";
import {
  merchantRuleApi,
  MerchantCategoryRule,
} from "../../api/merchantRuleApi";
import getErrorMessage from "../../utils/getErrorMessage";
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

const formatHeartbeatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const AutomationSection: React.FC = () => {
  const { showToast } = useToast();
  const [automationEnabled, setAutomationEnabled] = useState<boolean>(() => {
    return localStorage.getItem("automation_enabled") !== "false";
  });
  const [rules, setRules] = useState<MerchantCategoryRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleToDelete, setRuleToDelete] = useState<MerchantCategoryRule | null>(
    null
  );
  const [isDeletingRule, setIsDeletingRule] = useState(false);
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
    const fetchRules = async () => {
      try {
        setRulesLoading(true);
        const fetchedRules = await merchantRuleApi.getMerchantRules();
        setRules(fetchedRules);
      } catch (error) {
        showToast(
          `Не удалось загрузить правила: ${getErrorMessage(error)}`,
          "error"
        );
      } finally {
        setRulesLoading(false);
      }
    };

    fetchRules();

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
        if (cancelled) {
          return;
        }
        setIsCheckingServiceStatus(false);
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
      `Автоматизация по уведомлениям ${enabled ? "включена" : "выключена"}.`,
      "info"
    );
  };

  const handleDeleteRuleClick = (rule: MerchantCategoryRule) => {
    setRuleToDelete(rule);
  };

  const handleConfirmDeleteRule = async () => {
    if (!ruleToDelete) return;

    setIsDeletingRule(true);
    try {
      await merchantRuleApi.deleteMerchantRule(ruleToDelete.id);
      setRules((prevRules) =>
        prevRules.filter((r) => r.id !== ruleToDelete.id)
      );
      showToast("Правило успешно удалено.", "success");
    } catch (error) {
      showToast(
        `Ошибка при удалении правила: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setIsDeletingRule(false);
      setRuleToDelete(null);
    }
  };

  const handleOpenNotificationSettings = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      await openNotificationSettings();
      showToast("Откройте настройки и предоставьте доступ", "info");
      // Перепроверяем разрешение через 2 секунды
      setTimeout(async () => {
        const status = await checkNotificationPermission();
        setNotificationPermissionGranted(status.granted);
        if (status.granted) {
          showToast("Доступ к уведомлениям предоставлен!", "success");
        }
      }, 2000);
    } catch {
      showToast("Не удалось открыть настройки", "error");
    }
  };

  const handleOpenBatteryOptimizationSettings = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      await openBatteryOptimizationSettings();
      showToast("Отключите оптимизацию батареи для приложения", "info");
      // Перепроверяем статус через 2 секунды
      setTimeout(async () => {
        const status = await checkBatteryOptimizationDisabled();
        setBatteryOptimizationDisabled(status);
        if (status) {
          showToast("Оптимизация батареи отключена!", "success");
        }
      }, 2000);
    } catch {
      showToast("Не удалось открыть настройки", "error");
    }
  };

  const handleOpenAutostartSettings = async () => {
    if (!isTauriMobile()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      await openAutostartSettings();
      showToast("Добавьте приложение в список автозапуска", "info");
      setTimeout(async () => {
        const status = await checkAutostartEnabled();
        setAutostartEnabled(status);
        if (status) {
          showToast("Автозапуск включен!", "success");
        }
      }, 2000);
    } catch {
      showToast("Не удалось открыть настройки", "error");
    }
  };

  return (
    <div className="space-y-8">
      {/* Automation Toggle */}
      {isTauriMobile() && (
        <SettingsSection className="card-base p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Автоматизация уведомлений
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Автоматически создавайте записи о платежах на основе банковских
                уведомлений
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Включить автоматизацию
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Автоматически создавать платежи из уведомлений
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
                  Выполните действия ниже.
                </p>
              )}
            </div>
          </div>
          {automationEnabled && (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mt-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Состояние сервиса
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {serviceHeartbeat
                    ? `Последний пинг: ${formatHeartbeatTime(serviceHeartbeat)}`
                    : "Пинг пока не получен"}
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
                  <span className="text-sm font-medium">Сервис активен</span>
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
                  <span className="text-sm font-medium">Сервис не активен</span>
                </div>
              )}
            </div>
          )}
          {automationEnabled && serviceActive === false && (
            <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                Попробуйте отключить и заново включить разрешение «Чтение, ответ
                и управление уведомлениями» или перезапустите телефон.
              </p>
              {prerequisitesReady && isXiaomiDevice && (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300">
                  На Xiaomi/Poco режим «Ультраэкономия энергии» может полностью
                  отключать сервис, и обойти это ограничение невозможно.
                  Помогает только перезапустить телефон или снова включить
                  разрешение на чтение уведомлений.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleOpenNotificationSettings}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                >
                  Открыть настройки
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  Чеклист перед запуском
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Настройте разрешения и питание, чтобы служба не
                  останавливалась
                </p>
              </div>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  prerequisitesReady
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                }`}
              >
                {prerequisitesReady ? "Все готово" : "Нужно действие"}
              </span>
            </div>

            {prerequisitesReady ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Все условия выполнены — можно включать автоматизацию. При
                  необходимости вы всегда можете вернуться и проверить
                  настройки.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Доступ к уведомлениям
                        </p>
                        <Tooltip content="Доступ к уведомлениям позволяет сервису считывать входящие уведомления от банков и запускать правила сразу после получения сообщения.">
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
                          ? "Проверка..."
                          : notificationPermissionGranted
                          ? "Предоставлен"
                          : "Не предоставлен"}
                      </p>
                    </div>
                  </div>
                  {!notificationPermissionGranted && !isCheckingPermission && (
                    <Button
                      variant="primary"
                      onClick={handleOpenNotificationSettings}
                      label="Настроить"
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
                          Оптимизация батареи
                        </p>
                        <Tooltip content="Отключите оптимизацию батареи, чтобы служба автоматически обрабатывала уведомления даже когда приложение закрыто.">
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
                          ? "Проверка..."
                          : batteryOptimizationDisabled
                          ? "Отключена"
                          : "Включена"}
                      </p>
                    </div>
                  </div>
                  {!batteryOptimizationDisabled &&
                    !isCheckingBatteryOptimization && (
                      <Button
                        variant="primary"
                        onClick={handleOpenBatteryOptimizationSettings}
                        label="Настроить"
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
                          Автозапуск в фоне
                        </p>
                        <Tooltip content="Добавьте приложение в список автозапуска, чтобы система не выгружала сервис после очистки памяти.">
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
                          ? "Проверка..."
                          : autostartEnabled
                          ? "Добавлено"
                          : "Не добавлено"}
                      </p>
                    </div>
                  </div>
                  {!autostartEnabled && !isCheckingAutostart && (
                    <Button
                      variant="primary"
                      onClick={handleOpenAutostartSettings}
                      label="Настроить"
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
                <strong>Конфиденциальность:</strong> Все уведомления
                обрабатываются только на вашем устройстве. Данные не передаются
                на сервер.
              </p>
            </div>
          </div>
        </SettingsSection>
      )}

      {/* Automation Rules Section */}
      {automationEnabled && (
        <SettingsSection className="card-base p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Ваши правила
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Здесь показаны все продавцы, для которых вы настроили
                автоматическое присвоение категории.
              </p>
            </div>
          </div>
          <div className="border border-gray-100 dark:border-gray-800 rounded-lg">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {rulesLoading ? (
                <li className="p-4 flex justify-center items-center">
                  <Spinner size="sm" />
                </li>
              ) : rules.length > 0 ? (
                rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {rule.merchantKeyword}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {rule.category?.name || "Неизвестная категория"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteRuleClick(rule)}
                      className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors"
                      aria-label={`Удалить правило для ${rule.merchantKeyword}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </li>
                ))
              ) : (
                <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  У вас пока нет правил автоматизации.
                </li>
              )}
            </ul>
          </div>
        </SettingsSection>
      )}

      <ConfirmModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDeleteRule}
        title="Удалить правило?"
        message={`Вы уверены, что хотите удалить правило для "${ruleToDelete?.merchantKeyword}"? Это действие нельзя будет отменить.`}
        confirmText="Удалить"
        isConfirming={isDeletingRule}
      />
    </div>
  );
};

export default AutomationSection;
