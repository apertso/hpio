import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import getErrorMessage from "../utils/getErrorMessage";
import Spinner from "../components/Spinner";
import axiosInstance from "../api/axiosInstance";
import {
  UserIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import { LockClosedIcon, TrashIcon } from "@heroicons/react/24/outline";
import userApi, { PHOTO_URL } from "../api/userApi";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";
// import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { timezones } from "../utils/timezones";
import Select from "../components/Select";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { submitFeedback } from "../api/feedbackApi";

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

const MobileActionPanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Short delay to allow the component to mount before animating in
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    // Allow animation to finish before calling onClose which unmounts the component
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="md:hidden" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isVisible ? "bg-black/40" : "bg-black/0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      ></div>

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 p-4 rounded-t-2xl shadow-lg transform transition-transform duration-300 ease-out ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

// const ToggleSwitch: React.FC<{
//   checked: boolean;
//   onChange: (checked: boolean) => void;
//   disabled?: boolean;
// }> = ({ checked, onChange, disabled }) => (
//   <label className="relative inline-flex items-center cursor-pointer">
//     <input
//       type="checkbox"
//       checked={checked}
//       onChange={(e) => onChange(e.target.checked)}
//       className="sr-only peer"
//       disabled={disabled}
//     />
//     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
//   </label>
// );

const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout, token } = useAuth();
  const { showToast } = useToast();
  const metadata = getPageMetadata("settings");
  const [isUploading, setIsUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [expandedSection, setExpandedSection] = useState<
    "password" | "delete" | null
  >(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteFeedbackText, setDeleteFeedbackText] = useState("");
  const [deleteFile, setDeleteFile] = useState<File | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mobileOverride, setMobileOverride] = useState<string>(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("dev_mobile_override") || "-"
      : "-"
  );

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

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append("userPhoto", file);

    setIsUploading(true);
    try {
      await userApi.uploadPhoto(formData);
      await refreshUser();
      setAvatarKey(Date.now());
      showToast("Фото профиля обновлено.", "success");
    } catch (error) {
      showToast(`Ошибка загрузки фото: ${getErrorMessage(error)}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    multiple: false,
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== "УДАЛИТЬ АККАУНТ") {
      showToast("Введите подтверждающую фразу правильно.", "error");
      return;
    }
    try {
      setIsDeleting(true);
      if (deleteFeedbackText.trim().length > 0 || deleteFile) {
        try {
          await submitFeedback(
            deleteFeedbackText.trim(),
            deleteFile || undefined
          );
        } catch (e) {
          // ошибку отправки отзыва игнорируем
        }
      }
      await userApi.deleteAccount();
      showToast("Ваш аккаунт был успешно удален.", "success");
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

  return (
    <>
      <PageMeta {...metadata} />

      <div className="w-full md:w-2xl lg:w-3xl mx-auto py-8 px-4 sm:px-2 lg:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Настройки
          </h2>
        </div>

        <div className="space-y-8">
          {/* Profile Section */}
          <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
            <FormBlock className="w-full">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Профиль и уведомления
              </h3>
              <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-6">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                    {user?.photoPath ? (
                      <img
                        key={avatarKey}
                        src={`${axiosInstance.defaults.baseURL}${PHOTO_URL}?token=${token}`}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>
                <div className="flex-grow w-full">
                  <div
                    {...getRootProps()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 h-24 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <Spinner size="sm" />
                    ) : (
                      <span>Нажмите или перетащите фото</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <Input
                  label="Имя"
                  id="name"
                  type="text"
                  {...registerSettings("name")}
                  error={settingsErrors.name?.message}
                />
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
                        <CheckBadgeIcon className="h-4 w-4 mr-1" /> Подтвержден
                      </span>
                    ) : (
                      <span className="text-xs flex items-center text-yellow-600 dark:text-yellow-400">
                        <ExclamationCircleIcon className="h-4 w-4 mr-1" /> Не
                        подтвержден
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
                        { label: "Пуш-уведомление (скоро)", value: "push" },
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
                expandedSection === "password" ? "max-h-screen mt-6" : "max-h-0"
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
                  Удалить аккаунт
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Это действие необратимо. Пожалуйста, будьте осторожны.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setExpandedSection(
                    expandedSection === "delete" ? null : "delete"
                  )
                }
                className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Удалить мой аккаунт</span>
              </button>
            </div>
            {/* Desktop Inline Form */}
            <div
              className={`hidden md:block overflow-hidden transition-all duration-300 ease-in-out ${
                expandedSection === "delete" ? "max-h-screen mt-6" : "max-h-0"
              }`}
            >
              {expandedSection === "delete" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleDeleteAccount();
                  }}
                  className="space-y-4 pt-4 border-t border-red-500/20"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Почему вы удаляете аккаунт? (необязательно)
                    </label>
                    <textarea
                      className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
                      rows={3}
                      value={deleteFeedbackText}
                      onChange={(e) => setDeleteFeedbackText(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Прикрепить файл (до 5 МБ, необязательно)
                    </label>
                    <input
                      type="file"
                      accept="*/*"
                      onChange={(e) =>
                        setDeleteFile(e.target.files?.[0] || null)
                      }
                      className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 mt-8">
                      Для подтверждения, пожалуйста, введите{" "}
                      <strong className="text-red-500">УДАЛИТЬ АККАУНТ</strong>{" "}
                      в поле ниже.
                    </label>
                    <Input
                      type="text"
                      value={deleteConfirmationText}
                      onChange={(e) =>
                        setDeleteConfirmationText(e.target.value)
                      }
                      className="w-full"
                      placeholder="УДАЛИТЬ АККАУНТ"
                    />
                  </div>
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      type="submit"
                      disabled={
                        deleteConfirmationText !== "УДАЛИТЬ АККАУНТ" ||
                        isDeleting
                      }
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? "Удаление..." : "Удалить мой аккаунт"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </FormBlock>

          {/* Development Section */}
          {import.meta.env.DEV && (
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
              </div>
            </FormBlock>
          )}
        </div>
        <p className="mt-12 text-center text-xs text-gray-500 dark:text-gray-600">
          Версия приложения: 0.0.8
        </p>
      </div>

      {/* Mobile Panels */}
      <MobileActionPanel
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
      </MobileActionPanel>

      <MobileActionPanel
        isOpen={expandedSection === "delete"}
        onClose={() => setExpandedSection(null)}
        title="Подтверждение удаления"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDeleteAccount();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Почему вы удаляете аккаунт? (необязательно)
            </label>
            <textarea
              className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
              rows={3}
              value={deleteFeedbackText}
              onChange={(e) => setDeleteFeedbackText(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Прикрепить файл (до 5 МБ, необязательно)
            </label>
            <input
              type="file"
              accept="*/*"
              onChange={(e) => setDeleteFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2 mt-8">
              Для подтверждения, пожалуйста, введите{" "}
              <strong className="text-red-500">УДАЛИТЬ АККАУНТ</strong> в поле
              ниже.
            </label>
            <Input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full"
              placeholder="УДАЛИТЬ АККАУНТ"
            />
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button
              type="submit"
              disabled={
                deleteConfirmationText !== "УДАЛИТЬ АККАУНТ" || isDeleting
              }
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Удаление..." : "Удалить мой аккаунт"}
            </button>
          </div>
        </form>
      </MobileActionPanel>
    </>
  );
};

export default SettingsPage;
