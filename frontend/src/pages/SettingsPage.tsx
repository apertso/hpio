import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import getErrorMessage from "../utils/getErrorMessage";
import Spinner from "../components/Spinner";
import {
  UserIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import {
  LockClosedIcon,
  TrashIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import userApi from "../api/userApi";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useAvatarCache } from "../hooks/useAvatarCache";
import { merchantRuleApi, MerchantCategoryRule } from "../api/merchantRuleApi";
import ConfirmModal from "../components/ConfirmModal";
import ToggleSwitch from "../components/ToggleSwitch";
import DeleteAccount from "../components/DeleteAccount";
import { timezones } from "../utils/timezones";
import Select from "../components/Select";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { submitFeedback } from "../api/feedbackApi";
import { isTauri, isTauriMobile } from "../utils/platform";
import {
  checkNotificationPermission,
  openNotificationSettings,
  checkAppNotificationPermission,
  openAppNotificationSettings,
} from "../api/notificationPermission";
import { readLogFile } from "../utils/fileLogger";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import logger from "../utils/logger";
import MobilePanel from "../components/MobilePanel";
import { usePageTitle } from "../context/PageTitleContext";
import { compressProfileImage } from "../utils/imageCompression";

// Схема для всех настроек профиля
const settingsSchema = z.object({
  name: z.string().min(1, "Имя обязательно для заполнения."),
  email: z.string().email("Неверный формат email."),
  notificationMethod: z.enum(["email", "push", "none"]),
  notificationTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Неверный формат времени (HH:mm)",
  }),
  timezone: z.string().min(1, "Часовой пояс обязателен."),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Текущий пароль обязателен."),
    newPassword: z
      .string()
      .min(8, "Новый пароль должен быть не менее 8 символов.")
      .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву.")
      .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву.")
      .regex(/\d/, "Пароль должен содержать хотя бы одну цифру.")
      .regex(
        /[^A-Za-z0-9]/,
        "Пароль должен содержать хотя бы один специальный символ."
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
  });

type SettingsInputs = z.infer<typeof settingsSchema>;
type PasswordInputs = z.infer<typeof passwordSchema>;

const themeOptions = [
  { label: "Системная", value: "system" },
  { label: "Светлая", value: "light" },
  { label: "Тёмная", value: "dark" },
];

const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout, token } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const { setPageTitle } = usePageTitle();
  const metadata = getPageMetadata("settings");

  useEffect(() => {
    setPageTitle("Настройки");
  }, [setPageTitle]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const { avatarUrl, refreshAvatar } = useAvatarCache(user?.photoPath, token);
  const [expandedSection, setExpandedSection] = useState<"password" | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [notificationPermissionGranted, setNotificationPermissionGranted] =
    useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [
    appNotificationPermissionGranted,
    setAppNotificationPermissionGranted,
  ] = useState(false);
  const [isCheckingAppPermission, setIsCheckingAppPermission] = useState(false);
  const handleThemeChange = (value: string | null) => {
    if (value === "system" || value === "light" || value === "dark") {
      setTheme(value);
    }
  };
  const [automationEnabled, setAutomationEnabled] = useState<boolean>(() => {
    return localStorage.getItem("automation_enabled") !== "false";
  });
  const [showDebugToasts, setShowDebugToasts] = useState<boolean>(() => {
    return localStorage.getItem("dev_show_debug_toasts") === "true";
  });
  const [rules, setRules] = useState<MerchantCategoryRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleToDelete, setRuleToDelete] = useState<MerchantCategoryRule | null>(
    null
  );
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  const {
    register: registerSettings,
    handleSubmit: handleSettingsSubmit,
    formState: { errors: settingsErrors, isSubmitting: isSettingsSubmitting },
    control: settingsControl,
    reset: resetSettingsForm,
  } = useForm<SettingsInputs>({
    resolver: zodResolver(settingsSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPasswordForm,
  } = useForm<PasswordInputs>({
    resolver: zodResolver(passwordSchema),
  });

  // Set form values when user data is available
  useEffect(() => {
    if (user) {
      resetSettingsForm({
        name: user.name || "",
        email: user.email || "",
        notificationMethod: user.notificationMethod || "email",
        notificationTime: user.notificationTime || "09:30",
        timezone: user.timezone || "UTC",
      });
    }
  }, [user, resetSettingsForm]);

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

    if (isTauri()) {
      const checkPermission = async () => {
        setIsCheckingPermission(true);
        setIsCheckingAppPermission(true);
        try {
          const status = await checkNotificationPermission();
          setNotificationPermissionGranted(status.granted);

          const appStatus = await checkAppNotificationPermission();
          setAppNotificationPermissionGranted(appStatus.granted);
        } catch (error) {
          console.error("Failed to check notification permission:", error);
        } finally {
          setIsCheckingPermission(false);
          setIsCheckingAppPermission(false);
        }
      };
      checkPermission();
    }
  }, [showToast]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ (до сжатия)
    if (file.size > MAX_FILE_SIZE) {
      showToast(
        `Размер файла превышает ${
          MAX_FILE_SIZE / 1024 / 1024
        } МБ. Пожалуйста, выберите файл меньшего размера.`,
        "error"
      );
      return;
    }

    try {
      setIsCompressing(true);
      const compressedFile = await compressProfileImage(file);

      setIsCompressing(false);
      setIsUploading(true);

      const formData = new FormData();
      formData.append("userPhoto", compressedFile);

      await userApi.uploadPhoto(formData);
      await refreshUser();
      await refreshAvatar();
      showToast("Фото профиля обновлено.", "success");
    } catch (error) {
      showToast(`Ошибка загрузки фото: ${getErrorMessage(error)}`, "error");
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const onDropRejected = (rejections: any[]) => {
    if (rejections.length === 0) return;

    const rejection = rejections[0];
    const errors = rejection.errors || [];

    for (const error of errors) {
      if (error.code === "file-invalid-type") {
        showToast(
          "Пожалуйста, выберите изображение (JPEG, PNG или WEBP).",
          "error"
        );
        break;
      } else if (error.code === "file-too-large") {
        showToast("Размер файла превышает 10 МБ.", "error");
        break;
      } else {
        showToast(`Ошибка при выборе файла: ${error.message}`, "error");
        break;
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    disabled: isCompressing || isUploading,
  });

  const onSettingsSubmit: SubmitHandler<SettingsInputs> = async (data) => {
    try {
      const emailChanged = data.email !== user?.email;
      await userApi.updateProfile(data);
      await refreshUser();
      if (emailChanged) {
        showToast(
          "Настройки сохранены. Мы отправили ссылку для подтверждения на ваш новый email.",
          "success"
        );
      } else {
        showToast("Настройки успешно сохранены.", "success");
      }
    } catch (error) {
      const message = getErrorMessage(error);
      showToast(message, "error");
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordInputs> = async (data) => {
    try {
      await userApi.updateProfile({
        password: data.newPassword,
        currentPassword: data.currentPassword,
      });
      resetPasswordForm();
      showToast("Пароль успешно изменен.", "success");
    } catch (error) {
      const message = getErrorMessage(error);
      showToast(message, "error");
    }
  };

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

  const handleDeleteAccount = async (
    reason: string,
    feedback: string,
    file: File | null
  ) => {
    try {
      setIsDeleting(true);
      if (feedback.trim().length > 0 || file || reason !== "no_answer") {
        try {
          let description = feedback.trim();
          if (reason !== "no_answer") {
            if (description) {
              description = `Причина удаления: ${reason}\n\n${description}`;
            } else {
              description = `Причина удаления: ${reason}`;
            }
          }
          await submitFeedback(description, file || undefined);
        } catch (e) {
          // ошибку отправки отзыва игнорируем
        }
      }
      await userApi.deleteAccount();
      showToast("Ваш аккаунт был успешно удалён.", "success");
      setIsDeleteModalOpen(false);
      setExpandedSection(null);
      logout();
    } catch (error) {
      showToast(
        `Ошибка при удалении аккаунта: ${getErrorMessage(error)}`,
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMobileOverrideChange = (value: string | null) => {
    const newValue = value || "-";
    setMobileOverride(newValue);
    if (newValue === "-") {
      localStorage.removeItem("dev_mobile_override");
    } else {
      localStorage.setItem("dev_mobile_override", newValue);
    }
    // Force page reload to apply the mobile/desktop mode changes
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
      // Также сбросим флаг завершения onboarding
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

  const handleOpenNotificationSettings = async () => {
    if (!isTauri()) {
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
    } catch (error) {
      showToast("Не удалось открыть настройки", "error");
    }
  };

  const handleOpenAppNotificationSettings = async () => {
    if (!isTauri()) {
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
    } catch (error) {
      showToast("Не удалось открыть настройки", "error");
    }
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
    if (!isTauri()) {
      showToast("Эта функция доступна только в мобильном приложении", "error");
      return;
    }

    try {
      // Add a test log entry to ensure logging works
      console.log("Testing file logger...");
      logger.info(
        "Test log entry from Settings page - download logs button clicked"
      );

      const logContent = await readLogFile();

      if (!logContent) {
        showToast("Файл логов пуст или не существует", "info");
        return;
      }

      // Open save dialog
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

  return (
    <>
      <PageMeta {...metadata} />

      <div className="dark:text-gray-100">
        <div className="w-full md:w-2xl lg:w-3xl mx-auto">
          <div className="flex justify-between items-center md:mb-6 px-4 md:px-0">
            <h2 className="hidden md:block text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Настройки
            </h2>
          </div>

          <div className="space-y-8 px-4 md:px-0">
            {/* Profile Section */}
            <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
              <FormBlock className="w-full">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Профиль и уведомления
                </h3>
                <div className="flex flex-col gap-6">
                  {/* Avatar and Name on same line */}
                  <div className="flex items-center gap-6">
                    {/* Avatar Section - Modern UX Pattern with hover/drag overlay */}
                    <div className="flex-shrink-0">
                      <div
                        {...getRootProps()}
                        className={`relative flex-shrink-0 cursor-pointer group w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isDragActive
                            ? "bg-blue-100 dark:bg-blue-900/30 shadow-blue-500  shadow-[0px_0px_3px_3px]"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-14 h-14 text-gray-400 dark:text-gray-500" />
                        )}

                        {/* Edit Pencil Icon - Always visible in corner */}
                        <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center transition-colors duration-200 shadow-md">
                          <svg
                            className="w-3.5 h-3.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </div>

                        {(isCompressing || isUploading) && (
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center z-20">
                            <Spinner size="sm" />
                          </div>
                        )}
                        <input {...getInputProps()} />
                      </div>
                    </div>

                    {/* Name Field */}
                    <div className="flex-grow">
                      <Input
                        label="Имя"
                        id="name"
                        type="text"
                        {...registerSettings("name")}
                        error={settingsErrors.name?.message}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                        >
                          Email
                        </label>
                        {user?.isVerified ? (
                          <span className="text-xs flex items-center text-green-600 dark:text-green-400">
                            <CheckBadgeIcon className="h-4 w-4 mr-1" />{" "}
                            Подтвержден
                          </span>
                        ) : (
                          <span className="text-xs flex items-center text-yellow-600 dark:text-yellow-400">
                            <ExclamationCircleIcon className="h-4 w-4 mr-1" />{" "}
                            Не подтвержден
                          </span>
                        )}
                      </div>
                      <Input
                        id="email"
                        type="email"
                        {...registerSettings("email")}
                        error={settingsErrors.email?.message}
                      />
                    </div>
                    <Controller
                      name="notificationMethod"
                      control={settingsControl}
                      defaultValue={user?.notificationMethod || "email"}
                      render={({ field }) => (
                        <Select
                          label="Напоминания о платежах"
                          options={[
                            { label: "Email", value: "email" },
                            { label: "Пуш-уведомление", value: "push" },
                            { label: "Выключены", value: "none" },
                          ]}
                          value={field.value}
                          onChange={field.onChange}
                          error={settingsErrors.notificationMethod?.message}
                        />
                      )}
                    />
                    <Input
                      label="Напоминать в"
                      id="notificationTime"
                      type="time"
                      {...registerSettings("notificationTime")}
                      error={settingsErrors.notificationTime?.message}
                    />
                    <Controller
                      name="timezone"
                      control={settingsControl}
                      defaultValue={user?.timezone || "UTC"}
                      render={({ field }) => (
                        <Select
                          label="Часовой пояс"
                          options={timezones}
                          value={field.value}
                          onChange={field.onChange}
                          error={settingsErrors.timezone?.message}
                        />
                      )}
                    />
                    <div>
                      <Select
                        label="Тема приложения"
                        options={themeOptions}
                        value={theme}
                        onChange={handleThemeChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right mt-6">
                  <button
                    type="submit"
                    disabled={isSettingsSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {isSettingsSubmitting ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </FormBlock>
            </form>

            {/* Automation Rules Section */}
            <FormBlock className="w-full">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Правила автоматизации
              </h3>

              {isTauriMobile() && (
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Включить автоматизацию
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Автоматически создавать платежи из уведомлений
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={automationEnabled}
                    onChange={handleAutomationToggle}
                  />
                </div>
              )}

              <div>
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Ваши правила
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Здесь показаны все продавцы, для которых вы настроили
                  автоматическое присвоение категории.
                </p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
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
              </div>
            </FormBlock>

            {/* Password Section */}
            <FormBlock className="w-full">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Безопасность
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === "password" ? null : "password"
                    )
                  }
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-500"
                >
                  <LockClosedIcon className="w-5 h-5" />
                  <span>Сменить пароль</span>
                </button>
              </div>
              {/* Desktop Inline Form */}
              <div
                className={`hidden md:block overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedSection === "password"
                    ? "max-h-screen mt-6"
                    : "max-h-0"
                }`}
              >
                {expandedSection === "password" && (
                  <form
                    onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                    className="space-y-4"
                  >
                    <Input
                      id="currentPassword"
                      label="Текущий пароль"
                      type="password"
                      {...registerPassword("currentPassword")}
                      error={passwordErrors.currentPassword?.message}
                    />
                    <Input
                      id="newPassword"
                      label="Новый пароль"
                      type="password"
                      {...registerPassword("newPassword")}
                      error={passwordErrors.newPassword?.message}
                    />
                    <Input
                      id="confirmPassword"
                      label="Подтвердите новый пароль"
                      type="password"
                      {...registerPassword("confirmPassword")}
                      error={passwordErrors.confirmPassword?.message}
                    />
                    <div className="text-right">
                      <button
                        type="submit"
                        disabled={isPasswordSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed"
                      >
                        {isPasswordSubmitting
                          ? "Сохранение..."
                          : "Сменить пароль"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </FormBlock>
            {/* Delete Account Section */}
            <FormBlock className="w-full">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Опасная зона
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Удалить аккаунт</span>
                </button>
              </div>
            </FormBlock>

            {/* App Notifications Section (Android only) */}
            {isTauriMobile() && (
              <FormBlock className="w-full">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <BellAlertIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Уведомления приложения
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Получайте напоминания о предстоящих платежах и уведомления
                      о новых предложениях автоплатежей
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
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
                </div>
              </FormBlock>
            )}

            {/* Notification Automation Section (Android only) */}
            {isTauriMobile() && (
              <FormBlock className="w-full">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <BellAlertIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Автоматизация уведомлений
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Автоматически создавайте записи о платежах на основе
                      банковских уведомлений
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Permission Status */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Доступ к уведомлениям
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isCheckingPermission
                          ? "Проверка..."
                          : notificationPermissionGranted
                          ? "Предоставлен"
                          : "Не предоставлен"}
                      </p>
                    </div>
                    {!notificationPermissionGranted &&
                      !isCheckingPermission && (
                        <button
                          onClick={handleOpenNotificationSettings}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                        >
                          Настроить
                        </button>
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

                  {/* Info Section */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Конфиденциальность:</strong> Все уведомления
                      обрабатываются только на вашем устройстве. Данные не
                      передаются на сервер.
                    </p>
                  </div>
                </div>
              </FormBlock>
            )}

            {/* Development Section */}
            {import.meta.env.VITE_ENABLE_DEV_FEATURES === "true" && (
              <FormBlock className="w-full">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Разработка
                </h3>
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
                  <div>
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
                          сегодня сохраняются в файл logs.txt. Вы можете скачать
                          или поделиться этим файлом.
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadLogs}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                      >
                        Скачать логи
                      </button>
                    </div>
                  </div>
                )}
              </FormBlock>
            )}
          </div>
          <p className="mt-12 text-center text-xs text-gray-500 dark:text-gray-600">
            Версия приложения: 0.0.9
          </p>
        </div>
      </div>

      {/* Mobile Panels */}
      <MobilePanel
        isOpen={expandedSection === "password"}
        onClose={() => setExpandedSection(null)}
        title="Сменить пароль"
      >
        <form
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          className="space-y-4"
        >
          <Input
            id="currentPasswordMobile"
            label="Текущий пароль"
            type="password"
            {...registerPassword("currentPassword")}
            error={passwordErrors.currentPassword?.message}
          />
          <Input
            id="newPasswordMobile"
            label="Новый пароль"
            type="password"
            {...registerPassword("newPassword")}
            error={passwordErrors.newPassword?.message}
          />
          <Input
            id="confirmPasswordMobile"
            label="Подтвердите новый пароль"
            type="password"
            {...registerPassword("confirmPassword")}
            error={passwordErrors.confirmPassword?.message}
          />
          <div className="text-right">
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isPasswordSubmitting ? "Сохранение..." : "Сменить пароль"}
            </button>
          </div>
        </form>
      </MobilePanel>

      <ConfirmModal
        isOpen={!!ruleToDelete}
        onClose={() => setRuleToDelete(null)}
        onConfirm={handleConfirmDeleteRule}
        title="Удалить правило?"
        message={`Вы уверены, что хотите удалить правило для "${ruleToDelete?.merchantKeyword}"? Это действие нельзя будет отменить.`}
        confirmText="Удалить"
        isConfirming={isDeletingRule}
      />

      <DeleteAccount
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </>
  );
};

export default SettingsPage;
