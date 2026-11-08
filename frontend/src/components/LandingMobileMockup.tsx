import type { ReactElement } from "react";
import { Bars3Icon, PlusIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { formatDateToLocal } from "../utils/dateUtils";
import {
  getLandingMoneyFormatter,
  getLandingPreviewCurrency,
  getLandingSpendingPreview,
  getLandingUpcomingPreview,
  landingPreviewDate,
} from "../utils/landingPreviewData";
import CustomDailySpendingChart from "./CustomDailySpendingChart";
import PaymentIconDisplay from "./PaymentIconDisplay";

/** Мобильный экран с теми же демонстрационными платежами, что и на компьютере. */
export function LandingMobileMockup(): ReactElement {
  const { t, locale, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const today = new Date();
  const currency = getLandingPreviewCurrency(language);
  const { payments, total: upcomingTotal } = getLandingUpcomingPreview(currency);
  const { amounts, dates, rawDates, total } = getLandingSpendingPreview(currency, today);
  const money = getLandingMoneyFormatter(locale, currency);
  const shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  return (
    <div
      role="group"
      aria-label={t("Интерфейс Хочу Плачу на телефоне")}
      className="landing-hero-phone relative mx-auto aspect-[10/21] w-full max-w-[288px] rounded-4xl bg-gray-950 shadow-lg ring-1 ring-gray-950/10 dark:ring-white/10"
    >
      <div className="absolute inset-2 flex flex-col overflow-hidden rounded-3xl bg-gray-50 dark:bg-gray-900">
        <div className="shrink-0 border-b border-gray-200 bg-white px-3 pb-2 pt-2 dark:border-white/10 dark:bg-gray-900">
          <div className="mx-auto size-2 rounded-full bg-gray-950 ring-1 ring-gray-300 dark:ring-gray-700" aria-hidden="true" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Bars3Icon className="size-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            <p className="text-base font-semibold">{t("Главная")}</p>
            <PlusIcon className="size-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-clip p-3">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-base font-semibold">{t("Ближайшие платежи")}</p>
              <span className="shrink-0 text-xs text-gray-600 dark:text-gray-300">{t("10 дней")}</span>
            </div>
            <ul className="mt-2 grid gap-2">
              {payments.map((payment) => {
                const dueDate = landingPreviewDate(payment.days, today);

                return (
                  <li key={payment.id} className="card-base grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-white/5" aria-hidden="true">
                      <PaymentIconDisplay payment={payment} sizeClass="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-base font-medium leading-tight">{t(payment.title)}</p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{t("Ежемесячно")}</p>
                    </div>
                    <div className="text-right">
                      <p className="whitespace-nowrap text-base font-semibold tabular-nums">{money.format(payment.amount)}</p>
                      <time dateTime={formatDateToLocal(dueDate)} className="block whitespace-nowrap text-xs text-gray-600 dark:text-gray-300">
                        {shortDate.format(dueDate)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <p className="text-base font-semibold">{t("Статистика")}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2">
              <div className="card-base flex min-w-0 flex-col justify-between p-3">
                <dt className="text-xs text-gray-700 dark:text-gray-300">{t("Всего к оплате")}</dt>
                <dd className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
                  {money.format(upcomingTotal)}
                </dd>
              </div>
              <div className="card-base flex min-w-0 flex-col justify-between p-3">
                <dt className="text-xs text-gray-700 dark:text-gray-300">{t("Расходы за 30 дней")}</dt>
                <dd className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums">
                  {money.format(total)}
                </dd>
              </div>
            </dl>
            <div className="card-base mt-2 p-3">
              <p className="text-base font-medium">{t("Расходы по дням")}</p>
              <div className="pointer-events-none relative mt-2 h-40 [&_svg_text]:fill-gray-600 dark:[&_svg_text]:fill-gray-300">
                <CustomDailySpendingChart
                  data={amounts}
                  currency={currency}
                  labels={dates.map((date) => shortDate.format(date))}
                  rawDates={rawDates}
                  theme={resolvedTheme}
                  startDate={dates[0]}
                  endDate={dates[dates.length - 1]}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white py-2 dark:border-white/10 dark:bg-gray-900" aria-hidden="true">
          <div className="mx-auto h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>
      </div>
    </div>
  );
}
