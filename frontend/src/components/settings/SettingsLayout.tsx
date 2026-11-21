import React from "react";

interface SettingsHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
}

/**
 * Заголовок раздела настроек: крупное название и короткое пояснение под ним.
 */
export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  title,
  description,
}) => (
  <header className="mb-8 border-b border-[var(--ui-border)] pb-5">
    <h2 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 dark:text-gray-50">
      {title}
    </h2>
    {description && (
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    )}
  </header>
);

interface SettingsGroupProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** "danger" — красноватая рамка для необратимых действий */
  tone?: "default" | "danger";
}

/**
 * Группа настроек: подпись над панелью и строки, разделённые тонкими линиями.
 */
export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
  tone = "default",
}) => (
  <section className="min-w-0">
    {(title || description) && (
      <div className="mb-2.5 px-0.5">
        {title && (
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    )}
    <div
      className={`divide-y overflow-hidden rounded-lg border bg-[var(--ui-surface)] ${
        tone === "danger"
          ? "divide-red-100 border-red-200 dark:divide-red-500/15 dark:border-red-500/25"
          : "divide-[var(--ui-border)] border-[var(--ui-border)]"
      }`}
    >
      {children}
    </div>
  </section>
);

interface SettingsRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Элемент управления справа (на мобильных — под подписью) */
  control?: React.ReactNode;
  /** Связывает подпись с полем ввода */
  htmlFor?: string;
  /** Дополнительное содержимое под строкой (например, раскрывающаяся форма) */
  children?: React.ReactNode;
  /** Ширина колонки с элементом управления на десктопе */
  controlWidth?: "auto" | "md" | "lg";
  /**
   * Компактный элемент (переключатель, статус, кнопка) остаётся справа и на
   * мобильных, вместо переноса под подпись
   */
  inline?: boolean;
}

const controlWidthClasses: Record<
  NonNullable<SettingsRowProps["controlWidth"]>,
  string
> = {
  auto: "sm:w-auto",
  md: "sm:w-56",
  lg: "sm:w-72",
};

/**
 * Строка настройки: подпись и пояснение слева, элемент управления справа.
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  control,
  htmlFor,
  children,
  controlWidth = "md",
  inline = false,
}) => {
  const LabelTag = htmlFor ? "label" : "div";
  return (
    <div className="px-4 py-3.5">
      <div
        className={
          inline
            ? "flex items-center justify-between gap-4 sm:gap-8"
            : "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
        }
      >
        <div className="min-w-0">
          <LabelTag
            htmlFor={htmlFor}
            className="block text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            {label}
          </LabelTag>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {control && (
          <div
            className={
              inline
                ? "flex shrink-0 items-center justify-end"
                : `w-full shrink-0 ${controlWidthClasses[controlWidth]}`
            }
          >
            {control}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

type SettingsNoticeTone = "info" | "success" | "warning" | "danger";

const noticeToneClasses: Record<SettingsNoticeTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200",
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-200",
  warning:
    "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-500/25 dark:bg-yellow-500/10 dark:text-yellow-200",
  danger:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200",
};

interface SettingsNoticeProps {
  tone?: SettingsNoticeTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Цветная плашка с пояснением (конфиденциальность, предупреждения, ошибки).
 */
export const SettingsNotice: React.FC<SettingsNoticeProps> = ({
  tone = "info",
  children,
  className = "",
}) => (
  <div
    className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${noticeToneClasses[tone]} ${className}`.trim()}
  >
    {children}
  </div>
);

/**
 * Зелёная галочка «выполнено» для строк-статусов.
 */
export const SettingsCheckIcon: React.FC<{ label?: string }> = ({ label }) => (
  <svg
    className="size-5 text-green-600 dark:text-green-400"
    fill="currentColor"
    viewBox="0 0 20 20"
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);
