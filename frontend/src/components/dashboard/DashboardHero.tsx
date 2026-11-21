// src/components/dashboard/DashboardHero.tsx
import React, { useMemo } from "react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useLanguage } from "../../context/LanguageContext";
import { PaymentData } from "../../types/paymentData";
import { parseCalendarDate } from "../../utils/dateUtils";
import { formatCurrencyTotals, groupCurrencyTotals } from "../../utils/currencies";
import { PaymentStatusIcon } from "../PaymentRowList";
import Money from "./Money";
import {
  PrimaryActionButton,
  type PagePrimaryAction,
} from "../layout/AppHeader";

interface DashboardHeroProps {
  /** Ближайшие и просроченные платежи */
  upcoming: PaymentData[];
  /** Подпись окна ближайших платежей, например «10 дней» */
  windowLabel: string;
  currency: string;
  /** Активный фильтр списка: "overdue" или дата YYYY-MM-DD */
  activeFilter: string | null;
  onFilter: (filter: string | null) => void;
  onOpenPayment: (id: string) => void;
  /** Данные ещё не пришли: показываем заглушку того же размера вместо «0 ₽» */
  isLoading?: boolean;
  /** Основное действие (добавить платёж) — на десктопе стоит справа, вровень с суммой */
  action?: PagePrimaryAction;
  /**
   * На мобильных кнопка меню плавает слева сверху: подпись «К оплате» встаёт
   * на одну строку с ней, а сумма идёт ниже от обычного края
   */
  wrapMenuButton?: boolean;
}

const DAY_MS = 86400000;
const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const pad = (n: number): string => String(n).padStart(2, "0");
const toKey = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Верх главной страницы: сколько нужно заплатить и что срочно.
 */
const DashboardHero: React.FC<DashboardHeroProps> = ({
  upcoming,
  windowLabel,
  currency,
  activeFilter,
  onFilter,
  onOpenPayment,
  isLoading = false,
  action,
  wrapMenuButton = false,
}) => {
  const { t, locale } = useLanguage();
  const now = new Date();
  const today = startOfDay(now);

  const relative = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale]);

  const active = upcoming.filter((p) => p.status === "upcoming" || p.status === "overdue");
  const dueIn = (p: PaymentData): number =>
    Math.round((startOfDay(parseCalendarDate(p.dueDate)) - today) / DAY_MS);
  const overdue = active.filter((p) => p.status === "overdue" || dueIn(p) < 0);
  const dueToday = active.filter((p) => p.status !== "overdue" && dueIn(p) === 0);
  const next = active
    .filter((p) => p.status !== "overdue" && dueIn(p) > 0)
    .sort((a, b) => parseCalendarDate(a.dueDate).getTime() - parseCalendarDate(b.dueDate).getTime())[0];
  const todayKey = toKey(now);
  const totals = groupCurrencyTotals(active);

  const pillBase =
    "inline-flex min-h-7 max-w-full flex-wrap items-center gap-1.5 py-1 rounded-md border px-2.5 text-xs transition-colors cursor-pointer";
  const pillState = (key: string): string =>
    activeFilter === key
      ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
      : "border-[var(--ui-border)] bg-[var(--ui-surface)] text-gray-700 hover:border-[var(--ui-border-strong)] dark:text-gray-300";

  // Весь блок обтекает кнопку меню: сдвинут вправо на ширину кнопки с зазором,
  // а подпись стоит на одной высоте с кнопкой (size-9 в полосе h-14)
  const sectionInset = wrapMenuButton ? "pl-10 md:pl-0" : "";
  const labelClass = `text-xs font-medium text-gray-500 dark:text-gray-400 ${
    wrapMenuButton ? "-mt-1.5 flex min-h-9 items-center md:mt-0 md:block md:min-h-0" : ""
  }`;
  const amountRowGap = "mt-1";
  const topRowClass = "flex items-end justify-between gap-4";

  // Кнопка только для десктопа: на мобильных её роль выполняет плавающая кнопка
  const actionButton = action ? (
    <PrimaryActionButton
      action={action}
      size="md"
      className="mb-1 hidden md:inline-flex"
    />
  ) : null;

  if (isLoading) {
    return (
      <section aria-busy="true" className={`ui-skeleton-delayed ${sectionInset}`}>
        <div className={topRowClass}>
          <div>
            <p className={labelClass}>
              {t("К оплате")} · {windowLabel}
            </p>
            <div className={`${amountRowGap} flex h-[2.6rem] items-center`}>
              <div className="h-9 w-56 rounded-md bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
            </div>
          </div>
          {actionButton}
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-7 w-44 rounded-md bg-gray-100 animate-pulse dark:bg-white/[0.06]" />
          <div className="h-7 w-36 rounded-md bg-gray-100 animate-pulse dark:bg-white/[0.04]" />
        </div>
      </section>
    );
  }

  return (
    <section className={`ui-fade-in ${sectionInset}`}>
      {/* Сумма к оплате и срочные платежи */}
      <div className="min-w-0">
        <div className={topRowClass}>
        <div className="min-w-0">
        <p className={labelClass}>
          {t("К оплате")} · {windowLabel}
        </p>
        <div className={`${amountRowGap} flex flex-wrap items-baseline gap-x-3 gap-y-2`}>
          {(totals.length ? totals : [{ amount: 0, currency }]).map((total, index) => (
            <React.Fragment key={total.currency}>
              {index > 0 && <span className="text-xl text-gray-400">+</span>}
              <Money
                amount={total.amount}
                currency={total.currency}
                className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-gray-50"
                minorClassName="text-lg font-medium text-gray-400 dark:text-gray-500"
              />
            </React.Fragment>
          ))}
        </div>
        </div>
        {actionButton}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {overdue.length > 0 && (
            <button type="button" onClick={() => onFilter(activeFilter === "overdue" ? null : "overdue")} className={`${pillBase} ${pillState("overdue")}`}>
              <PaymentStatusIcon payment={{ status: "overdue" } as PaymentData} />
              <span className="font-medium">{t("Просрочено")}</span>
              <span className="tabular-nums opacity-70">
                {overdue.length} · {formatCurrencyTotals(overdue, locale)}
              </span>
            </button>
          )}
          {dueToday.length > 0 && (
            <button type="button" onClick={() => onFilter(activeFilter === todayKey ? null : todayKey)} className={`${pillBase} ${pillState(todayKey)}`}>
              <PaymentStatusIcon payment={{ status: "upcoming" } as PaymentData} isToday />
              <span className="font-medium">{t("Сегодня")}</span>
              <span className="tabular-nums opacity-70">
                {dueToday.length} · {formatCurrencyTotals(dueToday, locale)}
              </span>
            </button>
          )}
          {next && (
            <button
              type="button"
              onClick={() => onOpenPayment(next.id)}
              className={`${pillBase} border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100`}
            >
              <span>{t("Далее")}:</span>
              <span className="max-w-[22rem] truncate font-medium text-gray-800 dark:text-gray-200" title={next.title}>{next.title}</span>
              <span>· {relative.format(dueIn(next), "day")}</span>
            </button>
          )}
          {active.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircleIcon className="size-4 text-green-600 dark:text-green-400" />
              {t("Всё оплачено — можно выдохнуть")}
            </span>
          )}
        </div>
      </div>

    </section>
  );
};

export default DashboardHero;
