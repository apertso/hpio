import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import logger from "../utils/logger";
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
import { useTheme } from "../context/ThemeContext";

const profileSchema = z.object({
  name: z.string().min(1, "Имя обязательно для заполнения."),
  email: z.string().email("Неверный формат email."),
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

type ProfileInputs = z.infer<typeof profileSchema>;
type PasswordInputs = z.infer<typeof passwordSchema>;

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled,
}) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="sr-only peer"
      disabled={disabled}
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
  </label>
);

const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout, token } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Hard-coded state for notification toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [paymentReminders, setPaymentReminders] = useState(true);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    setError: setProfileError,
  } = useForm<ProfileInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || "", email: user?.email || "" },
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
      logger.info("Photo uploaded successfully.");
    } catch (error) {
      logger.error("Photo upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    multiple: false,
  });

  const onProfileSubmit: SubmitHandler<ProfileInputs> = async (data) => {
    try {
      await userApi.updateProfile({ name: data.name, email: data.email });
      await refreshUser();
      alert("Профиль успешно обновлен.");
    } catch (error) {
      const message = getErrorMessage(error);
      setProfileError("root.serverError", { type: "manual", message });
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordInputs> = async (data) => {
    try {
      await userApi.updateProfile({
        password: data.newPassword,
        currentPassword: data.currentPassword,
      });
      resetPasswordForm();
      alert("Пароль успешно изменен.");
    } catch (error) {
      const message = getErrorMessage(error);
      setPasswordError("root.serverError", { type: "manual", message });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== "УДАЛИТЬ АККАУНТ") {
      alert("Введите подтверждающую фразу правильно.");
      return;
    }
    try {
      await userApi.deleteAccount();
      alert("Ваш аккаунт был успешно удален.");
      logout();
    } catch (error) {
      alert(`Ошибка при удалении аккаунта: ${getErrorMessage(error)}`);
    }
  };

  return (
    <>
      <title>Хочу Плачу - Настройки</title>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Настройки профиля
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Section */}
            <FormBlock>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Основная информация
              </h3>
              <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-6">
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
              <form
                onSubmit={handleProfileSubmit(onProfileSubmit)}
                className="space-y-4 mt-6"
              >
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Имя
                  </label>
                  <Input
                    id="name"
                    type="text"
                    className="w-full bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    {...registerProfile("name")}
                    error={profileErrors.name?.message}
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      className="w-full bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-10"
                      {...registerProfile("email")}
                      error={profileErrors.email?.message}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      {user?.isVerified ? (
                        <CheckBadgeIcon
                          className="h-5 w-5 text-green-500"
                          title="Email подтвержден"
                        />
                      ) : (
                        <ExclamationCircleIcon
                          className="h-5 w-5 text-yellow-500"
                          title="Email не подтвержден"
                        />
                      )}
                    </div>
                  </div>
                  {profileErrors.root?.serverError && (
                    <p className="text-red-500 text-sm mt-1">
                      {profileErrors.root.serverError.message}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={isProfileSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    {isProfileSubmitting
                      ? "Сохранение..."
                      : "Сохранить профиль"}
                  </button>
                </div>
              </form>
            </FormBlock>

            {/* Password Section */}
            <FormBlock>
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
                  className="w-full bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  {...registerPassword("currentPassword")}
                  error={passwordErrors.currentPassword?.message}
                />
                <Input
                  id="newPassword"
                  label="Новый пароль"
                  type="password"
                  className="w-full bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  {...registerPassword("newPassword")}
                  error={passwordErrors.newPassword?.message}
                />
                <Input
                  id="confirmPassword"
                  label="Подтвердите новый пароль"
                  type="password"
                  className="w-full bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
          </div>

          {/* Right Column */}
          <div className="space-y-8 w-92">
            <FormBlock>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Уведомления
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">
                    Push-уведомления
                  </span>
                  <ToggleSwitch
                    checked={pushNotifications}
                    onChange={setPushNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">
                    Уведомления по Email
                  </span>
                  <ToggleSwitch
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">
                    Напоминания о платежах
                  </span>
                  <ToggleSwitch
                    checked={paymentReminders}
                    onChange={setPaymentReminders}
                  />
                </div>
              </div>
              <div className="text-right mt-6">
                <button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md"
                >
                  Сохранить настройки
                </button>
              </div>
            </FormBlock>
            <FormBlock>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Тема оформления
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Темная тема
                </span>
                <ToggleSwitch
                  checked={resolvedTheme === "dark"}
                  onChange={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                />
              </div>
            </FormBlock>
            <div className="mt-8 text-center lg:text-right">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="text-gray-500 hover:text-red-500 dark:hover:text-red-400 text-sm font-medium transition-colors cursor-pointer"
              >
                Удалить аккаунт
              </button>
            </div>
          </div>
        </div>
        <p className="mt-12 text-center text-xs text-gray-500 dark:text-gray-600">
          Версия приложения: 1.0.0
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
