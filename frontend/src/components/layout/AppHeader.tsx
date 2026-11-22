// src/components/layout/AppHeader.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useDropdown } from "../../hooks/useDropdown";
import Overlay from "../Overlay";

/**
 * Шапка рабочего интерфейса устроена так:
 * - App.tsx рисует одну полосу шапки (мобильные и десктоп) и кнопку «+» внизу справа;
 * - страница через <PageHeader> отправляет в неё заголовок, действия и основное действие
 *   с помощью порталов. Так разметка шапки общая, а обработчики остаются у страницы.
 */

export interface AppHeaderSlots {
  /** Узел для заголовка страницы */
  title: HTMLElement | null;
  /** Узел для действий справа */
  actions: HTMLElement | null;
  /** Узел для плавающей кнопки основного действия */
  fab: HTMLElement | null;
  /** Сообщает оболочке, есть ли у страницы плавающая кнопка (нужен отступ снизу) */
  setHasFab: (value: boolean) => void;
  /** Скрыть полосу шапки на десктопе */
  setHideDesktopBar: (value: boolean) => void;
  /** Плавающая шапка на мобильных (без полосы) */
  setFloatingMobileBar: (value: boolean) => void;
}

export const AppHeaderSlotsContext = createContext<AppHeaderSlots | null>(null);

// Квадратная иконка-кнопка без рамки — единый вид для всех действий шапки
export const HEADER_ICON_BUTTON_CLASS =
  "relative flex size-9 md:size-8 shrink-0 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-gray-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:pointer-events-none disabled:opacity-40";

interface HeaderIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Доступное название; дублируется во всплывающей подсказке */
  label: string;
  icon: React.ReactNode;
  /** Подсветить кнопку как активную (например, применены фильтры) */
  active?: boolean;
  /** Показать точку-индикатор в углу */
  indicator?: boolean;
  tone?: "default" | "destructive";
}

/**
 * Иконка-кнопка шапки: без рамки, с мягким фоном при наведении.
 */
export const HeaderIconButton = React.forwardRef<
  HTMLButtonElement,
  HeaderIconButtonProps
>(
  (
    {
      label,
      icon,
      active = false,
      indicator = false,
      tone = "default",
      className = "",
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={`${HEADER_ICON_BUTTON_CLASS} ${
        active
          ? "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-gray-50"
          : ""
      } ${
        tone === "destructive"
          ? "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          : ""
      } [&_svg]:size-5 md:[&_svg]:size-4 ${className}`.trim()}
      {...rest}
    >
      {icon}
      {indicator && (
        <span
          className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-indigo-500 ring-2 ring-[var(--ui-bg)] md:right-1 md:top-1 md:ring-[var(--ui-surface)]"
          aria-hidden="true"
        />
      )}
    </button>
  )
);
HeaderIconButton.displayName = "HeaderIconButton";

export interface HeaderViewOption<T extends string> {
  value: T;
  label: string;
}

interface HeaderViewMenuProps<T extends string> {
  options: HeaderViewOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Доступное название меню (например, «Статус») */
  ariaLabel?: string;
}

/**
 * Заголовок-переключатель представлений: название текущего вида и шеврон,
 * по нажатию — меню со списком видов.
 */
export const HeaderViewMenu = <T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: HeaderViewMenuProps<T>): React.JSX.Element => {
  const { isOpen, setIsOpen, containerRef } = useDropdown();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = options.find((option) => option.value === value);

  // Закрытие меню по Escape с возвратом фокуса на заголовок
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, setIsOpen]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ariaLabel ? `${ariaLabel}: ${current?.label ?? ""}` : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={`-mx-1.5 flex h-9 min-w-0 items-center gap-1 rounded-md px-1.5 text-gray-900 transition-colors hover:bg-gray-100 dark:text-gray-50 dark:hover:bg-white/[0.06] md:h-7 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
          isOpen ? "bg-gray-100 dark:bg-white/[0.06]" : ""
        }`}
      >
        <span className="truncate text-lg font-semibold tracking-tight md:text-sm">
          {current?.label}
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-gray-400 transition-transform md:size-3.5 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      <Overlay
        isOpen={isOpen}
        anchorRef={containerRef}
        align="start"
        offset={6}
        widthClass="min-w-48"
      >
        <div className="p-1">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/[0.06] md:h-8 cursor-pointer ${
                  isSelected
                    ? "font-medium text-gray-900 dark:text-gray-50"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <span className="flex-1 truncate">{option.label}</span>
                {isSelected && (
                  <CheckIcon
                    className="size-4 text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </Overlay>
    </div>
  );
};

export interface PageBreadcrumb {
  label: string;
  to?: string;
}

export interface PagePrimaryAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface PageHeaderProps {
  /** Заголовок текущей страницы (или переключатель представлений); можно не указывать */
  title?: React.ReactNode;
  /** Цепочка родительских страниц — показывается на десктопе */
  breadcrumbs?: PageBreadcrumb[];
  /** Дополнительный элемент сразу после заголовка (подсказка, бейдж) */
  titleAddon?: React.ReactNode;
  /** Иконки-действия в правой части шапки */
  actions?: React.ReactNode;
  /**
   * Основное действие страницы. На мобильных — плавающая кнопка «+» под большим пальцем,
   * на десктопе — кнопка в правой части шапки рядом с поиском и фильтрами.
   */
  primaryAction?: PagePrimaryAction | null;
  /**
   * Показывать ли полосу шапки на десктопе. false — полоса скрыта, а основное действие
   * страница размещает сама в своём содержимом (на мобильных остаётся плавающая кнопка).
   */
  desktopBar?: boolean;
  /**
   * Вид шапки на мобильных: "bar" — обычная полоса; "floating" — без полосы:
   * кнопка меню на обычном месте слева сверху, а первая строка страницы стоит рядом с ней
   * (страница сама делает отступ под кнопку; экономит строку).
   * Плавающий режим рассчитан на страницы без заголовка и с desktopBar={false}.
   */
  mobileBar?: "bar" | "floating";
}

/**
 * Шапка страницы рабочего интерфейса. Сама ничего не рисует на месте вызова:
 * содержимое переносится порталами в общую шапку приложения.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumbs,
  titleAddon,
  actions,
  primaryAction,
  desktopBar = true,
  mobileBar = "bar",
}) => {
  const slots = useContext(AppHeaderSlotsContext);
  const hasFab = Boolean(primaryAction);
  const setHasFab = slots?.setHasFab;

  useEffect(() => {
    if (!setHasFab) return;
    setHasFab(hasFab);
    return () => setHasFab(false);
  }, [hasFab, setHasFab]);

  // Страница может убрать полосу шапки на десктопе (например, главная)
  // useLayoutEffect — режим шапки применяется до отрисовки, без мелькания полосы
  const setHideDesktopBar = slots?.setHideDesktopBar;
  useLayoutEffect(() => {
    if (!setHideDesktopBar || desktopBar) return;
    setHideDesktopBar(true);
    return () => setHideDesktopBar(false);
  }, [desktopBar, setHideDesktopBar]);

  const setFloatingMobileBar = slots?.setFloatingMobileBar;
  useLayoutEffect(() => {
    if (!setFloatingMobileBar || mobileBar !== "floating") return;
    setFloatingMobileBar(true);
    return () => setFloatingMobileBar(false);
  }, [mobileBar, setFloatingMobileBar]);

  if (!slots) return null;

  const hasTitle = title != null || Boolean(breadcrumbs?.length) || Boolean(titleAddon);
  const titleContent = (
    <div className="flex min-w-0 items-center gap-1.5">
      {breadcrumbs?.map((crumb) => (
        <span
          key={crumb.label}
          className="hidden min-w-0 items-center gap-1.5 md:flex"
        >
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="truncate text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 cursor-pointer"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate text-sm text-gray-500 dark:text-gray-400">
              {crumb.label}
            </span>
          )}
          <ChevronRightIcon
            className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600"
            aria-hidden="true"
          />
        </span>
      ))}
      {title == null ? null : typeof title === "string" ? (
        <h1 className="truncate text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-50 md:text-sm">
          {title}
        </h1>
      ) : (
        title
      )}
      {titleAddon}
    </div>
  );

  return (
    <>
      {slots.title &&
        hasTitle &&
        ReactDOM.createPortal(titleContent, slots.title)}
      {slots.actions &&
        (actions || primaryAction) &&
        ReactDOM.createPortal(
          <>
            {actions}
            {primaryAction && desktopBar && (
              <PrimaryActionButton
                action={primaryAction}
                className="ml-1.5 hidden md:inline-flex"
              />
            )}
          </>,
          slots.actions
        )}
      {slots.fab &&
        primaryAction &&
        ReactDOM.createPortal(
          <FloatingActionButton action={primaryAction} />,
          slots.fab
        )}
    </>
  );
};

/**
 * Основное действие на десктопе: залитая кнопка без рамки, одной высоты (h-8)
 * с иконками шапки — одинаковая в шапке и на главной.
 * Используется в шапке и внутри страниц (например, на главной рядом с суммой к оплате).
 */
export const PrimaryActionButton: React.FC<{
  action: PagePrimaryAction;
  className?: string;
}> = ({ action, className = "" }) => (
  <button
    type="button"
    onClick={action.onClick}
    disabled={action.disabled}
    className={`shrink-0 items-center gap-1.5 rounded-md bg-indigo-600 font-medium text-white shadow-[0_1px_1px_rgba(16,17,20,0.1)] transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:pointer-events-none disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 h-8 pl-2.5 pr-3 text-sm ${className}`.trim()}
  >
    {action.icon ? (
      <span className="flex [&_svg]:size-3.5">{action.icon}</span>
    ) : (
      <PlusIcon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
    )}
    <span>{action.label}</span>
  </button>
);

/**
 * Плавающая кнопка основного действия — только на мобильных,
 * в зоне досягаемости большого пальца.
 */
export const FloatingActionButton: React.FC<{ action: PagePrimaryAction }> = ({
  action,
}) => (
  <button
    type="button"
    onClick={action.onClick}
    disabled={action.disabled}
    aria-label={action.label}
    title={action.label}
    className="pointer-events-auto flex size-14 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-[0_1px_2px_rgba(16,17,20,0.12),0_8px_24px_-6px_rgba(79,70,229,0.45)] transition-colors hover:bg-indigo-700 active:bg-indigo-800 disabled:pointer-events-none disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 [&_svg]:size-6"
  >
    {action.icon ?? <PlusIcon strokeWidth={2} aria-hidden="true" />}
  </button>
);
