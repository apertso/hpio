import { useLanguage } from "../context/LanguageContext";
import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import {
  LandingAnalyticsPreview,
  LandingNotificationsPreview,
  LandingPaymentsPreview,
} from '../components/LandingFeaturePreviews';
import { LandingHeroMockup } from '../components/LandingHeroMockup';
import { LandingMobileMockup } from '../components/LandingMobileMockup';
import { LandingTopBar } from '../components/LandingTopBar';
import PageMeta from '../components/PageMeta';
import { getPageMetadata } from '../utils/pageMetadata';
import { localizeHref } from '../i18n/localePath';

const actionClassName = 'primary-action inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-4 py-2 text-lg font-semibold transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:not-disabled:translate-y-0 focus-visible:ring-offset-gray-50 motion-reduce:transition-none sm:w-auto dark:focus-visible:ring-offset-gray-900';
const signupActionClassName = 'border-indigo-200 dark:border-indigo-400/40';
const sectionContentClassName = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';
const platformCardClassName = 'flex w-full min-w-0 flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-white/80 px-1 py-2 text-center dark:border-white/10 dark:bg-white/5 sm:max-w-[200px] sm:flex-row sm:gap-2.5 sm:px-3 sm:py-2.5 sm:text-left sm:shadow-[0_4px_16px_rgba(15,23,42,0.04)] sm:backdrop-blur-sm';
const platformIconClassName = 'size-4 shrink-0 text-gray-500 dark:text-gray-400 sm:size-6';
const featureIconClassName = 'inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300';

const trustItems = [
  {
    icon: ShieldCheckIcon,
    title: 'Локальное хранение',
    description: 'Обработка SMS и уведомлений происходит прямо на вашем устройстве.',
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Работа офлайн',
    description: 'Приложение работает без интернета. Данные синхронизируются при подключении.',
  },
  {
    icon: ChartBarIcon,
    title: 'Честная статистика',
    description: 'Никаких скрытых алгоритмов или продажи данных.',
  },
];

function Feature({
  icon: Icon,
  title,
  children,
  preview,
  reverse = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  preview: React.ReactNode;
  reverse?: boolean;
}): React.ReactElement {
  return (
    <article className={`grid min-w-0 items-center gap-6 py-8 lg:gap-12 lg:py-12 ${reverse
      ? 'lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]'
      : 'lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'}`}>
      <div className={`lg:max-w-lg ${reverse ? 'lg:col-start-2 lg:row-start-1' : ''}`}>
        <span className={featureIconClassName} aria-hidden="true">
          <Icon className="size-6" />
        </span>
        <h3 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-gray-950 dark:text-white lg:text-4xl">
          {title}
        </h3>
        <p className="mt-3 text-pretty text-lg text-gray-700 dark:text-gray-300 lg:text-xl">
          {children}
        </p>
      </div>
      <figure className={`w-full min-w-0 rounded-2xl border border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1f1f1f] ${reverse ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
        {preview}
      </figure>
    </article>
  );
}

const LandingPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const metadata = getPageMetadata('landing');

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return (
    <>
      <PageMeta {...metadata} />

      <div className="w-full font-[Manrope,system-ui,sans-serif] text-gray-900 dark:text-gray-100">
        <section className="relative flex min-h-dvh flex-col overflow-hidden border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-dark-bg">
          <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 sm:px-6 lg:px-8">
            <LandingTopBar />

            <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 items-center gap-6 py-6 sm:gap-10 sm:py-8 min-[60rem]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] min-[60rem]:gap-6 xl:gap-10">
              <div className="relative z-10 mx-auto w-full min-w-0 max-w-2xl text-center min-[60rem]:mx-0 min-[60rem]:max-w-[560px] min-[60rem]:-translate-y-8 min-[60rem]:text-left xl:max-w-[600px]">
                <h1 className="text-balance text-4xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-5xl lg:text-6xl">
                  {t("Финансы под")}
                  <br />
                  <span className="text-indigo-700 dark:text-indigo-300">
                    {t("полным контролем")}
                  </span>
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-gray-700 dark:text-gray-300 sm:text-lg min-[60rem]:mx-0">
                  {t("Следите за подписками и регулярными платежами в одном списке.")}
                </p>
                <p className="mt-3 text-base font-semibold text-gray-800 dark:text-gray-200 sm:text-lg">
                  {t("Без рекламы. Без скрытых комиссий.")}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center min-[60rem]:justify-start">
                  <Link
                    to="/register"
                    className={`${actionClassName} ${signupActionClassName}`}
                  >
                    {t("Начать бесплатно")}
                    <ArrowRightIcon className="size-5 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
                  </Link>

                  <Link
                    to={localizeHref(language, "/download")}
                    className={`${actionClassName} text-gray-700 shadow-none dark:text-gray-200`}
                  >
                    {t("Скачать APK")}
                    <ArrowDownTrayIcon className="size-5 shrink-0" aria-hidden="true" />
                  </Link>
                </div>

                <div className="mx-auto mt-6 grid w-full grid-cols-3 gap-2 text-sm sm:max-w-[440px] sm:justify-items-center sm:gap-2.5 min-[60rem]:mx-0">
                  <div className={platformCardClassName}>
                    <GlobeAltIcon className={platformIconClassName} aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Web
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("Доступно в браузере")}
                      </p>
                    </div>
                  </div>
                  <div className={platformCardClassName}>
                    <svg
                      className={platformIconClassName}
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.6 9.48l1.84-3.18c.08-.14.03-.33-.12-.41-.14-.08-.33-.03-.41.12l-1.87 3.23c-1.46-.66-3.13-1.04-4.9-1.04s-3.44.38-4.9 1.04l-1.87-3.23c-.08-.14-.27-.19-.41-.12-.14.08-.19.27-.12.41l1.84 3.18C3.76 11.08 1.42 14.15 1 18h22c-.42-3.85-2.76-6.92-5.4-8.52zM7.25 15.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm9.5 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Android
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("APK для установки")}
                      </p>
                    </div>
                  </div>
                  <div className={platformCardClassName}>
                    <svg
                      className={platformIconClassName}
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M15.2 5.3c-.6 1.4-2.1 2.3-3.6 2.1.2-1.6 1.1-3.1 2.5-4 1.1-.7 2.4-.9 3.6-.6-.2 1.1-.7 2-1.5 2.5zm1.5 3.3c-1.3-.1-2.7.7-3.4.7-.8 0-2-.7-3.1-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1 8.5.7 1 1.5 2.2 2.6 2.1 1.1-.1 1.5-.7 2.8-.7s1.5.7 2.8.7c1.1.1 1.8-1 2.5-2.1 1-1.3 1.4-2.6 1.4-2.6-.1 0-2.4-1-2.4-3.6 0-2.1 1.8-3.1 1.8-3.2-1.1-1.4-2.7-1.5-3.1-1.6h.6z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        iOS
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("Скоро в App Store")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mx-auto w-full min-w-0 max-w-[760px] pb-8 pt-2 sm:pb-12 min-[60rem]:mr-0 min-[60rem]:max-w-none xl:-mr-2">
                <div className="hidden md:block">
                  <LandingHeroMockup />
                </div>

                <div className="md:hidden">
                  <LandingMobileMockup />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label={t("Приватность и доступность")}
          className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1f1f1f]"
        >
          <ul className={`${sectionContentClassName} grid gap-6 py-8 sm:py-12 md:grid-cols-3 lg:gap-8`}>
            {trustItems.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className={featureIconClassName} aria-hidden="true">
                  <Icon className="size-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{t(title)}</h2>
                  <p className="mt-1 text-pretty text-base text-gray-700 dark:text-gray-300">
                    {t(description)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="features"
          aria-labelledby="landing-feature-title"
          className="bg-white dark:bg-[#181818]"
        >
          <div className="mx-auto w-full max-w-[520px] px-4 pt-12 sm:px-6 lg:max-w-7xl lg:px-8 lg:pt-20">
            <h2 id="landing-feature-title" className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-gray-950 dark:text-white lg:text-5xl">
              {t("Планируйте платежи и следите за расходами")}
            </h2>
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              <Feature
                icon={CalendarDaysIcon}
                title={t("Напоминания и учёт платежей")}
                preview={<LandingNotificationsPreview />}
              >
                {t("Получайте напоминания в день оплаты. На Android приложение может распознать уведомление банка и предложить добавить расход.")}
              </Feature>

              <Feature
                icon={ArrowPathIcon}
                title={t("Регулярные платежи")}
                preview={<LandingPaymentsPreview />}
                reverse
              >
                {t("Укажите сумму и периодичность для подписок, счетов и кредитов. Отметьте платёж выполненным, и приложение запланирует следующий.")}
              </Feature>

              <Feature
                icon={ChartBarIcon}
                title={t("Расходы по категориям и дням")}
                preview={<LandingAnalyticsPreview />}
              >
                {t("Смотрите, сколько потратили за выбранный период, какие категории заняли больше всего и на какие дни пришлись крупные платежи.")}
              </Feature>
            </div>
          </div>
        </section>

        <section aria-labelledby="landing-signup-title" className="bg-white pb-12 pt-4 dark:bg-[#181818] lg:pb-20 lg:pt-8">
          <div className={sectionContentClassName}>
            <div className="flex flex-col gap-6 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-8 dark:border-white/10 dark:bg-[#1f1f1f] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-8 sm:py-12">
              <div>
                <h2 id="landing-signup-title" className="text-balance text-3xl font-semibold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                  {t("Добавьте первый платёж")}
                </h2>
                <p className="mt-2 text-pretty text-lg text-gray-700 dark:text-gray-300">
                  {t("Бесплатно. Не требует привязки карты.")}
                </p>
              </div>
              <Link
                className={`${actionClassName} ${signupActionClassName}`}
                to="/register"
              >
                {t("Создать аккаунт")}
                <ArrowRightIcon className="size-5 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default LandingPage;
