import React from "react";
import { Link } from "react-router-dom";
import { ThemeSwitcher } from "./ThemeSwitcher";

/** Верхняя панель лендинга — внутри hero-секции, с теми же отступами что и контент */
export const LandingTopBar: React.FC = () => (
  <header className="relative z-20 flex shrink-0 items-center justify-between py-4 sm:py-5">
    <Link
      to="/"
      className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
    >
      <div className="size-4 text-black transition-transform group-hover:scale-105 dark:text-white">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <span className="text-lg font-bold tracking-tight text-gray-900 transition-opacity group-hover:opacity-80 dark:text-white">
        Хочу Плачу
      </span>
    </Link>

    <div className="flex items-center gap-3 sm:gap-4">
      <Link
        to="/login"
        className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-white"
      >
        Войти
      </Link>
      <ThemeSwitcher variant="landing" />
    </div>
  </header>
);
