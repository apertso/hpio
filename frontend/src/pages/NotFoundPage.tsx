import { useLanguage } from "../context/LanguageContext";
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { localizeHref } from "../i18n/localePath";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";

const NotFoundPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const metadata = getPageMetadata("404");

  return (
    <>
      <PageMeta {...metadata} />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center px-4">
        <p className="mb-3 text-sm font-medium tabular-nums text-gray-400 dark:text-gray-500">404</p>
        <h1 className="ui-page-title mb-1.5">{t("404 - Страница не найдена")}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("Извините, страница, которую вы ищете, не существует.")}
        </p>
        <Link
          to={isAuthenticated ? "/dashboard" : localizeHref(language, "/")}
          className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity cursor-pointer"
        >
          {t("Вернуться на главную")}
        </Link>
      </div>
    </>
  );
};

export default NotFoundPage;
