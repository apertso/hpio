// src/components/dashboard/CategoryBreakdown.tsx
import React, { useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useLanguage } from "../../context/LanguageContext";
import { formatMoney } from "../../utils/currencies";
import { localizedCategoryName } from "../../utils/categoryLabel";

export interface CategoryAmount {
  id?: string;
  name: string;
  nameEn?: string | null;
  amount: number;
}

interface CategoryBreakdownProps {
  data: CategoryAmount[] | null | undefined;
  currency: string;
  theme: "light" | "dark";
  emptyMessage: string;
}

// Проверенная категориальная палитра (порядок фиксирован), отдельно для светлой и тёмной темы
const PALETTE_LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const PALETTE_DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c"];
const OTHER_LIGHT = "#b4b4bb";
const OTHER_DARK = "#5a5b62";

// Сколько категорий показывать отдельно до группировки в «Остальные»
const TOP_COUNT = 5;

/**
 * Распределение по категориям: одна составная полоса и компактный список
 * с суммами. Мелкие категории сворачиваются в «Остальные».
 */
const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  data,
  currency,
  theme,
  emptyMessage,
}) => {
  const { t, locale, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const palette = theme === "dark" ? PALETTE_DARK : PALETTE_LIGHT;
  const otherColor = theme === "dark" ? OTHER_DARK : OTHER_LIGHT;

  const { sorted, total, segments } = useMemo(() => {
    const items = (data ?? []).filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);
    const sum = items.reduce((acc, c) => acc + c.amount, 0);
    const top = items.slice(0, TOP_COUNT);
    const restSum = items.slice(TOP_COUNT).reduce((acc, c) => acc + c.amount, 0);
    const segs = top.map((c, i) => ({ amount: c.amount, color: palette[i] }));
    if (restSum > 0) segs.push({ amount: restSum, color: otherColor });
    return { sorted: items, total: sum, segments: segs };
  }, [data, palette, otherColor]);

  if (sorted.length === 0 || total <= 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </p>
    );
  }

  const percent = (amount: number): string =>
    `${((amount / total) * 100).toFixed(amount / total < 0.1 ? 1 : 0)}%`;

  const restItems = sorted.slice(TOP_COUNT);
  const restSum = restItems.reduce((acc, c) => acc + c.amount, 0);
  const visibleItems = expanded ? sorted : sorted.slice(0, TOP_COUNT);

  const renderRow = (
    key: string,
    label: string,
    amount: number,
    color: string
  ): React.JSX.Element => (
    <li key={key} className="flex h-8 items-center gap-2.5 text-sm">
      <span className="size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200" title={label}>
        {label}
      </span>
      <span className="shrink-0 tabular-nums text-gray-900 dark:text-gray-100">
        {formatMoney(amount, locale, currency)}
      </span>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {percent(amount)}
      </span>
    </li>
  );

  return (
    <div>
      {/* Составная полоса: доли категорий с зазором 2px между сегментами */}
      <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={t("Распределение по категориям")}>
        {segments.map((seg, i) => (
          <span
            key={i}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(seg.amount / total) * 100}%`, backgroundColor: seg.color, minWidth: 2 }}
          />
        ))}
      </div>

      <ul className="mt-3">
        {visibleItems.map((c, i) =>
          renderRow(
            c.id || c.name,
            localizedCategoryName(c, language),
            c.amount,
            i < TOP_COUNT ? palette[i] : otherColor
          )
        )}
        {!expanded && restItems.length > 0 &&
          renderRow("__other", t("Остальные ({1})", restItems.length), restSum, otherColor)}
      </ul>

      {restItems.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex h-7 items-center gap-1 rounded-md px-1.5 -ml-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 cursor-pointer"
          aria-expanded={expanded}
        >
          {expanded ? t("Свернуть") : t("Показать все ({1})", sorted.length)}
          <ChevronDownIcon className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default CategoryBreakdown;
