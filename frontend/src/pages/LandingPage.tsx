import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
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
        {/* Premium Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 -z-10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-20 right-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm mb-8 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Доступна версия 0.6.0
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-8 leading-tight">
              Финансы под <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                полным контролем
              </span>
            </h1>

            <p className="max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
              Эстетичный трекер регулярных платежей и подписок.
              <span className="font-semibold text-gray-900 dark:text-white">
                {" "}
                Без рекламы. Без передачи данных.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  label="Начать бесплатно"
                  className="w-full sm:w-auto px-8 py-4 text-lg font-bold shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all"
                />
              </Link>
              <Link to="/download" className="w-full sm:w-auto">
                <Button
                  label="Скачать APK"
                  variant="secondary"
                  icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
                  className="w-full sm:w-auto px-8 py-4 text-lg font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
              </Link>
            </div>
          </div>
        </section>

        {/* Trust/Privacy Section */}
        <section className="py-12 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <ShieldCheckIcon className="w-10 h-10 text-green-600 dark:text-green-500 mb-3" />
                <h4 className="font-bold text-lg">Локальное хранение</h4>
                <p className="text-gray-500 text-sm">
                  Парсинг SMS и пушей происходит на устройстве.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <DevicePhoneMobileIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-500 mb-3" />
                <h4 className="font-bold text-lg">Offline First</h4>
                <p className="text-gray-500 text-sm">
                  Работает без интернета. Синхронизация при подключении.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <ChartBarIcon className="w-10 h-10 text-purple-600 dark:text-purple-500 mb-3" />
                <h4 className="font-bold text-lg">Честная статистика</h4>
                <p className="text-gray-500 text-sm">
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
