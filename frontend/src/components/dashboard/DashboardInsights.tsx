// src/components/dashboard/DashboardInsights.tsx
import React, { useMemo } from "react";
import {
  BanknotesIcon,
  ChartPieIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "../../context/LanguageContext";
import { ratesNoteKey, type AnalyticsPayment } from "../../utils/dashboardStats";
import { formatMoney } from "../../utils/currencies";
import { getInsightDayCount, type InsightPeriod } from "../../utils/dashboardInsights";
import { parseCalendarDate } from "../../utils/dateUtils";
import { localizedCategoryName } from "../../utils/categoryLabel";
import { CategoryAmount } from "./CategoryBreakdown";

interface InsightsStats {
  totalCompletedAmount: string | number | null;
  conversionUnavailable: boolean;
  usedCurrentRatesFallback?: boolean;
  allPaymentsInMonth: AnalyticsPayment[];
}

interface DashboardInsightsProps {
  stats: InsightsStats | null;
  startDate: Date;
  endDate: Date;
  previousPeriod: InsightPeriod | null;
  previousTotal: number | null;
  currency: string;
  timezone?: string;
  theme: "light" | "dark";
  onOpenPayment: (id: string) => void;
  /** При смене периода скрываем старые наблюдения до загрузки новых данных. */
  isLoading?: boolean;
  /** Элементы справа от заголовка (например, выбор периода). */
  actions?: React.ReactNode;
}

interface InsightRow {
  key: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: React.ReactNode;
  meta?: React.ReactNode;
  visual?: React.ReactNode;
  onClick?: () => void;
}

// Неразрывный пробел: склеивает части дат и подписей, чтобы они не переносились по отдельности
const NBSP = " ";

// Суммируем уже пересчитанные в валюту профиля суммы.
const sumConverted = (items: AnalyticsPayment[]): number =>
  items.reduce((acc, p) => acc + Number(p.convertedAmount ?? 0), 0);

// Маленькое кольцо доли (процент от целого)
const ShareRing: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const length = (Math.min(100, Math.max(0, percent)) / 100) * circumference;
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="3" className="stroke-gray-200 dark:stroke-white/10" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={`${length} ${circumference}`}
        />
      </svg>
      <span className="text-[10px] font-semibold leading-none tabular-nums text-gray-600 dark:text-gray-300">
        {Math.round(percent)}%
      </span>
    </span>
  );
};

// Мини-столбики: выделенный элемент акцентом, остальные — серым
const MiniBars: React.FC<{ values: number[]; highlight: number; color: string }> = ({ values, highlight, color }) => {
  const max = Math.max(1, ...values);
  return (
    <span className="flex h-6 w-10 items-end gap-[2px]" aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={i}
          className={`flex-1 rounded-t-[2px] ${i === highlight ? "" : "bg-gray-300 dark:bg-white/20"}`}
          style={{ height: `${Math.max(12, (v / max) * 100)}%`, backgroundColor: i === highlight ? color : undefined }}
        />
      ))}
    </span>
  );
};

/**
 * Блок «Наблюдения»: несколько коротких фактов о платежах и расходах
 * одним списком — у каждого факта своя маленькая визуализация.
 */
const DashboardInsights: React.FC<DashboardInsightsProps> = ({
  stats,
  startDate,
  endDate,
  previousPeriod,
  previousTotal,
  currency,
  timezone,
  theme,
  onOpenPayment,
  actions,
  isLoading = false,
}) => {
  const { t, locale, language } = useLanguage();
  const accent = theme === "dark" ? "#3987e5" : "#2a78d6";

  const rows = useMemo<InsightRow[]>(() => {
    // Без пересчёта в валюту профиля наблюдения смешали бы валюты.
    if (!stats || stats.conversionUnavailable) return [];
    const completed = (stats?.allPaymentsInMonth ?? []).filter((p) => p.status === "completed");
    const list: InsightRow[] = [];
    // Неразрывные пробелы внутри даты: «2026 г.» никогда не отрывается от месяца
    const keepTogether = (text: string): string => text.replace(/\s/g, NBSP);
    const dateLabel = (date: Date, timeZone?: string): string => keepTogether(new Intl.DateTimeFormat(locale, {
      day: "numeric", month: "short", year: "numeric", timeZone,
    }).format(date));
    // Короткий период для сравнения: «1–31 окт.»; год показываем, только если он отличается от текущего
    const shortRangeLabel = (from: Date, to: Date): string => {
      const withYear = from.getFullYear() !== endDate.getFullYear() || to.getFullYear() !== endDate.getFullYear();
      // formatRange нет в текущих lib-типах TypeScript, поэтому проверяем его наличие явно
      const format: Intl.DateTimeFormat & { formatRange?: (start: Date, end: Date) => string } =
        new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
      return keepTogether(format.formatRange
        ? format.formatRange(from, to)
        : `${format.format(from)} – ${format.format(to)}`);
    };
    const total = Number(stats?.totalCompletedAmount ?? 0);

    // Крупнейший выполненный платёж выбранного периода и его доля.
    if (completed.length > 0) {
      const biggest = [...completed].sort((a, b) => Number(b.convertedAmount) - Number(a.convertedAmount))[0];
      const completedTotal = sumConverted(completed);
      const share = completedTotal > 0 ? (Number(biggest.convertedAmount) / completedTotal) * 100 : 0;
      list.push({
        key: "biggest",
        icon: BanknotesIcon,
        label: t("Крупнейшая трата"),
        value: formatMoney(Number(biggest.convertedAmount), locale, currency),
        // Длинное название обрезаем, дата всегда видна целиком
        meta: (
          <span className="flex min-w-0">
            <span className="truncate">{biggest.title}</span>
            <span className="shrink-0 whitespace-nowrap">
              &nbsp;· {dateLabel(parseCalendarDate(biggest.completedAt || biggest.dueDate), biggest.completedAt ? timezone : undefined)}
            </span>
          </span>
        ),
        visual: <ShareRing percent={share} color={accent} />,
        onClick: () => onOpenPayment(biggest.id),
      });
    }

    // Главная категория расходов за период
    const categoryTotals = new Map<string, CategoryAmount>();
    completed.forEach((payment) => {
      const category = payment.transactionCategory;
      const key = category?.id ?? "no-category";
      const previous = categoryTotals.get(key);
      categoryTotals.set(key, {
        ...category,
        name: category?.name ?? "Без категории",
        amount: (previous?.amount ?? 0) + Number(payment.convertedAmount ?? 0),
      });
    });
    const categories = [...categoryTotals.values()].filter((c) => c.amount > 0);
    if (categories.length > 0) {
      const total = categories.reduce((acc, c) => acc + c.amount, 0);
      const ranked = [...categories].sort((a, b) => b.amount - a.amount);
      const top = ranked[0];
      const share = (top.amount / total) * 100;
      list.push({
        key: "category",
        icon: ChartPieIcon,
        label: t("Больше всего тратите на"),
        value: localizedCategoryName(top, language),
        meta: (
          <>
            {formatMoney(top.amount, locale, currency)} · {share.toFixed(0)}%
          </>
        ),
        visual: <MiniBars values={ranked.slice(0, 5).map((c) => c.amount)} highlight={0} color={accent} />,
      });
    }

    if (stats && startDate.toDateString() !== endDate.toDateString()) {
      list.push({
        key: "average",
        icon: CalculatorIcon,
        label: t("Средние расходы в день"),
        value: formatMoney(total / getInsightDayCount(startDate, endDate), locale, currency),
        // Период уже виден в переключателе, поэтому не повторяем его здесь
        meta: t("По выполненным платежам"),
      });
    }

    // Сравнение с предыдущим календарным периодом без деления на ноль.
    if (stats && previousPeriod) {
      const difference = previousTotal === null ? null : total - previousTotal;
      const percent = previousTotal !== null && previousTotal > 0 && difference !== null
        ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Math.abs(difference / previousTotal) * 100)
        : null;
      const previousRange = shortRangeLabel(previousPeriod.startDate, previousPeriod.endDate);
      list.push({
        key: "comparison",
        icon: difference === null || difference === 0 ? MinusIcon : difference > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
        label: difference === null ? t("Сравнение расходов") : difference === 0 ? t("Расходы не изменились") :
          difference > 0 ? t("Расходы выросли") : t("Расходы снизились"),
        value: difference === null ? t("Нет данных для сравнения") : difference === 0 ? "0%" :
          formatMoney(Math.abs(difference), locale, currency),
        // Одна короткая строка, как у остальных наблюдений: процент и прошлый период
        meta: previousTotal === 0
          ? t("В прошлом периоде расходов не было")
          : percent !== null && difference !== 0
            ? t("{1}% к {2}", percent, previousRange)
            : `${t("Сравнение с")}${NBSP}${previousRange}`,
      });
    }

    return list;
  }, [stats, startDate, endDate, previousPeriod, previousTotal, t, locale, language, currency, timezone, accent, onOpenPayment]);

  // Заголовок с действиями: остаётся на месте при загрузке и пустом периоде
  const header = (
    <div className="flex items-center justify-between gap-2 pb-1 pl-3 pr-1 pt-1.5">
      <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("Наблюдения")}</h2>
      {actions}
    </div>
  );

  if (isLoading) {
    return (
      <section
        className="ui-skeleton-delayed rounded-xl bg-gray-50 p-1.5 dark:bg-white/[0.03]"
        aria-label={t("Наблюдения")}
        aria-busy="true"
      >
        {header}
        <ul className="space-y-0.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-2.5">
              <span className="size-8 shrink-0 rounded-lg bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
              <span className="flex-1 space-y-2 pt-0.5">
                <span className="block h-3 w-24 rounded-sm bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
                <span className="block h-3.5 w-20 rounded-sm bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
                <span className="block h-3 w-36 rounded-sm bg-gray-100 animate-pulse dark:bg-white/[0.04]" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="ui-fade-in rounded-xl bg-gray-50 p-1.5 dark:bg-white/[0.03]" aria-label={t("Наблюдения")}>
        {header}
        <p className="px-3 pb-3 pt-1 text-sm text-gray-500 dark:text-gray-400">
          {/* Без курса наблюдения смешали бы валюты — объясняем причину, а не «нет данных» */}
          {stats?.conversionUnavailable
            ? t("Наблюдения недоступны: нет курса для пересчёта в {1}.", currency)
            : t("Нет наблюдений за этот период.")}
        </p>
      </section>
    );
  }

  return (
    <section className="@container ui-fade-in rounded-xl bg-gray-50 p-1.5 dark:bg-white/[0.03]" aria-label={t("Наблюдения")}>
      {header}
      <p className="px-3 pb-2 text-xs text-gray-500 dark:text-gray-400">{t(ratesNoteKey(stats ?? {}), currency)}</p>
      <ul className="space-y-0.5">
        {rows.map((row) => {
          const Icon = row.icon;
          const content = (
            <>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-surface)] text-gray-500 shadow-sm ring-1 ring-black/[0.04] dark:bg-white/[0.06] dark:text-gray-400 dark:ring-white/[0.04]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                {/* Мини-визуализация — только рядом с подписью и значением, чтобы не отнимать ширину у описания */}
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="mt-0.5 block truncate text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                      {row.value}
                    </span>
                  </span>
                  {/* В узкой колонке мини-графика прячем: иначе подпись ломается на обрывки вроде «на» */}
                  {/* Порог в px: корневой размер шрифта в приложении меняется, rem здесь ненадёжен */}
                  {row.visual && (
                    <span className="hidden h-10 w-10 shrink-0 items-center justify-center @[260px]:flex">{row.visual}</span>
                  )}
                </span>
                {row.meta && (
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-[1.125rem] text-gray-500 dark:text-gray-400">
                    {row.meta}
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li key={row.key}>
              {row.onClick ? (
                <button
                  type="button"
                  onClick={row.onClick}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white dark:hover:bg-white/[0.04] cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-500/50"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-start gap-3 rounded-lg px-3 py-2.5">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DashboardInsights;
