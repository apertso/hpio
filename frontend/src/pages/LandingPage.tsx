import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../components/Button";

const Feature = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col items-center p-6 text-center bg-gray-100 dark:bg-gray-800 rounded-xl shadow-sm transition-transform hover:scale-105 duration-300">
    <div className="p-3 mb-4 text-white bg-indigo-500 rounded-full">
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="mb-2 text-xl font-bold">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{children}</p>
  </div>
);

const LandingPage: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto text-gray-900 dark:text-gray-100">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
          Управляйте своими финансами.{" "}
          <span className="text-indigo-500">Легко.</span>
        </h1>
        <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-600 dark:text-gray-300">
          «Хочу Плачу» — это умный помощник для отслеживания регулярных и
          разовых платежей. Забудьте о просрочках и возьмите бюджет под
          контроль.
        </p>
        <div className="inline-block px-4 py-2 mt-6 font-semibold text-green-800 bg-green-100 border border-green-200 rounded-full dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
          🎉 Сервис на стадии бета-тестирования и полностью бесплатен!
        </div>
        <div className="mt-8 flex justify-center">
          <Link to="/register">
            <Button
              label="Начать бесплатно"
              className="px-8 py-3 text-lg font-bold animate-pulse"
            />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Feature icon={CalendarDaysIcon} title="Умное отслеживание">
            Все ваши счета и подписки в одном месте. Получайте напоминания и
            избегайте просрочек.
          </Feature>
          <Feature icon={ArrowPathIcon} title="Регулярные платежи">
            Настройте повторяющиеся платежи один раз, и система автоматически
            создаст их в нужный день.
          </Feature>
          <Feature icon={ChartPieIcon} title="Аналитика и статистика">
            Наглядные графики покажут, куда уходят ваши деньги. Анализируйте
            расходы по категориям и дням.
          </Feature>
          <Feature icon={TagIcon} title="Категории и файлы">
            Организуйте платежи по категориям и прикрепляйте к ним квитанции или
            чеки для удобства.
          </Feature>
        </div>
      </section>

      {/* Visuals Section */}
      <section id="visuals" className="py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Взгляните, как это работает</h2>
          <p className="max-w-2xl mx-auto mt-4 text-gray-600 dark:text-gray-400">
            Интуитивно понятный интерфейс, доступный на любом устройстве.
            Светлая и темная темы для вашего комфорта.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-12 mt-12 lg:flex-row">
          {/* Screenshot Image */}
          <div className="w-full max-w-5xl p-4 transition-all duration-300 bg-gray-200 dark:bg-gray-800 rounded-2xl shadow-2xl hover:shadow-indigo-500/20">
            <img
              src="/screenshot.png"
              alt="Скриншот дашборда приложения Хочу Плачу"
              className="w-full h-[36rem] bg-dark-bg object-contain rounded-xl border-4 border-gray-300 dark:border-gray-700 shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 text-center bg-gray-100 dark:bg-gray-800 rounded-xl">
        <h2 className="text-3xl font-bold">
          Готовы навести порядок в финансах?
        </h2>
        <p className="max-w-xl mx-auto mt-4 text-gray-600 dark:text-gray-400">
          Присоединяйтесь к нашему бета-тесту сегодня. Это быстро, легко и
          удобно.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/register">
            <Button
              label="Присоединиться"
              className="px-8 py-3 text-lg font-bold"
            />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
