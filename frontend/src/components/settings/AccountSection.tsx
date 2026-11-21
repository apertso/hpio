import { useLanguage } from "../../context/LanguageContext";
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
import { LockClosedIcon, TrashIcon } from "@heroicons/react/24/outline";
import userApi from "../../api/userApi";
import { Input, TextField, PasswordField, TextInputField } from "../Input";
import { Button } from "../Button";
import { SettingsGroup, SettingsHeader, SettingsRow } from "./SettingsLayout";
import { useToast } from "../../context/ToastContext";
import { useAvatarCache } from "../../hooks/useAvatarCache";
import { timezones } from "../../utils/timezones";
import Select from "../Select";
import MobilePanel from "../MobilePanel";
import { compressProfileImage } from "../../utils/imageCompression";
import { submitFeedback } from "../../api/feedbackApi";
import DeleteAccount from "../DeleteAccount";
import ConfirmModal from "../ConfirmModal";

// Схема для всех настроек профиля
const settingsSchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно для заполнения."),
  email: z.string().trim().email("Неверный формат email."),
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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ (до сжатия)

const AccountSection: React.FC = () => {
  const { t } = useLanguage();
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
  // Данные формы, ожидающие подтверждения смены email
  const [pendingSettings, setPendingSettings] = useState<SettingsInputs | null>(
    null
  );
  const [isConfirmingEmail, setIsConfirmingEmail] = useState(false);

  const {
    register: registerSettings,
    handleSubmit: handleSettingsSubmit,
    formState: { errors: settingsErrors, isSubmitting: isSettingsSubmitting },
    control: settingsControl,
    reset: resetSettingsForm,
  } = useForm<SettingsInputs>({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    delayError: 1000,
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPasswordForm,
  } = useForm<PasswordInputs>({
    resolver: zodResolver(passwordSchema),
    mode: "onChange",
    delayError: 1000,
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

  const onDrop = async (acceptedFiles: File[]): Promise<void> => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];

    if (file.size > MAX_FILE_SIZE) {
      showToast(
        t("Размер файла превышает {1} МБ. Пожалуйста, выберите файл меньшего размера.", MAX_FILE_SIZE / 1024 / 1024),
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
      showToast(t("Фото профиля обновлено."), "success");
    } catch (error) {
      showToast(t("Ошибка загрузки фото: {1}", t(getErrorMessage(error))), "error");
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const onDropRejected = (rejections: FileRejection[]): void => {
    if (rejections.length === 0) return;

    const error = rejections[0].errors?.[0];
    if (!error) return;
    if (error.code === "file-invalid-type") {
      showToast(
        t("Пожалуйста, выберите изображение (JPEG, PNG или WEBP)."),
        "error"
      );
    } else if (error.code === "file-too-large") {
      showToast(t("Размер файла превышает 10 МБ."), "error");
    } else {
      showToast(t("Ошибка при выборе файла: {1}", error.message), "error");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    multiple: false,
    maxSize: MAX_FILE_SIZE,
    disabled: isCompressing || isUploading,
  });

  // Сохраняет профиль; вызывается напрямую или после подтверждения смены email
  const saveSettings = async (data: SettingsInputs): Promise<void> => {
    try {
      const emailChanged = data.email !== user?.email;
      await userApi.updateProfile(data);
      await refreshUser();
      if (emailChanged) {
        showToast(
          t("Настройки сохранены. Мы отправили ссылку для подтверждения на ваш новый email."),
          "success"
        );
      } else {
        showToast(t("Настройки успешно сохранены."), "success");
      }
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  // Смена email сразу снимает подтверждение адреса и необратима без повторной
  // верификации, поэтому перед сохранением запрашиваем подтверждение
  const onSettingsSubmit: SubmitHandler<SettingsInputs> = async (data) => {
    if (user?.email && data.email !== user.email) {
      setPendingSettings(data);
      return;
    }
    await saveSettings(data);
  };

  const handleConfirmEmailChange = async (): Promise<void> => {
    if (!pendingSettings) return;
    setIsConfirmingEmail(true);
    try {
      await saveSettings(pendingSettings);
    } finally {
      setIsConfirmingEmail(false);
      setPendingSettings(null);
    }
  };

  const onPasswordSubmit: SubmitHandler<PasswordInputs> = async (data) => {
    try {
      await userApi.updateProfile({
        password: data.newPassword,
        currentPassword: data.currentPassword,
      });
      resetPasswordForm();
      setExpandedSection(null);
      showToast(t("Пароль успешно изменен."), "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handleDeleteAccount = async (
    reason: string,
    feedback: string,
    file: File | null
  ): Promise<void> => {
    try {
      setIsDeleting(true);
      if (feedback.trim().length > 0 || file || reason !== "no_answer") {
        try {
          let description = feedback.trim();
          if (reason !== "no_answer") {
            description = description
              ? `Причина удаления: ${reason}\n\n${description}`
              : `Причина удаления: ${reason}`;
          }
          await submitFeedback(description, file || undefined);
        } catch {
          // ошибку отправки отзыва игнорируем
        }
      }
      await userApi.deleteAccount();
      showToast(t("Ваш аккаунт был успешно удалён."), "success");
      setIsDeleteModalOpen(false);
      setExpandedSection(null);
      logout();
    } catch (error) {
      showToast(
        t("Ошибка при удалении аккаунта: {1}", t(getErrorMessage(error))),
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // Поля формы смены пароля: общие для десктопа и мобильной панели
  const passwordFields = (idSuffix: string): React.ReactNode => (
    <>
      <PasswordField
        label={t("Текущий пароль")}
        inputId={`currentPassword${idSuffix}`}
        autoComplete="current-password"
        {...registerPassword("currentPassword")}
        error={passwordErrors.currentPassword?.message}
        disabled={isPasswordSubmitting}
        required
      />
      <PasswordField
        label={t("Новый пароль")}
        inputId={`newPassword${idSuffix}`}
        autoComplete="new-password"
        {...registerPassword("newPassword")}
        error={passwordErrors.newPassword?.message}
        disabled={isPasswordSubmitting}
        required
      />
      <PasswordField
        label={t("Подтвердите новый пароль")}
        inputId={`confirmPassword${idSuffix}`}
        autoComplete="new-password"
        {...registerPassword("confirmPassword")}
        error={passwordErrors.confirmPassword?.message}
        disabled={isPasswordSubmitting}
        required
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={isPasswordSubmitting}
          label={
            isPasswordSubmitting ? t("Сохранение...") : t("Сменить пароль")
          }
        />
      </div>
    </>
  );

  return (
    <div>
      <SettingsHeader
        title={t("Аккаунт")}
        description={t("Управляйте своей личной информацией, настройками уведомлений и часовым поясом")}
      />

      <div className="space-y-8">
        <form onSubmit={handleSettingsSubmit(onSettingsSubmit)}>
          <SettingsGroup title={t("Профиль")}>
            <SettingsRow
              inline
              label={t("Фото профиля")}
              description={t("JPEG, PNG или WEBP, до 10 МБ")}
              control={
                <div
                  {...getRootProps()}
                  className={`relative flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
                    isDragActive
                      ? "bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/10"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="size-6 text-gray-400 dark:text-gray-500" />
                  )}

                  {/* Значок редактирования в углу */}
                  <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] shadow-sm">
                    <svg
                      className="size-2.5 text-gray-600 dark:text-gray-300"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </div>

                  {(isCompressing || isUploading) && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/40">
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
              }
            />
            <SettingsRow
              label={t("Имя")}
              htmlFor="name"
              controlWidth="lg"
              control={
                <TextInputField
                  inputId="name"
                  error={settingsErrors.name?.message}
                  required
                  disabled={isSettingsSubmitting}
                  {...registerSettings("name")}
                />
              }
            />
            <SettingsRow
              label="Email"
              htmlFor="email"
              controlWidth="lg"
              description={
                user?.isVerified ? (
                  <span className="inline-flex items-center text-green-600 dark:text-green-400">
                    <CheckBadgeIcon className="mr-1 size-3.5" />
                    {t("Подтвержден")}
                  </span>
                ) : (
                  <span className="inline-flex items-center text-yellow-600 dark:text-yellow-400">
                    <ExclamationCircleIcon className="mr-1 size-3.5" />
                    {t("Не подтвержден")}
                  </span>
                )
              }
              control={
                <TextField
                  inputId="email"
                  error={settingsErrors.email?.message}
                  required
                >
                  <TextField.Input
                    type="email"
                    autoComplete="email"
                    disabled={isSettingsSubmitting}
                    {...registerSettings("email")}
                  />
                </TextField>
              }
            />
            <SettingsRow
              label={t("Часовой пояс")}
              htmlFor="settings-timezone"
              controlWidth="lg"
              control={
                <Controller
                  name="timezone"
                  control={settingsControl}
                  defaultValue={user?.timezone || "UTC"}
                  render={({ field }) => (
                    <Select
                      id="settings-timezone"
                      options={timezones.map((option) => ({
                        ...option,
                        label: t(option.label),
                      }))}
                      value={field.value}
                      onChange={field.onChange}
                      error={settingsErrors.timezone?.message}
                    />
                  )}
                />
              }
            />
            <div className="flex justify-end px-4 py-3">
              <Button
                type="submit"
                variant="primary"
                disabled={isSettingsSubmitting}
                label={isSettingsSubmitting ? t("Сохранение...") : t("Сохранить")}
              />
            </div>
          </SettingsGroup>
        </form>

        <SettingsGroup title={t("Безопасность")}>
          <SettingsRow
            inline
            label={t("Пароль")}
            description={t("Управляйте паролем и настройками безопасности вашего аккаунта")}
            control={
              <Button
                variant="secondary"
                size="small"
                icon={<LockClosedIcon />}
                label={t("Сменить пароль")}
                aria-expanded={expandedSection === "password"}
                onClick={() =>
                  setExpandedSection(
                    expandedSection === "password" ? null : "password"
                  )
                }
              />
            }
          >
            {/* На десктопе форма раскрывается прямо в строке */}
            {expandedSection === "password" && (
              <form
                onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                className="mt-4 hidden space-y-4 border-t border-[var(--ui-border)] pt-4 md:block"
              >
                {passwordFields("")}
              </form>
            )}
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup title={t("Опасная зона")} tone="danger">
          <SettingsRow
            inline
            label={t("Удалить аккаунт")}
            description={t("Действия, которые могут привести к потере доступа к аккаунту или удалению данных")}
            control={
              <Button
                variant="destructive"
                size="small"
                icon={<TrashIcon />}
                label={t("Удалить")}
                onClick={() => setIsDeleteModalOpen(true)}
              />
            }
          />
        </SettingsGroup>
      </div>

      {/* На мобильных форма смены пароля открывается в панели */}
      <MobilePanel
        isOpen={expandedSection === "password"}
        onClose={() => setExpandedSection(null)}
        title={t("Сменить пароль")}
      >
        <form
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          className="space-y-4"
        >
          {passwordFields("Mobile")}
        </form>
      </MobilePanel>

      <ConfirmModal
        isOpen={pendingSettings !== null}
        onClose={() => {
          if (!isConfirmingEmail) setPendingSettings(null);
        }}
        onConfirm={handleConfirmEmailChange}
        title={t("Сменить email?")}
        message={t(
          "Email будет сразу изменён на {1}, и его нужно будет подтвердить по ссылке из письма. До подтверждения адрес будет считаться неподтверждённым — даже если вы вернёте прежний email.",
          pendingSettings?.email ?? ""
        )}
        confirmText="Сменить email"
        isConfirming={isConfirmingEmail}
      />

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
