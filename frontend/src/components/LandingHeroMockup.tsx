import React from 'react';
import {
  BellIcon,
  ChevronDownIcon,
  PlusIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const UPCOMING_PAYMENTS = [
  {
    name: 'Netflix',
    category: 'Подписка • Развлечения',
    date: '22 мая',
    amount: '599 ₽',
    icon: (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-black text-red-600">
        N
      </span>
    ),
  },
  {
    name: 'Яндекс Плюс',
    category: 'Подписка • Сервисы',
    date: '25 мая',
    amount: '299 ₽',
    icon: (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-purple-500 to-yellow-500 text-xs font-black text-white">
        Я
      </span>
    ),
  },
  {
    name: 'Мобильная связь',
    category: 'Связь • Основной',
    date: '28 мая',
    amount: '450 ₽',
    icon: (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500">
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
      </span>
    ),
  },
  {
    name: 'Spotify',
    category: 'Подписка • Музыка',
    date: '1 июня',
    amount: '169 ₽',
    icon: (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 14.36c-.2.32-.62.42-.94.22-2.58-1.58-5.84-1.94-9.68-1.06-.37.08-.74-.15-.82-.52-.08-.37.15-.74.52-.82 4.18-.95 7.82-.55 10.7 1.2.32.2.42.62.22.98zm1.24-2.76c-.25.4-.78.53-1.18.28-2.95-1.81-7.45-2.34-10.94-1.28-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 3.98-1.21 8.96-.62 12.36 1.44.4.25.53.78.26 1.2zm.1-2.88C14.98 8.5 9.48 8.3 5.82 9.4c-.54.16-1.12-.14-1.28-.68-.16-.54.14-1.12.68-1.28 4.18-1.27 10.22-1.04 14.1 1.5.49.3.64.94.34 1.43-.3.49-.94.64-1.43.34z" />
        </svg>
      </span>
    ),
  },
];

const STAT_CARDS = [
  {
    label: 'Предстоящие',
    value: '8 740,32',
    suffix: '₽',
    sub: '4 платежа',
    accent: 'text-indigo-600',
  },
  {
    label: 'В этом месяце',
    value: '21 580,00',
    suffix: '₽',
    sub: '12 платежей',
    accent: 'text-gray-900 dark:text-white',
  },
  {
    label: 'Годовая экономия',
    value: '24 630,40',
    suffix: '₽',
    sub: '↑ 18% к апрелю',
    accent: 'text-emerald-500',
    subAccent: 'text-emerald-500',
  },
  {
    label: 'Подписки',
    value: '14',
    suffix: 'активных',
    sub: '2 скоро закончатся',
    accent: 'text-gray-900 dark:text-white',
    subAccent: 'text-orange-500',
  },
];

const CATEGORY_LEGEND = [
  { label: 'Подписки', pct: '56%', amount: '12 100 ₽', color: '#6366f1' },
  { label: 'Сервисы', pct: '18%', amount: '3 890 ₽', color: '#3b82f6' },
  { label: 'Связь', pct: '12%', amount: '2 590 ₽', color: '#8b5cf6' },
  { label: 'Развлечения', pct: '8%', amount: '1 720 ₽', color: '#f97316' },
  { label: 'Прочее', pct: '6%', amount: '1 280 ₽', color: '#a78bfa' },
];

const NAV_ITEMS = ['Главная', 'Платежи', 'Категории', 'Аналитика'];

const CATEGORY_SEGMENTS = [
  { color: '#6366f1', offset: 0 },
  { color: '#3b82f6', offset: 56 },
  { color: '#8b5cf6', offset: 74 },
  { color: '#f97316', offset: 86 },
  { color: '#a78bfa', offset: 94 },
  { color: '#c4b5fd', offset: 100 },
];

/** Декоративный макет дашборда для hero-секции лендинга */
export const LandingHeroMockup: React.FC = () => (
  <div className="landing-hero-dashboard relative w-full overflow-hidden rounded-[20px] border border-gray-200/60 bg-[#f8f9fa] shadow-2xl dark:border-white/10 dark:bg-gray-900/50">
    {/* Верхняя панель */}
    <div className="flex items-center justify-between gap-4 border-b border-gray-200/60 bg-white px-6 py-4 dark:border-white/10 dark:bg-gray-900">
      <div className="flex min-w-0 items-center gap-2">
        <div className="size-5 shrink-0 text-gray-900 dark:text-white">
          <svg
            viewBox="0 0 48 48"
            fill="currentColor"
            className="h-full w-full"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
            />
          </svg>
        </div>
        <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
          Хочу Плачу
        </span>
      </div>

      <div className="hidden items-center gap-6 sm:flex">
        {NAV_ITEMS.map((item, index) => (
          <span
            key={item}
            className={`relative text-xs font-semibold ${
              index === 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {item}
            {index === 0 && (
              <span className="absolute -bottom-[21px] left-0 right-0 mx-auto h-[3px] w-full rounded-t-full bg-indigo-600 dark:bg-indigo-400" />
            )}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <BellIcon className="h-5 w-5 text-gray-400" />
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
          alt="Avatar"
          className="size-7 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
        />
      </div>
    </div>

    <div className="space-y-5 p-6">
      {/* Заголовок обзора */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            Обзор
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Ваши финансы на одной странице
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-gray-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
          >
            <CalendarIcon className="h-3 w-3 text-gray-400" />
            Май 2024
            <ChevronDownIcon className="h-3 w-3 text-gray-400" />
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <PlusIcon className="h-3 w-3" />
            Добавить платёж
          </button>
        </div>
      </div>

      {/* Сводные карточки */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200/50 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-gray-900"
          >
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
            <p
              className={`mt-1 text-lg font-bold leading-tight ${stat.accent}`}
            >
              {stat.value}
              {stat.suffix && (
                <span
                  className={`ml-1 text-[10px] font-medium ${stat.label === 'Подписки' ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  {stat.suffix}
                </span>
              )}
            </p>
            <p
              className={`mt-1 text-[10px] font-medium ${
                stat.subAccent ?? 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* Ближайшие платежи */}
        <div className="rounded-xl border border-gray-200/50 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            Ближайшие платежи
          </p>
          <div className="space-y-4 mt-4">
            {UPCOMING_PAYMENTS.map((payment) => (
              <div
                key={payment.name}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {payment.icon}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900 dark:text-white">
                      {payment.name}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {payment.category}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-gray-400">{payment.date}</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                    {payment.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-right">
            <button
              type="button"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
            >
              Смотреть все платежи &rarr;
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* График */}
          <div className="rounded-xl border border-gray-200/50 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                Динамика расходов
              </p>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400"
              >
                Месяц
                <ChevronDownIcon className="h-3 w-3" />
              </button>
            </div>

            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                21 580 ₽
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">В этом месяце</p>
            </div>

            <div className="relative mt-4">
              <div className="absolute inset-y-0 left-0 flex flex-col justify-between pb-6 text-[9px] font-medium text-gray-400 dark:text-gray-500">
                <span>30k</span>
                <span>20k</span>
                <span>10k</span>
                <span>0</span>
              </div>
              <svg
                viewBox="0 0 240 60"
                className="ml-6 h-[4.5rem] w-[calc(100%-1.5rem)]"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient
                    id="landingChartFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 45 L20 38 L40 42 L60 28 L80 34 L100 20 L120 26 L140 14 L160 18 L180 8 L200 12 L220 4 L240 6 L240 55 L0 55 Z"
                  fill="url(#landingChartFill)"
                />
                <path
                  d="M0 45 L20 38 L40 42 L60 28 L80 34 L100 20 L120 26 L140 14 L160 18 L180 8 L200 12 L220 4 L240 6"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="220"
                  cy="4"
                  r="3"
                  fill="#4f46e5"
                  className="dark:fill-indigo-400"
                />
                <rect
                  x="202"
                  y="0"
                  width="36"
                  height="12"
                  rx="4"
                  fill="#4f46e5"
                />
                <text
                  x="220"
                  y="8.5"
                  textAnchor="middle"
                  className="fill-white text-[7px] font-bold"
                >
                  21 580 ₽
                </text>
              </svg>
              <div className="ml-6 mt-2 flex justify-between text-[9px] font-medium text-gray-400 dark:text-gray-500">
                <span>1 мая</span>
                <span>10 мая</span>
                <span>20 мая</span>
                <span>31 мая</span>
              </div>
            </div>
          </div>

          {/* Донат */}
          <div className="rounded-xl border border-gray-200/50 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">
              Топ категорий
            </p>
            <div className="flex items-center gap-6">
              <svg
                viewBox="0 0 64 64"
                className="size-[5rem] shrink-0"
                aria-hidden="true"
              >
                <circle
                  cx="32"
                  cy="32"
                  r="24"
                  fill="#f3f4f6"
                  className="dark:fill-white/10"
                />
                {CATEGORY_SEGMENTS.slice(0, -1).map((segment, index) => {
                  const start = segment.offset;
                  const end = CATEGORY_SEGMENTS[index + 1]?.offset ?? 100;
                  const startAngle = (start / 100) * 360 - 90;
                  const endAngle = (end / 100) * 360 - 90;
                  const largeArc = end - start > 50 ? 1 : 0;
                  const x1 = 32 + 24 * Math.cos((startAngle * Math.PI) / 180);
                  const y1 = 32 + 24 * Math.sin((startAngle * Math.PI) / 180);
                  const x2 = 32 + 24 * Math.cos((endAngle * Math.PI) / 180);
                  const y2 = 32 + 24 * Math.sin((endAngle * Math.PI) / 180);
                  return (
                    <path
                      key={segment.color}
                      d={`M 32 32 L ${x1} ${y1} A 24 24 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                    />
                  );
                })}
                <circle
                  cx="32"
                  cy="32"
                  r="14"
                  fill="white"
                  className="dark:fill-gray-950"
                />
              </svg>
              <div className="grid flex-1 gap-y-2.5">
                {CATEGORY_LEGEND.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                        {item.label}
                      </span>
                      <span className="text-xs font-medium text-gray-400">
                        {item.pct}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-gray-900 dark:text-white">
                      {item.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
