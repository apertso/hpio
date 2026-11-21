// src/components/layout/Page.tsx
import React from "react";
export {
  PageHeader,
  HeaderIconButton,
  HeaderViewMenu,
  PrimaryActionButton,
} from "./AppHeader";
export type {
  PageBreadcrumb,
  PagePrimaryAction,
  HeaderViewOption,
} from "./AppHeader";

interface PageToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Панель инструментов под шапкой: вкладки, фильтры, поиск.
 */
export const PageToolbar: React.FC<PageToolbarProps> = ({
  children,
  className = "",
}) => (
  <div
    className={`flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b border-[var(--ui-border)] px-3 py-2 md:px-6 ${className}`.trim()}
  >
    {children}
  </div>
);

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
  /** Ограничение ширины для форм и настроек */
  width?: "full" | "form" | "narrow";
}

const widthClasses: Record<NonNullable<PageContentProps["width"]>, string> = {
  full: "",
  form: "max-w-3xl",
  narrow: "max-w-2xl",
};

/**
 * Область содержимого страницы с едиными отступами.
 */
export const PageContent: React.FC<PageContentProps> = ({
  children,
  className = "",
  width = "full",
}) => (
  <div className={`px-3 py-4 md:px-6 md:py-6 ${className}`.trim()}>
    <div className={widthClasses[width]}>{children}</div>
  </div>
);

interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Заголовок раздела внутри страницы.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  actions,
  className = "",
}) => (
  <div className={`mb-3 flex items-end justify-between gap-4 ${className}`.trim()}>
    <div className="min-w-0">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        {title}
      </h2>
      {description && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

interface FormSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Раздел формы: заголовок и пояснение слева, поля справа (на мобильных — друг под другом).
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
}) => (
  <section className="grid gap-4 py-6 first:pt-0 last:pb-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-10">
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
    <div className="min-w-0 space-y-4">{children}</div>
  </section>
);

interface SwitchRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
}

/**
 * Строка настройки: подпись и пояснение слева, переключатель справа.
 */
export const SwitchRow: React.FC<SwitchRowProps> = ({
  label,
  description,
  control,
}) => (
  <div className="flex items-start justify-between gap-6">
    <span className="min-w-0">
      <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </span>
      {description && (
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
          {description}
        </span>
      )}
    </span>
    <span className="mt-0.5 shrink-0">{control}</span>
  </div>
);

interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** На мобильных панель без рамки — содержимое идёт прямо по фону страницы */
  flushOnMobile?: boolean;
  /** "plain" — без рамки и фона: только заголовок и содержимое (спокойные разделы) */
  variant?: "boxed" | "plain";
}

/**
 * Панель с тонкой рамкой и необязательной шапкой — основной блок дашбордов и списков.
 */
export const Panel: React.FC<PanelProps> = ({
  title,
  description,
  actions,
  children,
  className = "",
  bodyClassName = "",
  flushOnMobile = false,
  variant = "boxed",
}) => (
  <section
    className={`min-w-0 ${
      variant === "plain"
        ? ""
        : flushOnMobile
        ? "md:overflow-hidden md:rounded-lg md:border md:border-[var(--ui-border)] md:bg-[var(--ui-surface)]"
        : "overflow-hidden rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)]"
    } ${className}`.trim()}
  >
    {(title || actions) && (
      <header
        className={`flex min-h-11 items-center justify-between gap-3 py-2 ${
          variant === "plain"
            ? "pb-2"
            : flushOnMobile
            ? "pb-3 md:border-b md:border-[var(--ui-border)] md:px-4 md:pb-2"
            : "border-b border-[var(--ui-border)] px-4"
        }`}
      >
        <div className="min-w-0">
          {title && (
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);
