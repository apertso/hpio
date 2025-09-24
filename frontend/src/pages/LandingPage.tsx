import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  TagIcon,
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
  image?: {
    src: string;
    alt: string;
  };
  reverse?: boolean;
}) => (
  <div
    className={`grid gap-8 items-center p-6 bg-gray-50 dark:bg-gray-900/40 rounded-xl shadow-sm md:grid-cols-2`}
  >
    <div
      className={`flex flex-col p-4 ${
        reverse ? "md:order-2 md:text-left" : "md:order-1 md:text-left"
      } text-center md:text-left`}
    >
      <div className="inline-flex self-center p-3 mb-4 text-white bg-indigo-500 rounded-full">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="mb-3 text-2xl font-bold tracking-tight text-center">
        {title}
      </h3>
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
        {children}
      </p>
    </div>
    {image && (
      <div className={`${reverse ? "md:order-1" : "md:order-2"} w-full`}>
        <div className="w-full max-w-2xl mx-auto">
          <img
            src={image.src}
            alt={image.alt}
            className="w-full h-auto rounded-xl border border-gray-200 dark:border-gray-700"
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

      <div className="w-full max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            Управляйте своими финансами.{" "}
            <span className="text-indigo-500">Легко.</span>
          </h1>
          <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-600 dark:text-gray-300">
            Забудьте о просрочках, отслеживайте регулярные платежи и держите
            бюджет под контролем. Бесплатно.
          </p>
          <div className="inline-block px-4 py-2 mt-6 font-semibold text-green-800 bg-green-100 border border-green-200 rounded-full dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
            🚀 Мы растём и развиваемся - сейчас сервис в бета-тестировании, и
            нам важна ваша обратная связь.
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register">
              <Button
                label="Присоединиться к тесту"
                className="px-8 py-3 text-lg font-bold animate-subtle-pulse"
              />
            </Link>
            <Link to="/download">
              <Button
                label="Скачать для Android"
                icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
                className="px-8 py-3 text-lg font-bold bg-slate-600 text-white hover:bg-slate-700"
              />
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Возможности сервиса</h2>
            <p className="max-w-2xl mx-auto mt-4 text-gray-600 dark:text-gray-400">
              Всё необходимое для эффективного управления финансами в одном
              приложении.
            </p>
          </div>

          <div className="space-y-16">
            {/* Feature 1 */}
            <Feature
              icon={CalendarDaysIcon}
              title="Умное отслеживание"
              image={{
                src: "/landing/notifications.webp",
                alt: "Умное отслеживание - демонстрация",
              }}
            >
              Все ваши счета и подписки в одном месте. Получайте напоминания и
              избегайте просрочек.
            </Feature>

            {/* Feature 2 */}
            <Feature
              icon={ArrowPathIcon}
              title="Регулярные платежи"
              image={{
                src: "/landing/payment-tracking.webp",
                alt: "Регулярные платежи - демонстрация",
              }}
              reverse
            >
              Настройте повторяющиеся платежи один раз, и система автоматически
              создаст их в нужный день.
            </Feature>

            {/* Feature 3 */}
            <Feature
              icon={ChartPieIcon}
              title="Аналитика и статистика"
              image={{
                src: "/landing/analytics.webp",
                alt: "Аналитика и статистика - демонстрация",
              }}
            >
              Наглядные графики покажут, куда уходят ваши деньги. Анализируйте
              расходы по категориям и дням.
            </Feature>

            {/* Feature 4 */}
            <Feature
              icon={TagIcon}
              title="Категории и файлы"
              image={{
                src: "/landing/files.webp",
                alt: "Категории и файлы - демонстрация",
              }}
              reverse
            >
              Организуйте платежи по категориям и прикрепляйте к ним квитанции
              или чеки для удобства.
            </Feature>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-12 text-center">
          <h2 className="text-3xl font-bold">
            Готовы навести порядок в финансах?
          </h2>
          <p className="max-w-xl mx-auto mt-4 text-gray-600 dark:text-gray-400">
            Присоединяйтесь к нашему бета-тесту прямо сейчас и начните управлять
            своими финансами.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register">
              <Button
                label="Присоединиться"
                className="px-8 py-3 text-lg font-bold"
              />
            </Link>
            <Link to="/download">
              <Button
                label="Скачать для Android"
                icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
                className="px-8 py-3 text-lg font-bold bg-slate-600 text-white hover:bg-slate-700"
              />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
};

export default LandingPage;
