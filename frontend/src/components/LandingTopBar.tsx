import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { Link } from "react-router-dom";
import { ThemeSwitcher } from "./ThemeSwitcher";
import LanguageSelect from "./LanguageSelect";

const pillClassName =
  "inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-white";

/** Верхняя панель лендинга — внутри hero-секции, с теми же отступами что и контент */
export const LandingTopBar: React.FC = () => {
  const { t } = useLanguage();
  return (
    <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-4 sm:py-5">
      <Link
        to="/"
        className="group flex cursor-pointer items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:gap-3"
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
          {t("Хочу Плачу")}
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSelect />
        <Link to="/login" className={pillClassName}>
          {t("Войти")}
        </Link>
        <ThemeSwitcher variant="landing" />
      </div>
    </header>
  );
};
