import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDropzone, FileRejection } from "react-dropzone";
import getErrorMessage from "../../utils/getErrorMessage";
import Spinner from "../Spinner";
import {
  UserIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";
import {
  LockClosedIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import userApi from "../../api/userApi";
import { Input, TextField, PasswordField, TextInputField } from "../Input";
import SettingsSection from "../SettingsSection";
import { useToast } from "../../context/ToastContext";
import { useAvatarCache } from "../../hooks/useAvatarCache";
import { timezones } from "../../utils/timezones";
import Select from "../Select";
import MobilePanel from "../MobilePanel";
import { compressProfileImage } from "../../utils/imageCompression";
import { submitFeedback } from "../../api/feedbackApi";
import DeleteAccount from "../DeleteAccount";

// Схема для всех настроек профиля
const settingsSchema = z.object({
  name: z.string().min(1, "Имя обязательно для заполнения."),
  email: z.string().email("Неверный формат email."),
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

const AccountSection: React.FC = () => {
  const { user, refreshUser, logout, token } = useAuth();
  const { showToast } = useToast();
  const { avatarUrl, refreshAvatar } = useAvatarCache(user?.photoPath, token);
  const [expandedSection, setExpandedSection] = useState<"password" | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

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

  // Устанавливаем значения формы при получении данных пользователя
  useEffect(() => {
    if (user) {
      resetSettingsForm({
        name: user.name || "",
        email: user.email || "",
        timezone: user.timezone || "UTC",
      });
    }
  }, [user, resetSettingsForm]);

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

  const onDropRejected = (rejections: FileRejection[]) => {
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
        } catch {
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

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
        <SettingsSection className="card-base p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Профиль и уведомления
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Управляйте своей личной информацией, настройками уведомлений и
                часовым поясом
              </p>
            </div>
          </div>
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
                  <Input
                    {...getInputProps()}
                    type="file"
                    className="sr-only"
                    unstyled
                  />
                </div>
              </div>

              <TextInputField
                label="Имя"
                inputId="name"
                error={settingsErrors.name?.message}
                required
                wrapperClassName="flex-grow"
                disabled={isSettingsSubmitting}
                {...registerSettings("name")}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <TextField
                  inputId="email"
                  error={settingsErrors.email?.message}
                  required
                >
                  <TextField.Label>
                    <div className="flex items-center justify-between">
                      <span>Email</span>
                      {user?.isVerified ? (
                        <span className="text-xs flex items-center text-green-600 dark:text-green-400">
                          <CheckBadgeIcon className="h-4 w-4 mr-1" />
                          Подтвержден
                        </span>
                      ) : (
                        <span className="text-xs flex items-center text-yellow-600 dark:text-yellow-400">
                          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                          Не подтвержден
                        </span>
                      )}
                    </div>
                  </TextField.Label>
                  <TextField.Input
                    type="email"
                    autoComplete="email"
                    disabled={isSettingsSubmitting}
                    {...registerSettings("email")}
                  />
                </TextField>
              </div>
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
        </SettingsSection>
      </form>

      {/* Password Section */}
      <SettingsSection className="card-base p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <LockClosedIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Безопасность
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Управляйте паролем и настройками безопасности вашего аккаунта
            </p>
          </div>
        </div>

        <div className="flex justify-end mb-4">
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
              <PasswordField
                label="Текущий пароль"
                inputId="currentPassword"
                autoComplete="current-password"
                {...registerPassword("currentPassword")}
                error={passwordErrors.currentPassword?.message}
                disabled={isPasswordSubmitting}
                required
              />
              <PasswordField
                label="Новый пароль"
                inputId="newPassword"
                autoComplete="new-password"
                {...registerPassword("newPassword")}
                error={passwordErrors.newPassword?.message}
                disabled={isPasswordSubmitting}
                required
              />
              <PasswordField
                label="Подтвердите новый пароль"
                inputId="confirmPassword"
                autoComplete="new-password"
                {...registerPassword("confirmPassword")}
                error={passwordErrors.confirmPassword?.message}
                disabled={isPasswordSubmitting}
                required
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
          )}
        </div>
      </SettingsSection>
      {/* Удаление аккаунта */}
      <SettingsSection className="card-base p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Опасная зона
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Действия, которые могут привести к потере доступа к аккаунту или
              удалению данных
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500"
          >
            <TrashIcon className="w-5 h-5" />
            <span>Удалить аккаунт</span>
          </button>
        </div>
      </SettingsSection>

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
          <PasswordField
            label="Текущий пароль"
            inputId="currentPasswordMobile"
            autoComplete="current-password"
            {...registerPassword("currentPassword")}
            error={passwordErrors.currentPassword?.message}
            disabled={isPasswordSubmitting}
            required
          />
          <PasswordField
            label="Новый пароль"
            inputId="newPasswordMobile"
            autoComplete="new-password"
            {...registerPassword("newPassword")}
            error={passwordErrors.newPassword?.message}
            disabled={isPasswordSubmitting}
            required
          />
          <PasswordField
            label="Подтвердите новый пароль"
            inputId="confirmPasswordMobile"
            autoComplete="new-password"
            {...registerPassword("confirmPassword")}
            error={passwordErrors.confirmPassword?.message}
            disabled={isPasswordSubmitting}
            required
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

      <DeleteAccount
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default AccountSection;
