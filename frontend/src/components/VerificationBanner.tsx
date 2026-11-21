// src/components/VerificationBanner.tsx
import { useLanguage } from "../context/LanguageContext";
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { getTranslatableErrorMessage } from "../utils/getErrorMessage";
import Spinner from "./Spinner";
import { authApi } from "../api/axiosInstance";
import MobilePanel from "./MobilePanel";
import { Button } from "./Button";
import { HEADER_ICON_BUTTON_CLASS } from "./layout/AppHeader";

// Нужно ли напоминать о подтверждении почты
const useNeedsVerification = (): boolean => {
  const { user, isAuthenticated } = useAuth();
  return isAuthenticated && !user?.isVerified;
};

// Повторная отправка письма с подтверждением и сообщение о результате
const useResendVerification = (): {
  isLoading: boolean;
  message: string | null;
  resend: () => Promise<void>;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resend = async (): Promise<void> => {
    setIsLoading(true);
    setMessage(null);
    try {
      await authApi.resendVerificationEmail();
      setMessage("Новая ссылка для подтверждения отправлена на ваш email.");
    } catch (error) {
      setMessage(
        getTranslatableErrorMessage(
          error,
          "Не удалось отправить ссылку для подтверждения."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, message, resend };
};

const EXPLANATION =
  "Пожалуйста, проверьте свой почтовый ящик и перейдите по ссылке для подтверждения, чтобы обезопасить свой аккаунт и иметь возможность восстановить пароль.";

interface VerificationBannerProps {
  className?: string;
}

/**
 * Полоса-напоминание о подтверждении почты над содержимым (десктоп).
 */
const VerificationBanner: React.FC<VerificationBannerProps> = ({
  className = "",
}) => {
  const { t } = useLanguage();
  const needsVerification = useNeedsVerification();
  const { isLoading, message, resend } = useResendVerification();

  if (!needsVerification) {
    return null;
  }

  return (
    <div
      className={`flex shrink-0 items-center gap-3 border-b border-[var(--ui-border)] bg-amber-50/60 px-4 py-2 dark:bg-amber-400/[0.06] md:px-6 md:py-2.5 ${className}`.trim()}
      role="alert"
    >
      <ExclamationTriangleIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-grow text-sm">
        {/* На узких экранах — только заголовок, пояснение с md и выше */}
        <p className="truncate text-gray-900 dark:text-gray-100 md:whitespace-normal">
          <span className="font-medium">{t("Подтвердите свой email")}</span>
          <span className="hidden text-gray-500 dark:text-gray-400 md:inline">
            {" — "}
            {t(EXPLANATION)}
          </span>
        </p>
        {message && (
          <p className="mt-0.5 text-gray-600 dark:text-gray-300">{t(message)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={resend}
        disabled={isLoading}
        className="flex h-7 min-w-28 shrink-0 items-center justify-center rounded-md border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-2.5 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-100 dark:hover:bg-white/[0.06] cursor-pointer"
      >
        {isLoading ? <Spinner size="sm" /> : t("Отправить снова")}
      </button>
    </div>
  );
};

interface VerificationIndicatorProps {
  className?: string;
}

/**
 * Компактное напоминание для мобильной шапки: янтарная иконка справа.
 * Не занимает отдельную строку и не сдвигает раскладку; по нажатию открывает
 * нижнюю панель с пояснением и повторной отправкой письма.
 */
export const VerificationIndicator: React.FC<VerificationIndicatorProps> = ({
  className = "",
}) => {
  const { t } = useLanguage();
  const needsVerification = useNeedsVerification();
  const { isLoading, message, resend } = useResendVerification();
  const [isOpen, setIsOpen] = useState(false);

  if (!needsVerification) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("Подтвердите свой email")}
        title={t("Подтвердите свой email")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`${HEADER_ICON_BUTTON_CLASS} text-amber-600! hover:text-amber-700! dark:text-amber-400! dark:hover:text-amber-300! ${className}`.trim()}
      >
        <ExclamationTriangleIcon className="size-5" aria-hidden="true" />
      </button>
      <MobilePanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t("Подтвердите свой email")}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {t(EXPLANATION)}
          </p>
          {message && (
            <p className="text-sm text-gray-900 dark:text-gray-100" role="status">
              {t(message)}
            </p>
          )}
          <Button
            variant="primary"
            size="large"
            className="w-full"
            onClick={resend}
            loading={isLoading}
            disabled={isLoading}
            label={t("Отправить снова")}
          />
        </div>
      </MobilePanel>
    </>
  );
};

export default VerificationBanner;
