// src/components/PaymentRowList.tsx
import React, { useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  PaperClipIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { PaymentData } from "../types/paymentData";
import { formatCurrencyTotals, formatMoney } from "../utils/currencies";
import { formatRecurrenceRule } from "../utils/formatRecurrence";
import { localizedCategoryName } from "../utils/categoryLabel";
import { parseCalendarDate } from "../utils/dateUtils";
import { groupOverdueBySeries, PaymentRowItem } from "../utils/groupOverduePayments";
import { DropdownOption } from "./DropdownButton";
import PaymentIconDisplay from "./PaymentIconDisplay";
import { RowActions } from "./Table";

export type PaymentListMode = "active" | "all" | "archive" | "trash";

interface PaymentRowListProps {
  payments: PaymentData[];
  mode: PaymentListMode;
  isLoading?: boolean;
  emptyMessage: string;
  onOpen: (id: string) => void;
  onComplete?: (payment: PaymentData) => void;
  /** Выполнить все пропущенные периоды серии (строка «×N» в просроченных) */
  onCompleteSeries?: (occurrences: PaymentData[]) => void;
  /** Оплатить пропущенные периоды серии одним платежом (открывает форму платежа) */
  onMergeSeries?: (occurrences: PaymentData[]) => void;
  onDelete?: (payment: PaymentData) => void;
  onRestore?: (payment: PaymentData) => void;
  onPermanentDelete?: (id: string) => void;
  onDownloadFile?: (id: string, fileName: string) => void;
  /** Скрыть заголовки групп (например, если список короткий) */
  hideGroupHeaders?: boolean;
  /**
   * "flush" — список на всю ширину страницы (липкие заголовки групп),
   * "panel" — список внутри панели с меньшими отступами
   */
  inset?: "flush" | "panel" | "plain";
  /** Показать строку с названиями колонок */
  showColumnHeader?: boolean;
  /**
   * Сколько строк показывать в каждой группе; остальные сворачиваются
   * в строку «Ещё N», которая раскрывает только эту группу
   */
  groupLimit?: number;
  /** Подсвеченная строка (например, пока открыта мобильная панель действий) */
  selectedId?: string | null;
}

interface PaymentGroup {
  key: string;
  label: string;
  /** Все платежи группы — для счетчика и суммы в заголовке */
  payments: PaymentData[];
  /** Строки группы: просроченные платежи одной серии собраны в одну строку */
  items: PaymentRowItem[];
}

const toSingleItems = (payments: PaymentData[]): PaymentRowItem[] =>
  payments.map((payment) => ({ key: payment.id, payment, occurrences: [payment] }));

const DAY_MS = 24 * 60 * 60 * 1000;

// Начало суток для корректного сравнения календарных дат
const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Иконка статуса платежа в духе Linear: пустой круг, полукруг, галочка.
 */
export const PaymentStatusIcon: React.FC<{
  payment: PaymentData;
  isToday?: boolean;
}> = ({ payment, isToday }) => {
  const { t } = useLanguage();
  const size = 14;

  if (payment.status === "completed") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label={t("Выполнен")} role="img">
        <circle cx="7" cy="7" r="6" className="fill-indigo-600 dark:fill-indigo-500" />
        <path d="M4.3 7.2 6.1 9l3.6-3.8" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (payment.status === "deleted") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label={t("Удален")} role="img">
        <circle cx="7" cy="7" r="6" className="fill-gray-300 dark:fill-gray-600" />
        <path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (payment.status === "overdue") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label={t("Просрочен")} role="img">
        <circle cx="7" cy="7" r="6" className="fill-red-500" />
        <path d="M7 4v3.4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="9.8" r="0.85" fill="white" />
      </svg>
    );
  }
  if (isToday) {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-label={t("Сегодня")} role="img">
        <circle cx="7" cy="7" r="5.75" fill="none" strokeWidth="1.5" className="stroke-amber-500" />
        <path d="M7 3.2a3.8 3.8 0 0 1 0 7.6z" className="fill-amber-500" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-label={t("Предстоящий")} role="img">
      <circle cx="7" cy="7" r="5.75" fill="none" strokeWidth="1.5" strokeDasharray="2.4 1.6" className="stroke-gray-400 dark:stroke-gray-500" />
    </svg>
  );
};

/**
 * Список платежей в виде строк, сгруппированных по сроку или по месяцу.
 */
const PaymentRowList: React.FC<PaymentRowListProps> = ({
  payments,
  mode,
  isLoading = false,
  emptyMessage,
  onOpen,
  onComplete,
  onCompleteSeries,
  onMergeSeries,
  onDelete,
  onRestore,
  onPermanentDelete,
  onDownloadFile,
  hideGroupHeaders = false,
  inset = "flush",
  showColumnHeader = false,
  groupLimit,
  selectedId = null,
}) => {
  // Группы, раскрытые пользователем полностью
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string): void =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // Раскрытые строки «×N» (пропущенные периоды серии)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const toggleSeries = (key: string): void =>
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const padX = inset === "panel" ? "px-4" : inset === "plain" ? "px-2" : "px-6";
  // Отступы строк для десктопа; на мобильных строки идут по фону страницы без карточек
  const mdPadX = inset === "panel" ? "md:px-4" : inset === "plain" ? "md:px-2" : "md:px-6";
  const isPlain = inset === "plain";
  // Мобильная строка: на всю ширину экрана (компенсируем боковой отступ страницы),
  // чтобы зона нажатия и подсветка были во всю ширину, а текст остался на месте
  const mobileRowX = "-mx-3 px-4 md:mx-0";
  // Список: на мобильных — плоские строки с едва заметными разделителями,
  // на десктопе — строки с разделителями цвета рамки
  const listClass = `divide-y divide-black/[0.06] dark:divide-white/[0.05] md:divide-[var(--ui-border)] ${
    isPlain ? "" : "md:border-b md:border-[var(--ui-border)]"
  }`;
  // Группы (Просрочено, Сегодня, Позже) отделены чуть большим отступом
  const groupGap = "[&>section+section]:mt-7 md:[&>section+section]:mt-5";
  const { t, locale, language } = useLanguage();
  const today = startOfDay(new Date());

  const shortDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }),
    [locale]
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale]
  );
  const longDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }),
    [locale]
  );

  const groups = useMemo<PaymentGroup[]>(() => {
    // Архив и корзина — по месяцам выполнения/удаления
    if (mode === "archive" || mode === "trash") {
      const map = new Map<string, PaymentGroup>();
      payments.forEach((p) => {
        const d = new Date(p.completedAt || p.updatedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!map.has(key)) {
          const label = monthFormatter.format(d);
          map.set(key, {
            key,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            payments: [],
            items: [],
          });
        }
        map.get(key)!.payments.push(p);
      });
      return Array.from(map.values()).map((g) => ({ ...g, items: toSingleItems(g.payments) }));
    }

    // Активные — по сроку относительно сегодняшнего дня
    const buckets: PaymentGroup[] = [
      { key: "overdue", label: t("Просрочено"), payments: [], items: [] },
      { key: "today", label: t("Сегодня"), payments: [], items: [] },
      { key: "week", label: t("Ближайшие 7 дней"), payments: [], items: [] },
      { key: "later", label: t("Позже"), payments: [], items: [] },
      { key: "done", label: t("Выполнено"), payments: [], items: [] },
    ];
    payments.forEach((p) => {
      if (p.status === "completed" || p.status === "deleted") {
        buckets[4].payments.push(p);
        return;
      }
      if (p.status === "overdue") {
        buckets[0].payments.push(p);
        return;
      }
      const diff = Math.round(
        (startOfDay(parseCalendarDate(p.dueDate)) - today) / DAY_MS
      );
      if (diff < 0) buckets[0].payments.push(p);
      else if (diff === 0) buckets[1].payments.push(p);
      else if (diff <= 7) buckets[2].payments.push(p);
      else buckets[3].payments.push(p);
    });
    return buckets
      .filter((g) => g.payments.length > 0)
      .map((g) => ({
        ...g,
        // Пропущенные периоды одной серии показываем одной строкой «×N»
        items: g.key === "overdue" ? groupOverdueBySeries(g.payments) : toSingleItems(g.payments),
      }));
  }, [payments, mode, t, today, monthFormatter]);

  const buildActions = (payment: PaymentData): DropdownOption[] => {
    if (mode === "archive" || mode === "trash") {
      return [
        { label: t("Редактировать"), onClick: () => onOpen(payment.id), icon: <PencilIcon /> },
        ...(onRestore
          ? [{ label: t("Восстановить"), onClick: () => onRestore(payment), icon: <ArrowPathIcon /> }]
          : []),
        ...(onPermanentDelete
          ? [{ label: t("Удалить полностью"), onClick: () => onPermanentDelete(payment.id), icon: <TrashIcon /> }]
          : []),
      ];
    }
    const options: DropdownOption[] = [];
    if (payment.status !== "deleted") {
      options.push({ label: t("Редактировать"), onClick: () => onOpen(payment.id), icon: <PencilIcon /> });
    }
    if ((payment.status === "upcoming" || payment.status === "overdue") && onComplete && onDelete) {
      options.push(
        { label: t("Выполнить"), onClick: () => onComplete(payment), icon: <CheckCircleIcon /> },
        { label: t("Удалить"), onClick: () => onDelete(payment), icon: <TrashIcon /> }
      );
    }
    return options;
  };

  // Действия строки «×N»: выполнить все пропущенные периоды или открыть текущий платеж серии
  const buildSeriesActions = (item: PaymentRowItem): DropdownOption[] => {
    if (!onCompleteSeries && !onMergeSeries) return buildActions(item.payment);
    const options: DropdownOption[] = [];
    if (onMergeSeries) {
      options.push({
        label: t("Оплатить одним платежом"),
        onClick: () => onMergeSeries(item.occurrences),
        icon: <ArrowsPointingInIcon />,
      });
    }
    if (onCompleteSeries) {
      options.push({
        label: t("Выполнить все ({1})", item.occurrences.length),
        onClick: () => onCompleteSeries(item.occurrences),
        icon: <CheckCircleIcon />,
      });
    }
    options.push({ label: t("Редактировать"), onClick: () => onOpen(item.payment.id), icon: <PencilIcon /> });
    if (onDelete) {
      options.push({ label: t("Удалить"), onClick: () => onDelete(item.payment), icon: <TrashIcon /> });
    }
    return options;
  };

  // Раскрытая строка «×N»: пропущенные периоды по датам и кнопка «выполнить все».
  // Действия доступны только у реального (самого раннего) платежа — периоды закрываются по порядку.
  const seriesFooterButton = `flex min-h-11 w-[calc(100%+1.5rem)] items-center gap-3 -mx-3 px-4 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.025] cursor-pointer md:mx-0 md:min-h-9 md:w-full md:text-xs ${mdPadX} ${
    isPlain ? "md:rounded-md" : ""
  }`;
  const renderSeriesOccurrences = (item: PaymentRowItem, totalText: string): React.ReactNode => (
    <li>
      <ul aria-label={t("Пропущенные платежи: {1}", item.occurrences.length)}>
        {item.occurrences.map((occurrence) => {
          const isActionable = !occurrence.isVirtual;
          const isOccurrenceSelected = selectedId === occurrence.id;
          return (
            <li
              key={occurrence.id}
              onClick={isActionable ? () => onOpen(occurrence.id) : undefined}
              aria-selected={isOccurrenceSelected || undefined}
              className={[
                "group flex h-11 items-center gap-3 text-sm transition-colors md:h-9",
                mobileRowX,
                mdPadX,
                isPlain ? "md:rounded-md" : "",
                isActionable
                  ? "cursor-pointer active:bg-black/[0.03] dark:active:bg-white/[0.04] md:hover:bg-gray-50 md:dark:hover:bg-white/[0.025]"
                  : "",
                isOccurrenceSelected ? "bg-black/[0.04] dark:bg-white/[0.05]" : "",
              ].join(" ")}
            >
              {/* Линия под иконкой статуса связывает периоды с их серией */}
              <span
                aria-hidden="true"
                className="relative w-3.5 shrink-0 self-stretch before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-gray-200 dark:before:bg-white/[0.08]"
              />
              <span aria-hidden="true" className="hidden size-4 shrink-0 md:block" />
              <span
                className={`min-w-0 flex-1 truncate tabular-nums ${
                  isActionable ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {longDate.format(parseCalendarDate(occurrence.dueDate))}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-4">
                <span
                  className={`text-right tabular-nums md:w-28 ${
                    isActionable ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {formatMoney(occurrence.amount, locale, occurrence.currency)}
                </span>
                <span className="hidden w-7 md:block" onClick={(e) => e.stopPropagation()}>
                  {isActionable && <RowActions options={buildActions(occurrence)} />}
                </span>
              </span>
            </li>
          );
        })}
        {/* Основное действие — оплатить одним платежом; «выполнить все» — второстепенное */}
        {onMergeSeries && (
          <li>
            <button
              type="button"
              onClick={() => onMergeSeries(item.occurrences)}
              className={`${seriesFooterButton} font-medium text-indigo-600 dark:text-indigo-400`}
            >
              <span aria-hidden="true" className="w-3.5 shrink-0" />
              <ArrowsPointingInIcon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t("Оплатить одним платежом")}</span>
              <span className="shrink-0 tabular-nums">{totalText}</span>
              <span className="hidden w-11 shrink-0 md:block" aria-hidden="true" />
            </button>
          </li>
        )}
        {onCompleteSeries && (
          <li>
            <button
              type="button"
              onClick={() => onCompleteSeries(item.occurrences)}
              className={`${seriesFooterButton} text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100`}
            >
              <span aria-hidden="true" className="w-3.5 shrink-0" />
              <CheckCircleIcon className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t("Отметить все выполненными")}</span>
            </button>
          </li>
        )}
      </ul>
    </li>
  );

  // Строка списка. Пропущенные периоды одной серии — одна строка «×N» с общей суммой,
  // по нажатию раскрывается список дат
  const renderItem = (item: PaymentRowItem, groupKey: string): React.ReactNode => {
    const { payment, occurrences } = item;
    const isSeriesGroup = occurrences.length > 1;
    const expandKey = `${groupKey}:${item.key}`;
    const isSeriesExpanded = isSeriesGroup && expandedSeries.has(expandKey);
    const due = parseCalendarDate(occurrences[0].dueDate);
    const isToday = startOfDay(due) === today;
    const isClosed = payment.status === "completed" || payment.status === "deleted";
    const isSelected = !isSeriesGroup && selectedId === payment.id;
    const dateValue = isClosed
      ? new Date(payment.completedAt || payment.updatedAt)
      : due;
    const amountText = isSeriesGroup
      ? formatCurrencyTotals(occurrences, locale)
      : formatMoney(payment.amount, locale, payment.currency);
    const handleRowClick = (): void => {
      if (isSeriesGroup) toggleSeries(expandKey);
      else onOpen(payment.id);
    };
    const recurrence = payment.series?.recurrenceRule
      ? t(formatRecurrenceRule(payment.series.recurrenceRule))
      : null;
    const category = payment.transactionCategory
      ? localizedCategoryName(payment.transactionCategory, language)
      : null;
    const titleClass = isClosed
      ? "text-gray-500 dark:text-gray-400"
      : "text-gray-900 dark:text-gray-50";
    const dateClass =
      payment.status === "overdue"
        ? "text-red-600 dark:text-red-400"
        : "text-gray-500 dark:text-gray-400";
    const attachment =
      payment.filePath && payment.fileName && onDownloadFile ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownloadFile(payment.id, payment.fileName!);
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer md:size-auto"
          title={payment.fileName}
          aria-label={payment.fileName}
        >
          <PaperClipIcon className="size-3.5" />
        </button>
      ) : null;
    const meta = [category, recurrence].filter(Boolean).join(" · ");
    const seriesLabel = t("Пропущенные платежи: {1}", occurrences.length);
    const seriesBadge = isSeriesGroup ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleSeries(expandKey);
        }}
        aria-expanded={isSeriesExpanded}
        aria-label={seriesLabel}
        title={seriesLabel}
        className="inline-flex h-5 shrink-0 items-center gap-0.5 self-center rounded-sm bg-red-50 pl-1.5 pr-1 text-xs font-medium tabular-nums text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 cursor-pointer"
      >
        ×{occurrences.length}
        <ChevronDownIcon
          className={`size-3 transition-transform ${isSeriesExpanded ? "rotate-180" : ""}`}
        />
      </button>
    ) : null;

    const row = (
      <li
        key={item.key}
        onClick={handleRowClick}
        aria-selected={isSelected || undefined}
        className={[
          "group cursor-pointer text-sm transition-colors",
          // Мобильные: плоская строка по фону страницы с крупной зоной нажатия
          "py-3.5 active:bg-black/[0.03] dark:active:bg-white/[0.04]",
          mobileRowX,
          // Десктоп: строка списка
          "md:flex md:h-11 md:items-center md:gap-3 md:py-0 md:hover:bg-gray-50 md:dark:hover:bg-white/[0.025]",
          mdPadX,
          isPlain ? "md:rounded-md" : "",
          isSelected ? "bg-black/[0.04] dark:bg-white/[0.05]" : "",
          // Раскрытая серия не отделяется чертой от своих периодов
          isSeriesExpanded ? "border-b-0" : "",
        ].join(" ")}
      >
        {/* Мобильная карточка: название и сумма, ниже — тип, категория и срок */}
        <div className="flex items-center gap-3 md:hidden">
          <PaymentStatusIcon payment={payment} isToday={isToday} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-3">
              <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
                <span className={`min-w-0 truncate font-medium ${titleClass}`}>
                  {payment.title}
                </span>
                {seriesBadge}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-gray-900 dark:text-gray-50">
                {amountText}
              </span>
            </div>
            <div className="mt-0.5 flex h-5 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex size-3.5 shrink-0 items-center justify-center [&_svg]:size-3.5 [&_svg]:text-gray-400! dark:[&_svg]:text-gray-500!">
                <PaymentIconDisplay payment={payment} sizeClass="size-3.5" />
              </span>
              {meta && <span className="min-w-0 truncate">{meta}</span>}
              {attachment}
              <span className={`ml-auto shrink-0 tabular-nums ${dateClass}`}>
                {shortDate.format(dateValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Десктопная строка */}
        <div className="hidden md:contents">
          <PaymentStatusIcon payment={payment} isToday={isToday} />
          <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4 [&_svg]:text-gray-500! dark:[&_svg]:text-gray-400!">
            <PaymentIconDisplay payment={payment} sizeClass="size-4" />
          </span>
          <span className={`min-w-0 truncate font-medium ${titleClass}`} title={payment.title}>
            {payment.title}
          </span>
          {seriesBadge}
          {recurrence && (
            <span className="hidden shrink-0 items-center gap-1 text-xs text-gray-500 dark:text-gray-400 app-lg:inline-flex">
              <ArrowPathIcon className="size-3" />
              {recurrence}
            </span>
          )}
          {payment.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className="hidden shrink-0 rounded-sm border border-[var(--ui-border)] px-1.5 text-xs leading-5 text-gray-600 dark:text-gray-400 app-xl:inline"
            >
              {tag.name}
            </span>
          ))}
          <span className="ml-auto flex shrink-0 items-center gap-4">
            {attachment}
            {category && (
              <span className="hidden w-40 truncate text-xs text-gray-500 dark:text-gray-400 @min-[40rem]:inline">
                {category}
              </span>
            )}
            <span className={`w-16 text-right text-xs tabular-nums ${dateClass}`}>
              {shortDate.format(dateValue)}
            </span>
            <span className="w-28 text-right font-medium tabular-nums text-gray-900 dark:text-gray-50">
              {amountText}
            </span>
            <span className="w-7" onClick={(e) => e.stopPropagation()}>
              <RowActions options={isSeriesGroup ? buildSeriesActions(item) : buildActions(payment)} />
            </span>
          </span>
        </div>
      </li>
    );

    if (!isSeriesGroup) return row;
    return (
      <React.Fragment key={item.key}>
        {row}
        {isSeriesExpanded && renderSeriesOccurrences(item, amountText)}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      // Заглушка повторяет форму списка: заголовки групп и строки, чтобы при появлении данных ничего не прыгало
      <div className={isPlain ? `md:-mx-2 ${groupGap}` : groupGap} aria-busy="true">
        {[3, 2].map((rowCount, g) => (
          <section key={g}>
            {!hideGroupHeaders && (
              <div className={`flex h-8 items-center px-1 ${mdPadX}`}>
                <div className="h-3 w-24 rounded-sm bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
              </div>
            )}
            <div className={listClass}>
              {Array.from({ length: rowCount }).map((_, i) => (
                <div
                  key={i}
                  className={`flex h-[68px] items-center gap-3 ${mobileRowX} md:h-11 ${mdPadX}`}
                >
                  <div className="size-3.5 rounded-full bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
                  <div
                    className="h-3 rounded-sm bg-gray-100 dark:bg-white/[0.06] animate-pulse"
                    style={{ width: `${[14, 10, 12][i % 3]}rem` }}
                  />
                  <div className="ml-auto h-3 w-20 rounded-sm bg-gray-100 dark:bg-white/[0.06] animate-pulse" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={
        isPlain
          ? `@container md:-mx-2 [&>section:last-child>ul]:border-b-0 ${groupGap}`
          : inset === "panel"
            ? `@container [&>section:last-child>ul]:border-b-0 ${groupGap}`
            : `@container ${groupGap}`
      }
    >
      {showColumnHeader && (
        <div
          className={`flex h-8 items-center gap-3 border-b border-[var(--ui-border)] text-xs font-medium text-gray-500 dark:text-gray-400 ${padX}`}
        >
          <span className="pl-[44px]">{t("Платёж")}</span>
          <span className="ml-auto flex shrink-0 items-center gap-4">
            <span className="hidden w-40 @min-[40rem]:inline">{t("Категория")}</span>
            <span className="w-16 text-right">
              {mode === "archive" ? t("Выполнен") : mode === "trash" ? t("Удален") : t("Срок")}
            </span>
            <span className="w-28 text-right">{t("Сумма")}</span>
            <span className="w-7" aria-hidden="true" />
          </span>
        </div>
      )}
      {groups.map((group) => {
        return (
          <section key={group.key}>
            {!hideGroupHeaders && (
              <div
                className={`flex min-h-8 flex-wrap items-center gap-2 px-1 py-1 text-sm md:text-xs ${mdPadX} ${
                  isPlain
                    ? "text-gray-500 dark:text-gray-400"
                    : "border-b border-[var(--ui-border)] bg-gray-50/80 dark:bg-white/[0.025]"
                } ${inset === "flush" ? "sticky top-0 z-10 backdrop-blur" : ""}`}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {group.label}
                </span>
                <span className="tabular-nums text-gray-400 dark:text-gray-500">
                  {group.payments.length}
                </span>
                <span className="ml-auto text-right tabular-nums text-gray-500 dark:text-gray-400">
                  {formatCurrencyTotals(group.payments, locale)}
                </span>
                <span className="hidden w-11 md:block" aria-hidden="true" />
              </div>
            )}
            <ul className={listClass}>
              {(groupLimit && !expandedGroups.has(group.key)
                ? group.items.slice(0, groupLimit)
                : group.items
              ).map((item) => renderItem(item, group.key))}
              {groupLimit && group.items.length > groupLimit && (() => {
                const isExpanded = expandedGroups.has(group.key);
                const hiddenItems = group.items.slice(groupLimit);
                const hidden = hiddenItems.flatMap((i) => i.occurrences);
                return (
                  <li>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={isExpanded}
                      className={`flex min-h-11 w-[calc(100%+1.5rem)] flex-wrap items-center gap-2 -mx-3 px-4 py-1 text-left text-xs text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.025] dark:hover:text-gray-100 cursor-pointer md:mx-0 md:min-h-9 md:w-full ${mdPadX}`}
                    >
                      <ChevronDownIcon className={`size-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      <span className="font-medium">
                        {isExpanded ? t("Свернуть") : t("Ещё {1}", hiddenItems.length)}
                      </span>
                      {!isExpanded && (
                        <span className="ml-auto text-right tabular-nums">
                          {formatCurrencyTotals(hidden, locale)}
                        </span>
                      )}
                      <span className="hidden w-11 md:block" aria-hidden="true" />
                    </button>
                  </li>
                );
              })()}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default PaymentRowList;
