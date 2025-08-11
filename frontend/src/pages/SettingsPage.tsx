import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import getErrorMessage from "../utils/getErrorMessage";
import Spinner from "../components/Spinner";
import Modal from "../components/Modal";
import axiosInstance from "../api/axiosInstance";
import {
  UserIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import userApi, { PHOTO_URL } from "../api/userApi";
import { Input } from "../components/Input";
import FormBlock from "../components/FormBlock";
// import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { timezones } from "../utils/timezones";
import Select from "../components/Select";

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
  const [isUploading, setIsUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const {
    register: registerSettings,
    handleSubmit: handleSettingsSubmit,
    formState: { errors: settingsErrors, isSubmitting: isSettingsSubmitting },
    setError: setSettingsError,
    control: settingsControl,
    reset: resetSettingsForm,
  } = useForm<SettingsInputs>({
    resolver: zodResolver(settingsSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    setError: setPasswordError,
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
      setSettingsError("root.serverError", { type: "manual", message });
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
      setPasswordError("root.serverError", { type: "manual", message });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== "УДАЛИТЬ АККАУНТ") {
      showToast("Введите подтверждающую фразу правильно.", "error");
      return;
    }
    try {
      await userApi.deleteAccount();
      showToast("Ваш аккаунт был успешно удален.", "success");
      logout();
    } catch (error) {
      showToast(
        `Ошибка при удалении аккаунта: ${getErrorMessage(error)}`,
        "error"
      );
    }
  };

  return (
    <>
      <title>Хочу Плачу - Настройки</title>
      <div className="max-w-full mx-auto py-8 px-4 sm:px-2 lg:px-0">
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
              {settingsErrors.root?.serverError && (
                <p className="text-red-500 text-sm mb-4">
                  {settingsErrors.root.serverError.message}
                </p>
              )}
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
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Сменить пароль
            </h3>
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
              {passwordErrors.root?.serverError && (
                <p className="text-red-500 text-sm">
                  {passwordErrors.root.serverError.message}
                </p>
              )}
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
          </FormBlock>
          <div className="mt-8 text-center mt-12 lg:text-center">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="text-gray-400 dark:text-gray-800 hover:text-red-600 dark:hover:text-red-500 text-sm font-medium transition-colors cursor-pointer"
            >
              Удалить аккаунт
            </button>
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-gray-500 dark:text-gray-600">
          Версия приложения: 0.0.7
        </p>
      </div>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Подтверждение удаления аккаунта"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Это действие невозможно отменить. Для подтверждения, пожалуйста,
            введите <strong className="text-red-500">УДАЛИТЬ АККАУНТ</strong> в
            поле ниже.
          </p>
          <Input
            type="text"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            className="w-full"
            placeholder="УДАЛИТЬ АККАУНТ"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirmationText !== "УДАЛИТЬ АККАУНТ"}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Я понимаю последствия, удалить мой аккаунт
          </button>
        </div>
      </Modal>
    </>
  );
};

export default SettingsPage;
