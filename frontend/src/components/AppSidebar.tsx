// src/components/AppSidebar.tsx
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BanknotesIcon,
  BoltIcon,
  ChevronDownIcon,
  CloudIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentTextIcon,
  HomeIcon,
  MoonIcon,
  ShieldCheckIcon,
  SignalSlashIcon,
  Squares2X2Icon,
  SunIcon,
  TagIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useReset } from "../context/ResetContext";
import { useOffline } from "../context/OfflineContext";
import { useDropdown } from "../hooks/useDropdown";
import { useAvatarCache } from "../hooks/useAvatarCache";
import { localizeHref } from "../i18n/localePath";
import {
  isIncomeAndCardsEnabled,
  isTagsAndCategoriesEnabled,
} from "../utils/featureFlags";
import Overlay from "./Overlay";

const COLLAPSED_STORAGE_KEY = "sidebar_collapsed";

interface SidebarItem {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  match: (path: string) => boolean;
}

// Логотип приложения (квадратный знак)
export const AppLogoMark: React.FC<{ className?: string }> = ({
  className = "size-4",
}) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
      fill="currentColor"
    />
  </svg>
);

// Инициалы пользователя для аватара без фото
const getInitials = (name?: string | null, email?: string | null): string => {
  const source = (name || "").trim() || (email || "").split("@")[0] || "";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "?";
};

// Аватар пользователя: фото или инициалы
export const UserAvatar: React.FC<{
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  className?: string;
}> = ({ avatarUrl, name, email, className = "size-6 text-[10px]" }) =>
  avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      className={`${className} shrink-0 rounded-full object-cover bg-gray-200 dark:bg-gray-700`}
    />
  ) : (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white dark:bg-indigo-500`}
      aria-hidden="true"
    >
      {getInitials(name, email)}
    </span>
  );

// Иконка сворачивания боковой панели
const SidebarToggleIcon: React.FC<{ className?: string }> = ({
  className = "size-4",
}) => (
  <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 3v10" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/**
 * Состояние синхронизации: показывается только когда требует внимания
 * (нет сети, есть несинхронизированные изменения, идёт синхронизация).
 */
const SidebarSyncStatus: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const { t } = useLanguage();
  const { isOffline, syncStatus, queueStats } = useOffline();

  let icon: React.ReactNode = null;
  let label = "";
  let tone = "text-gray-500 dark:text-gray-400";

  if (isOffline) {
    icon = <SignalSlashIcon className="size-4 shrink-0" />;
    label = t("Офлайн");
    tone = "text-amber-700 dark:text-amber-400";
  } else if (syncStatus.isSyncing || queueStats.inProgress) {
    icon = <ArrowPathIcon className="size-4 shrink-0 animate-spin" />;
    label = t("Обновление");
  } else if (queueStats.total > 0) {
    icon = <CloudIcon className="size-4 shrink-0" />;
    label = `${t("Ожидание синхронизации")} · ${queueStats.total}`;
  }

  if (!icon) return null;

  return (
    <div
      className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-sm ${tone} ${
        collapsed ? "justify-center" : ""
      }`}
      title={label}
      role="status"
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
};

/**
 * Боковая панель навигации для десктопной версии приложения.
 * Сверху — аккаунт пользователя, далее навигация; панель можно свернуть.
 */
const AppSidebar: React.FC<{ demo?: boolean }> = ({ demo = false }) => {
  const { t, language } = useLanguage();
  const { user: account, logout, token } = useAuth();
  const user = demo ? null : account;
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const { triggerReset } = useReset();
  const { avatarUrl } = useAvatarCache(user?.photoPath, token);
  const {
    isOpen: isMenuOpen,
    setIsOpen: setIsMenuOpen,
    containerRef: menuRef,
  } = useDropdown();

  const [collapsed, setCollapsed] = useState<boolean>(
    () => demo || localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true"
  );

  // Анимация ширины включается только после ручного переключения,
  // иначе при перезагрузке страницы видно «доезжающую» панель
  const [animateWidth, setAnimateWidth] = useState<boolean>(false);

  const toggleCollapsed = useCallback((): void => {
    setAnimateWidth(true);
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // Горячая клавиша «[» сворачивает и разворачивает панель (как в Linear)
  useEffect(() => {
    if (demo) return;
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== "[" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      toggleCollapsed();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [demo, toggleCollapsed]);

  const canManageCategories = Boolean(user?.isAdmin);
  const tagsEnabled = demo || isTagsAndCategoriesEnabled();
  const incomeCardsEnabled = !demo && isIncomeAndCardsEnabled();
  const path = demo ? "/dashboard" : location.pathname;
  const displayName = demo ? "Demo" : user?.name || user?.email?.split("@")[0] || "";

  const primaryItems: SidebarItem[] = [
    { to: "/dashboard", label: t("Главная"), icon: HomeIcon, match: (p) => p === "/dashboard" },
    { to: "/payments", label: t("Платежи"), icon: CreditCardIcon, match: (p) => p.startsWith("/payments") },
    ...(incomeCardsEnabled
      ? [
          { to: "/incomes", label: t("Доходы"), icon: BanknotesIcon, match: (p: string) => p.startsWith("/incomes") },
          { to: "/sources", label: t("Источники"), icon: WalletIcon, match: (p: string) => p.startsWith("/sources") },
        ]
      : []),
  ];

  const manageItems: SidebarItem[] = [
    ...(canManageCategories
      ? [
          { to: "/categories", label: t("Категории"), icon: Squares2X2Icon, match: (p: string) => p.startsWith("/categories") },
          { to: "/automation-rules", label: t("Автоматизация"), icon: BoltIcon, match: (p: string) => p.startsWith("/automation-rules") },
        ]
      : []),
    ...(tagsEnabled
      ? [{ to: "/tags", label: t("Теги"), icon: TagIcon, match: (p: string) => p.startsWith("/tags") }]
      : []),
  ];

  const itemClass = (isActive: boolean): string =>
    `group flex h-8 items-center gap-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
      collapsed ? "justify-center px-0" : "px-2"
    } ${
      isActive
        ? "bg-gray-200/70 text-gray-900 dark:bg-white/[0.07] dark:text-gray-50"
        : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100"
    }`;

  const renderItem = (item: SidebarItem): React.JSX.Element => {
    const isActive = item.match(path);
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        className={itemClass(isActive)}
        aria-current={isActive ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        onClick={() => {
          // Повторный клик по активной главной сбрасывает её состояние
          if (item.to === "/dashboard" && path === "/dashboard") triggerReset();
        }}
      >
        <Icon
          className={`size-4 shrink-0 ${
            isActive
              ? "text-gray-900 dark:text-gray-100"
              : "text-gray-500 group-hover:text-gray-700 dark:text-gray-500 dark:group-hover:text-gray-300"
          }`}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  const menuItemClass =
    "flex w-full items-center gap-2.5 rounded-md px-2 h-8 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/[0.06] cursor-pointer";

  const toggleButton = (
    <button
      type="button"
      onClick={toggleCollapsed}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 cursor-pointer"
      aria-label={collapsed ? t("Развернуть боковую панель") : t("Свернуть боковую панель")}
      title={`${collapsed ? t("Развернуть боковую панель") : t("Свернуть боковую панель")} ( [ )`}
    >
      <SidebarToggleIcon />
    </button>
  );

  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col gap-5 py-3 ${
        animateWidth ? "transition-[width] duration-200 ease-out" : ""
      } ${
        collapsed ? "w-14 px-2" : "w-60 px-2.5"
      }`}
    >
      {/* Аккаунт пользователя и сворачивание панели */}
      <div className={`flex items-center gap-1 ${collapsed ? "flex-col" : ""}`}>
        <div className={`relative min-w-0 ${collapsed ? "" : "flex-1"}`} ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex h-9 min-w-0 items-center gap-2 rounded-md text-left transition-colors hover:bg-gray-200/50 dark:hover:bg-white/[0.04] cursor-pointer ${
              collapsed ? "w-9 justify-center" : "w-full px-1.5"
            }`}
            aria-label={t("Меню пользователя")}
            aria-expanded={isMenuOpen}
            title={collapsed ? displayName : undefined}
          >
            <UserAvatar
              avatarUrl={avatarUrl}
              name={demo ? displayName : user?.name}
              email={user?.email}
              className="size-6 text-[10px]"
            />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {displayName}
                </span>
                <ChevronDownIcon className="size-3.5 shrink-0 text-gray-400" />
              </>
            )}
          </button>

          <Overlay isOpen={isMenuOpen} widthClass="w-64" anchorRef={menuRef} offset={6}>
            <div role="menu" aria-orientation="vertical" className="p-1">
              <div className="flex items-center gap-2.5 px-2 py-2">
                <UserAvatar
                  avatarUrl={avatarUrl}
                  name={user?.name}
                  email={user?.email}
                  className="size-8 text-xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {displayName}
                  </p>
                  {user?.email && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="my-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
              <Link to="/settings" onClick={() => setIsMenuOpen(false)} className={menuItemClass} role="menuitem">
                <Cog6ToothIcon className="size-4 text-gray-400" />
                {t("Настройки")}
              </Link>
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
                className={menuItemClass}
                role="menuitem"
              >
                {resolvedTheme === "light" ? (
                  <MoonIcon className="size-4 text-gray-400" />
                ) : (
                  <SunIcon className="size-4 text-gray-400" />
                )}
                {resolvedTheme === "light" ? t("Тёмная тема") : t("Светлая тема")}
              </button>
              <div className="my-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
              <Link to={localizeHref(language, "/terms")} onClick={() => setIsMenuOpen(false)} className={menuItemClass} role="menuitem">
                <DocumentTextIcon className="size-4 text-gray-400" />
                {t("Соглашение")}
              </Link>
              <Link to={localizeHref(language, "/privacy")} onClick={() => setIsMenuOpen(false)} className={menuItemClass} role="menuitem">
                <ShieldCheckIcon className="size-4 text-gray-400" />
                {t("Приватность")}
              </Link>
              <div className="my-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                className={menuItemClass}
                role="menuitem"
              >
                <ArrowRightOnRectangleIcon className="size-4 text-gray-400" />
                {t("Выйти")}
              </button>
            </div>
          </Overlay>
        </div>
        {toggleButton}
      </div>

      {/* Основная навигация */}
      <nav className="flex flex-col gap-px" aria-label={t("Меню")}>
        {primaryItems.map(renderItem)}
      </nav>

      {manageItems.length > 0 && (
        <nav className="flex flex-col gap-px">
          {collapsed ? (
            <div className="mx-2 mb-1 h-px bg-[var(--ui-border)]" aria-hidden="true" />
          ) : (
            <p className="px-2 pb-1 text-xs font-medium text-gray-500">
              {t("Управление")}
            </p>
          )}
          {manageItems.map(renderItem)}
        </nav>
      )}

      {/* Нижняя часть: статус синхронизации, настройки, знак приложения */}
      <div className="mt-auto flex flex-col gap-px">
        {!demo && <SidebarSyncStatus collapsed={collapsed} />}
        <Link
          to="/settings"
          className={itemClass(path.startsWith("/settings"))}
          aria-current={path.startsWith("/settings") ? "page" : undefined}
          title={collapsed ? t("Настройки") : undefined}
        >
          <Cog6ToothIcon className="size-4 shrink-0 text-gray-500" />
          {!collapsed && <span className="truncate">{t("Настройки")}</span>}
        </Link>
        <div
          className={`mt-2 flex h-7 items-center gap-2 text-xs text-gray-400 dark:text-gray-500 ${
            collapsed ? "justify-center" : "px-2"
          }`}
          title={t("Хочу Плачу")}
        >
          <AppLogoMark className="size-3" />
          {!collapsed && (
            <span className="truncate">{t("Хочу Плачу")}</span>
          )}
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
