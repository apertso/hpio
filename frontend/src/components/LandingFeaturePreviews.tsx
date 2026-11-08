import { useRef, useState } from "react";
import { BellSlashIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import CategoryDistributionBars from "./CategoryDistributionBars";
import CustomDailySpendingChart from "./CustomDailySpendingChart";
import PaymentCard from "./PaymentCard";
import ToggleSwitch from "./ToggleSwitch";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useRevealOnView } from "../hooks/useRevealOnView";
import { formatDateToLocal } from "../utils/dateUtils";
import {
  getLandingMoneyFormatter,
  getLandingPreviewCurrency,
  getLandingSpendingPreview,
  getLandingUpcomingPreview,
  landingPreviewDate,
  landingSpendingColors,
} from "../utils/landingPreviewData";

const noop = (): void => {};
const previewClassName = "p-4 sm:p-6";

/** Превью напоминания: переключатель из формы платежа и карточка уведомления. */
export function LandingNotificationsPreview(): React.ReactElement {
  const { t } = useLanguage();
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const dueMessage = t("Сегодня платёж по ипотеке");
  const offMessage = t("Напоминание выключено");
  const stateClassName = "col-start-1 row-start-1 flex items-center gap-3 transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:transition-none";

  return (
    <div className={`${previewClassName} space-y-3`}>
      <div className="card-base flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-base font-semibold text-gray-900 dark:text-white">{t("Ипотека")}</p>
          <p className="text-base text-gray-700 dark:text-gray-300">
            {t("Напоминать")}
          </p>
        </div>
        <div className="shrink-0 [&>label]:min-h-[44px]">
          <ToggleSwitch
            checked={reminderEnabled}
            onChange={setReminderEnabled}
            ariaLabel={t("Напоминать")}
          />
        </div>
      </div>
      <div className="card-base grid overflow-hidden px-4 py-4">
        <div className={`${stateClassName} ${reminderEnabled ? "opacity-100" : "translate-y-2 opacity-0"}`} aria-hidden="true">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
            <EnvelopeIcon className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{t("Напоминание")}</p>
            <p className="text-pretty text-base text-gray-700 dark:text-gray-300">{dueMessage}</p>
          </div>
        </div>
        <div className={`${stateClassName} ${reminderEnabled ? "-translate-y-2 opacity-0" : "opacity-100"}`} aria-hidden="true">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">
            <BellSlashIcon className="size-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">{offMessage}</p>
            <p className="text-base text-gray-700 dark:text-gray-300">{t("Ипотека")}</p>
          </div>
        </div>
        <p role="status" className="sr-only">{reminderEnabled ? dueMessage : offMessage}</p>
      </div>
    </div>
  );
}

/** Превью ближайших платежей на существующих карточках. */
export function LandingPaymentsPreview(): React.ReactElement {
  const { t, language } = useLanguage();
  const cardsRef = useRef<HTMLDivElement>(null);
  useRevealOnView(cardsRef);

  const currency = getLandingPreviewCurrency(language);
  const { payments: upcomingPayments } = getLandingUpcomingPreview(currency);
  const payments = upcomingPayments.slice(0, 2).map(({ days, title, ...payment }) => ({
    ...payment,
    title: t(title),
    dueDate: formatDateToLocal(landingPreviewDate(days)),
    status: "upcoming" as const,
    isVirtual: true,
    seriesId: payment.id,
    series: { id: payment.id, isActive: true, recurrenceRule: "FREQ=MONTHLY" },
  }));

  return (
    <div className={previewClassName}>
      <p className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
        {t("Платежи на ближайшие 10 дней")}
      </p>
      <div ref={cardsRef} className="landing-payment-cards grid grid-cols-1 gap-3 sm:grid-cols-2">
        {payments.map((payment) => (
          <div key={payment.id} className="min-w-0">
            <PaymentCard
              payment={payment}
              currency={currency}
              onEdit={noop}
              onComplete={noop}
              onDelete={noop}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Превью аналитики: те же графики, что на главной. */
export function LandingAnalyticsPreview(): React.ReactElement {
  const { t, locale, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const categoriesRef = useRef<HTMLDivElement>(null);
  useRevealOnView(categoriesRef);

  const currency = getLandingPreviewCurrency(language);
  const { categories, amounts, dates, rawDates, total } = getLandingSpendingPreview(currency);
  const formattedTotal = getLandingMoneyFormatter(locale, currency).format(total);

  return (
    <div className={`${previewClassName} space-y-3`}>
      <div>
        <p className="text-base text-gray-700 dark:text-gray-300">{t("Расходы за 30 дней")}</p>
        <p className="text-2xl font-semibold tabular-nums text-gray-950 dark:text-white">{formattedTotal}</p>
      </div>
      <div ref={categoriesRef} className="landing-category-bars card-base p-4">
        <p className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
          {t("Распределение по категориям")}
        </p>
        <CategoryDistributionBars
          data={categories.map(({ name, amount }) => ({ name: t(name), amount }))}
          colors={landingSpendingColors[resolvedTheme]}
        />
      </div>
      <div className="card-base p-4">
        <p className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
          {t("Расходы по дням")}
        </p>
        <div className="relative h-52 [&_svg_text]:fill-gray-600 dark:[&_svg_text]:fill-gray-300">
          <CustomDailySpendingChart
            data={amounts}
            currency={currency}
            labels={dates.map((date) =>
              date.toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
              }),
            )}
            rawDates={rawDates}
            theme={resolvedTheme}
            startDate={dates[0]}
            endDate={dates[dates.length - 1]}
          />
        </div>
      </div>
    </div>
  );
}
