import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DeviceMockup } from '../components/DeviceMockup';
import { LandingHeroCreditCard } from '../components/LandingHeroCreditCard';
import { LandingHeroMockup } from '../components/LandingHeroMockup';
import { LandingTopBar } from '../components/LandingTopBar';
import PageMeta from '../components/PageMeta';
import { getPageMetadata } from '../utils/pageMetadata';

const Feature = ({
  icon: Icon,
  title,
  children,
  image,
  reverse = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  image?: { src: string; alt: string };
  reverse?: boolean;
}) => (
  <div
    className={`flex flex-col gap-12 items-center md:flex-row ${
      reverse ? 'md:flex-row-reverse' : ''
    } py-12`}
  >
    <div className="flex-1 space-y-6 text-center md:text-left">
      <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {title}
        </h3>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
          {children}
        </p>
      </div>
    </div>
    {image && (
      <div className="flex-1 w-full max-w-md">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-auto transform hover:scale-105 transition-transform duration-500"
          />
        </div>
      </div>
    )}
  </div>
);

const LandingPage: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const { resolvedTheme } = useTheme();
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

      <div className="w-full text-gray-900 dark:text-gray-100">
        <section className="landing-hero-section relative flex min-h-dvh flex-col overflow-hidden border-b border-indigo-100/50 dark:border-gray-800">
          {/* Декоративные сферы */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="landing-hero-orb landing-hero-orb-1" />
            <div className="landing-hero-orb landing-hero-orb-2" />
            <div className="landing-hero-orb landing-hero-orb-3" />
            <div className="landing-hero-orb landing-hero-orb-4" />
          </div>

          <div className="relative mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 sm:px-6 lg:px-8">
            <LandingTopBar />

            <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 items-center gap-8 py-6 sm:gap-10 sm:py-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-6 xl:gap-10">
              <div className="relative z-10 mx-auto w-full min-w-0 max-w-2xl text-center lg:mx-0 lg:max-w-[560px] lg:-translate-y-24 lg:text-left xl:max-w-[600px]">
                <h1 className="landing-hero-reveal landing-hero-delay-1 text-[3.25rem] font-extrabold leading-[1.02] tracking-tight text-gray-950 dark:text-white sm:text-[4.5rem] lg:text-[4rem] xl:text-[4.75rem]">
                  Финансы под
                  <br />
                  <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-sky-400 dark:to-violet-300">
                    полным контролем
                  </span>
                </h1>

                <p className="landing-hero-reveal landing-hero-delay-2 mx-auto mt-10 max-w-xl text-base leading-7 text-gray-500 dark:text-gray-300 sm:text-lg sm:leading-8 lg:mx-0">
                  Эстетичный трекер регулярных платежей и подписок.
                </p>
                <p className="landing-hero-reveal landing-hero-delay-2 mt-3 text-base font-bold text-gray-950 dark:text-white sm:text-lg">
                  Без рекламы. Без скрытых комиссий.
                </p>

                <div className="landing-hero-reveal landing-hero-delay-3 mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Link
                    to="/register"
                    className="group inline-flex min-h-[66px] w-full min-w-0 items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-left text-white shadow-[0_20px_44px_rgba(99,102,241,0.38)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(99,102,241,0.44)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-[272px] cursor-pointer"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                      <SparklesIcon className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-lg font-bold leading-6">
                        Начать бесплатно
                      </span>
                      <span className="block text-sm text-indigo-100">
                        Создайте аккаунт за 30 секунд
                      </span>
                    </span>
                  </Link>

                  <Link
                    to="/download"
                    className="inline-flex min-h-[66px] w-full min-w-0 items-center gap-4 rounded-2xl border border-gray-200/90 bg-white px-5 py-3.5 text-left text-gray-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:bg-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7638FA] focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/8 dark:text-white dark:hover:bg-white/12 sm:w-[212px] cursor-pointer"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
                      <ArrowDownTrayIcon className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-lg font-bold leading-6">
                        Скачать APK
                      </span>
                      <span className="block text-sm text-gray-500 dark:text-gray-400">
                        Версия 1.2.0
                      </span>
                    </span>
                  </Link>
                </div>

                <div className="landing-hero-reveal landing-hero-delay-4 mt-7 grid w-full grid-cols-1 gap-2.5 text-left text-sm sm:w-[440px] sm:grid-cols-3 sm:justify-items-center">
                  <div className="flex w-full items-center gap-2.5 rounded-2xl border border-gray-100 bg-white/80 px-3 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 sm:max-w-[200px]">
                    <GlobeAltIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Web
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Доступно в браузере
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2.5 rounded-2xl border border-gray-100 bg-white/80 px-3 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 sm:max-w-[200px]">
                    <svg
                      className="h-6 w-6 text-gray-500 dark:text-gray-400"
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
                        APK для установки
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2.5 rounded-2xl border border-gray-100 bg-white/80 px-3 py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] backdrop-blur-sm dark:border-white/10 dark:bg-white/5 sm:max-w-[200px]">
                    <svg
                      className="h-6 w-6 text-gray-500 dark:text-gray-400"
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
                        Скоро в App Store
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-hero-visual relative mx-auto w-full min-w-0 max-w-[760px] pb-12 pt-2 lg:mr-0 lg:max-w-none xl:-mr-2">
                {/* Сферы вокруг макета */}
                <div
                  className="pointer-events-none absolute inset-0 overflow-visible"
                  aria-hidden="true"
                >
                  <div className="landing-hero-orb landing-hero-orb-mockup-1" />
                  <div className="landing-hero-orb landing-hero-orb-mockup-2" />
                  <div className="landing-hero-orb landing-hero-orb-mockup-3" />
                  <div className="landing-hero-glow" />
                </div>

                <div className="landing-mockup-intro relative z-10">
                  <div className="landing-mockup-float">
                    <div className="relative hidden md:block">
                      <LandingHeroMockup />
                    </div>

                    <div className="relative md:hidden">
                      <DeviceMockup
                        type="mobile"
                        src={`/hero/mobile-${
                          resolvedTheme === 'dark' ? 'dark' : 'light'
                        }.png`}
                        alt="Интерфейс Хочу Плачу на телефоне"
                        className="w-[236px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Netflix — скоро спишется */}
                <div className="landing-floating-element landing-netflix-alert absolute -left-4 top-[30%] z-30 hidden lg:block xl:-left-8">
                  <div className="landing-netflix-alert-body">
                    <div
                      className="landing-netflix-alert-icon"
                      aria-hidden="true"
                    >
                      <BellAlertIcon className="h-[20px] w-[20px] text-white" />
                    </div>
                    <div className="landing-netflix-alert-text">
                      <p className="landing-netflix-alert-label">
                        Скоро спишется
                      </p>
                      <p className="landing-netflix-alert-name">Netflix</p>
                      <p className="landing-netflix-alert-amount">599 ₽</p>
                      <p className="landing-netflix-alert-date">
                        22 мая • через 2 дня
                      </p>
                    </div>
                  </div>
                </div>

                {/* Напоминание */}
                <div className="landing-floating-element landing-floating-delay absolute -right-3 top-[18%] z-30 hidden w-[188px] rounded-2xl border border-white/90 bg-white/97 p-3 shadow-[0_24px_56px_rgba(15,23,42,0.12)] backdrop-blur-sm dark:border-white/10 dark:bg-gray-950/97 lg:block xl:-right-7">
                  <div className="flex items-start gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                      <CalendarDaysIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-950 dark:text-white">
                        Напоминание
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-gray-500 dark:text-gray-400">
                        3 платежа на этой неделе
                      </p>
                      <button
                        type="button"
                        className="mt-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400"
                      >
                        Посмотреть
                      </button>
                    </div>
                  </div>
                </div>

                <LandingHeroCreditCard />

                {/* Защита данных */}
                <div className="landing-floating-element landing-floating-delay absolute -bottom-1 right-[2%] z-30 hidden max-w-[240px] items-center gap-2.5 rounded-2xl border border-white/90 bg-white/97 px-3.5 py-2.5 shadow-[0_24px_56px_rgba(79,70,229,0.14)] backdrop-blur-sm dark:border-white/10 dark:bg-gray-950/97 lg:flex">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
                    <ShieldCheckIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight text-gray-950 dark:text-white">
                      Ваши данные под защитой
                    </p>
                    <p className="mt-0.5 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                      Мы не передаем данные третьим лицам.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust/Privacy Section */}
        <section className="py-16 bg-gray-50 dark:bg-gray-800/50 border-y border-gray-100 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4">
                  <ShieldCheckIcon className="w-8 h-8 text-gray-900 dark:text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">Локальное хранение</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  Обработка SMS и уведомлений происходит прямо на вашем
                  устройстве.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4">
                  <DevicePhoneMobileIcon className="w-8 h-8 text-gray-900 dark:text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">Работа офлайн</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  Приложение работает без интернета. Данные синхронизируются при
                  подключении.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm mb-4">
                  <ChartBarIcon className="w-8 h-8 text-gray-900 dark:text-white" />
                </div>
                <h4 className="font-bold text-lg mb-2">Честная статистика</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  Никаких скрытых алгоритмов или продажи данных.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="space-y-24">
            <Feature
              icon={CalendarDaysIcon}
              title="Умное отслеживание"
              image={{
                src: '/landing/notifications.webp',
                alt: 'Скриншот уведомлений',
              }}
            >
              Забудьте о ручном вводе. Приложение автоматически распознает
              уведомления от банков (Сбер, Тинькофф, Райффайзен) и создает
              записи о расходах.
            </Feature>

            <Feature
              icon={ArrowPathIcon}
              title="Регулярные платежи"
              reverse
              image={{
                src: '/landing/payment-tracking.webp',
                alt: 'Скриншот списка платежей',
              }}
            >
              Гибкая настройка повторяющихся операций. Подписки, ЖКХ, кредиты —
              настройте один раз, и мы напомним вам заранее.
            </Feature>

            <Feature
              icon={ChartBarIcon}
              title="Глубокая аналитика"
              image={{
                src: '/landing/analytics.webp',
                alt: 'Скриншот аналитики',
              }}
            >
              Понимайте, куда уходят деньги. Визуализация расходов по
              категориям, дням и динамика трат за любой период.
            </Feature>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-gray-50 dark:bg-gray-800/50">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 tracking-tight">
              Начните контролировать бюджет сегодня
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10">
              Присоединяйтесь к пользователям, которые уже навели порядок в
              своих финансах.
            </p>
            <Link className="inline-block" to="/register">
              <Button
                label="Создать аккаунт"
                className="px-10 py-4 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-transform hover:scale-105"
              />
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Бесплатно. Не требует привязки карты.
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default LandingPage;
