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
import { UserIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import userApi, { PHOTO_URL } from "../api/userApi";

const profileSchema = z.object({
  email: z.string().email("Неверный формат email."),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Текущий пароль обязателен."),
    newPassword: z
      .string()
      .min(6, "Новый пароль должен быть не менее 6 символов."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
  });

type ProfileInputs = z.infer<typeof profileSchema>;
type PasswordInputs = z.infer<typeof passwordSchema>;

const SettingsPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    setError: setProfileError,
  } = useForm<ProfileInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email: user?.email || "" },
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    multiple: false,
  });

  const onProfileSubmit: SubmitHandler<ProfileInputs> = async (data) => {
    try {
      await userApi.updateProfile({ email: data.email });
      await refreshUser();
      alert("Email успешно обновлен.");
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
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Настройки профиля
        </h2>

        {/* Profile Section */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Основная информация
          </h3>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            <div className="flex flex-col items-center gap-2">
              {user?.photoPath ? (
                <img
                  key={avatarKey}
                  src={`${axiosInstance.defaults.baseURL}${PHOTO_URL}`}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full object-cover border"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border">
                  <UserIcon className="w-12 h-12 text-gray-500" />
                </div>
              )}
              <div
                {...getRootProps()}
                className="w-full text-center text-sm p-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <input {...getInputProps()} />
                {isUploading ? (
                  <Spinner size="sm" />
                ) : (
                  <p>
                    {isDragActive
                      ? "Отпустите файл"
                      : "Нажмите или перетащите фото"}
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className="md:col-span-2 space-y-4"
            >
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...registerProfile("email")}
                  className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 shadow-sm"
                />
                {profileErrors.email && (
                  <p className="text-red-500 text-sm mt-1">
                    {profileErrors.email.message}
                  </p>
                )}
              </div>
              {profileErrors.root?.serverError && (
                <p className="text-red-500 text-sm">
                  {profileErrors.root.serverError.message}
                </p>
              )}
              <button
                type="submit"
                disabled={isProfileSubmitting}
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {isProfileSubmitting ? "Сохранение..." : "Сохранить Email"}
              </button>
            </form>
          </div>
        </div>

        {/* Password Section */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow space-y-6 max-w-xl">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Сменить пароль
          </h3>
          <form
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            {["currentPassword", "newPassword", "confirmPassword"].map(
              (field, idx) => (
                <div key={field}>
                  <label
                    htmlFor={field}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {field === "currentPassword"
                      ? "Текущий пароль"
                      : field === "newPassword"
                      ? "Новый пароль"
                      : "Подтвердите новый пароль"}
                  </label>
                  <input
                    id={field}
                    type="password"
                    {...registerPassword(field as keyof PasswordInputs)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 shadow-sm"
                  />
                  {passwordErrors[field as keyof PasswordInputs] && (
                    <p className="text-red-500 text-sm mt-1">
                      {passwordErrors[field as keyof PasswordInputs]?.message}
                    </p>
                  )}
                </div>
              )
            )}
            {passwordErrors.root?.serverError && (
              <p className="text-red-500 text-sm">
                {passwordErrors.root.serverError.message}
              </p>
            )}
            <button
              type="submit"
              disabled={isPasswordSubmitting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isPasswordSubmitting ? "Сохранение..." : "Сменить пароль"}
            </button>
          </form>
        </div>

        {/* Delete Section */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow space-y-6 max-w-xl flex justify-center">
          <a
            onClick={() => setDeleteModalOpen(true)}
            className="text-red-500 hover:text-red-400 font-medium group inline-flex items-center cursor-pointer whitespace-nowrap"
          >
            Удалить аккаунт
            <ArrowRightIcon className="ml-1 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </a>
        </div>
      </div>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Подтверждение удаления аккаунта"
      >
        <div className="space-y-4">
          <p>
            Это действие невозможно отменить. Для подтверждения, пожалуйста,
            введите <strong className="text-red-500">УДАЛИТЬ АККАУНТ</strong> в
            поле ниже.
          </p>
          <input
            type="text"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
