import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { DeviceMockup } from "../components/DeviceMockup";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

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
      reverse ? "md:flex-row-reverse" : ""
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
  const metadata = getPageMetadata("landing");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  return (
    <>
      <PageMeta {...metadata} />

      <div className="w-full text-gray-900 dark:text-gray-100">
        {/* Hero Section - Clean & Minimalist */}
        <section className="relative pt-12 pb-20 md:pt-24 md:pb-32 overflow-hidden bg-[radial-gradient(80vw_50vh_at_50%_-10vh,rgba(79,70,255,0.22),transparent_65%),radial-gradient(60vw_40vh_at_10%_40%,rgba(124,58,237,0.16),transparent_65%),radial-gradient(60vw_40vh_at_90%_30%,rgba(79,70,255,0.14),transparent_65%),linear-gradient(180deg,#eef0ff_0%,#fafbff_60%)] dark:bg-[radial-gradient(80vw_50vh_at_50%_-10vh,rgba(79,70,255,0.35),transparent_65%),radial-gradient(60vw_40vh_at_10%_40%,rgba(124,58,237,0.25),transparent_65%),radial-gradient(60vw_40vh_at_90%_30%,rgba(79,70,255,0.25),transparent_65%),linear-gradient(180deg,#050816_0%,#0b0f1a_60%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              {/* Text Content */}
              <div className="text-center lg:text-left">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8 leading-tight">
                  Финансы под <br />
                  <span className="text-indigo-600 dark:text-indigo-500">
                    полным контролем
                  </span>
                </h1>

                <p className="max-w-2xl mx-auto lg:mx-0 text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed font-light">
                  Эстетичный трекер регулярных платежей и подписок.
                  <br className="hidden md:block" />
                  <span className="font-medium text-gray-900 dark:text-gray-200">
                    &nbsp;Без рекламы. Без скрытых комиссий.
                  </span>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center mb-12">
                  <Link to="/register" className="w-full sm:w-auto">
                    <Button
                      label="Начать бесплатно"
                      className="w-full sm:w-auto px-8 py-4 text-lg font-bold bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 shadow-lg transition-transform hover:-translate-y-0.5"
                    />
                  </Link>
                  <Link to="/download" className="w-full sm:w-auto">
                    <Button
                      label="Скачать APK"
                      variant="secondary"
                      icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
                      className="w-full sm:w-auto px-8 py-4 text-lg font-bold bg-transparent border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    />
                  </Link>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-sm font-medium animate-fade-in-up">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <GlobeAltIcon className="w-5 h-5" />
                    <span>Web</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <DevicePhoneMobileIcon className="w-5 h-5" />
                    <span>Android</span>
                  </div>
                  <div
                    className="flex items-center gap-2 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    title="В разработке"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    <span>iOS</span>
                  </div>
                </div>
              </div>

              {/* App Interface Mockups */}
              <div className="relative flex justify-center items-center mt-12 lg:mt-0">
                {/* Desktop Mockup (Visible on Large Screens) */}
                <div className="hidden lg:block transform transition-transform hover:scale-[1.02] duration-500 relative z-10 w-full">
                  <DeviceMockup
                    type="desktop"
                    src={`/hero/desktop-${
                      resolvedTheme === "dark" ? "dark" : "light"
                    }.png`}
                    alt="Desktop App Interface"
                    className="w-full max-w-[800px] ml-auto"
                  />
                </div>

                {/* Mobile Mockup (Visible on Small/Medium Screens) */}
                <div className="block lg:hidden relative z-10 transform transition-transform hover:scale-[1.01] duration-500">
                  <DeviceMockup
                    type="mobile"
                    src={`/hero/mobile-${
                      resolvedTheme === "dark" ? "dark" : "light"
                    }.png`}
                    alt="Mobile App Interface"
                  />
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
                src: "/landing/notifications.webp",
                alt: "Скриншот уведомлений",
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
                src: "/landing/payment-tracking.webp",
                alt: "Скриншот списка платежей",
              }}
            >
              Гибкая настройка повторяющихся операций. Подписки, ЖКХ, кредиты —
              настройте один раз, и мы напомним вам заранее.
            </Feature>

            <Feature
              icon={ChartBarIcon}
              title="Глубокая аналитика"
              image={{
                src: "/landing/analytics.webp",
                alt: "Скриншот аналитики",
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
