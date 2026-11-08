import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { ThemeSwitcher } from "./ThemeSwitcher";
import LanguageSelect from "./LanguageSelect";
import { localizeHref } from "../i18n/localePath";

const pillClassName =
  "inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 cursor-pointer dark:border-white/10 dark:bg-white/5 dark:text-white";

/** Общая верхняя панель публичных страниц. */
export const LandingTopBar: React.FC<{ showSignIn?: boolean }> = ({ showSignIn = true }) => {
  const { t, language } = useLanguage();
  return (
    <header className="landing-top-bar relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-2 py-4 sm:gap-x-3 sm:py-5">
      <Link
        to={localizeHref(language, "/")}
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
        <span className="landing-top-bar-title text-base font-bold tracking-tight text-gray-900 transition-opacity group-hover:opacity-80 sm:text-lg dark:text-white">
          {t("Хочу Плачу")}
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-4">
        <LanguageSelect compact />
        {showSignIn && (
          <Link
            to="/login"
            className={`${pillClassName} public-header-pill max-sm:px-2`}
            aria-label={t("Войти")}
          >
            <ArrowRightOnRectangleIcon aria-hidden="true" className="size-4 sm:hidden" />
            <span className="hidden sm:inline">{t("Войти")}</span>
          </Link>
        )}
        <div className="rounded-full sm:hidden [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-indigo-500 [&_button]:min-h-[44px] [&_button]:min-w-[44px]">
          <ThemeSwitcher />
        </div>
        <div className="hidden sm:block [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-indigo-500">
          <ThemeSwitcher variant="landing" />
        </div>
      </div>
    </header>
  );
};
