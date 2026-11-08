import type { ReactElement } from "react";
import { CalendarDaysIcon, PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { formatDateToLocal } from "../utils/dateUtils";
import {
  getLandingMoneyFormatter,
  getLandingPreviewCurrency,
  getLandingSpendingPreview,
  getLandingUpcomingPreview,
  landingPreviewDate,
  landingSpendingColors,
} from "../utils/landingPreviewData";
import CustomDailySpendingChart from "./CustomDailySpendingChart";
import PaymentIconDisplay from "./PaymentIconDisplay";

const navItems = ["Главная", "Платежи"];

/** Сводка и графики на демонстрационных платежах. */
export function LandingHeroMockup(): ReactElement {
  const { t, locale, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const today = new Date();
  const currency = getLandingPreviewCurrency(language);
  const { payments, total: upcomingTotal } = getLandingUpcomingPreview(currency);
  const { categories, amounts, dates, rawDates, total } = getLandingSpendingPreview(currency, today);
  const colors = landingSpendingColors[resolvedTheme];
  const money = getLandingMoneyFormatter(locale, currency);
  const shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const percentage = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });
  const periodStart = dates[0];
  const periodEnd = dates[dates.length - 1];

  return (
    <div className="landing-hero-dashboard w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-xl dark:border-white/10 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 dark:border-white/10 dark:bg-gray-900">
        <span className="inline-flex min-w-0 items-center gap-2 py-4 text-base font-semibold">
          <svg viewBox="0 0 48 48" fill="currentColor" className="size-5 shrink-0" aria-hidden="true">
            <path d="M24 4H6V30.6667H24V44H42V17.3333H24V4Z" />
          </svg>
          {t("Хочу Плачу")}
        </span>
        <div className="flex shrink-0 items-stretch gap-4 text-base">
          {navItems.map((item, index) => (
            <span
              key={item}
              className={index === 0
                ? "border-b-2 border-indigo-600 py-4 font-semibold text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                : "border-b-2 border-transparent py-4 text-gray-600 dark:text-gray-300"}
            >
              {t(item)}
            </span>
          ))}
          <span className="inline-flex items-center self-center border-l border-gray-200 pl-4 dark:border-gray-700">
            <span
              className="inline-flex size-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-900 shadow-sm dark:border-white/10 dark:bg-gray-800 dark:text-white"
              aria-hidden="true"
            >
              <UserIcon className="size-5" />
            </span>
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 xl:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-xl font-semibold tracking-tight text-gray-950 dark:text-white">
            {t("Обзор финансов")}
          </p>
          <span className="primary-action pointer-events-none inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium" aria-hidden="true">
            <PlusIcon className="size-4" />
            {t("Добавить платеж")}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="card-base min-w-0 px-4 py-3">
            <dt className="text-base font-medium text-gray-700 dark:text-gray-300">{t("Предстоящие платежи")}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
              {money.format(upcomingTotal)}
            </dd>
            <dd className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {t("Платежей к оплате: {1}", payments.length)}
            </dd>
          </div>
          <div className="card-base min-w-0 px-4 py-3">
            <dt className="text-base font-medium text-gray-700 dark:text-gray-300">{t("Расходы за 30 дней")}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-gray-950 dark:text-white">
              {money.format(total)}
            </dd>
            <dd className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {t("Оплачено платежей: {1}", amounts.length)}
            </dd>
          </div>
        </dl>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="card-base flex min-w-0 flex-col p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <p className="text-lg font-semibold">{t("Ближайшие платежи")}</p>
              <span className="text-sm text-gray-600 dark:text-gray-300">{t("10 дней")}</span>
            </div>
            <ul className="mt-2 flex flex-1 flex-col divide-y divide-gray-100 dark:divide-white/10">
              {payments.map((payment) => {
                const date = landingPreviewDate(payment.days, today);
                return (
                  <li key={payment.id} className="grid flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5" aria-hidden="true">
                      <PaymentIconDisplay payment={payment} sizeClass="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-medium">{t(payment.title)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{t("Ежемесячно")}</p>
                    </div>
                    <span className="text-right">
                      <span className="block whitespace-nowrap text-base font-semibold tabular-nums">{money.format(payment.amount)}</span>
                      <time dateTime={formatDateToLocal(date)} className="block whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {shortDate.format(date)}
                      </time>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-base font-semibold dark:border-white/10">
              <span>{t("Всего к оплате")}</span>
              <span className="whitespace-nowrap tabular-nums">{money.format(upcomingTotal)}</span>
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            <div className="card-base min-w-0 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-semibold">{t("Расходы по дням")}</p>
                <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-700 dark:border-white/10 dark:text-gray-300">
                  <CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
                  {shortDate.format(periodStart)} – {shortDate.format(periodEnd)}
                </span>
              </div>
              <div className="pointer-events-none relative mt-2 h-44 [&_svg_text]:fill-gray-600 dark:[&_svg_text]:fill-gray-300">
                <CustomDailySpendingChart
                  animateOnView
                  data={amounts}
                  currency={currency}
                  labels={dates.map((date) => shortDate.format(date))}
                  rawDates={rawDates}
                  theme={resolvedTheme}
                  startDate={periodStart}
                  endDate={periodEnd}
                />
              </div>
            </div>

            <div className="card-base min-w-0 p-4">
              <p className="text-lg font-semibold">{t("Расходы по категориям")}</p>
              <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                {categories.map(({ name, amount }, index) => (
                  <span key={name} style={{ flexGrow: amount, backgroundColor: colors[index] }} />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                {categories.map(({ name, amount }, index) => (
                  <li key={name} className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} aria-hidden="true" />
                      <span>{t(name)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm tabular-nums">
                      <span className="whitespace-nowrap font-semibold">{money.format(amount)}</span>
                      <span className="whitespace-nowrap text-gray-600 dark:text-gray-300">{percentage.format(amount / total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
