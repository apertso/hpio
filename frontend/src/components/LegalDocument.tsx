import type { ReactElement, ReactNode } from "react";
import { useEffect } from "react";
import { ArrowLeftIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import type { Language } from "../i18n/translate";
import { formatDateForDisplay, parseCalendarDate } from "../utils/dateUtils";
import { isTauriMobile } from "../utils/platform";

export type LegalSection = { id: string } & Record<Language, { title: string; body: ReactNode }>;

const lastUpdated = "2025-08-12";

export default function LegalDocument({
  title,
  sections,
}: {
  title: string;
  sections: LegalSection[];
}): ReactElement {
  const { t, language, locale } = useLanguage();
  const { state, hash } = useLocation();
  const navigate = useNavigate();
  const localizedSections = sections.map(({ id, ...copy }) => ({ id, ...copy[language] }));

  useEffect(() => {
    if (!hash) return;
    const heading = document.getElementById(hash.slice(1));
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView();
  }, [hash]);

  const contents = (
    <ol className="space-y-1">
      {localizedSections.map(({ id, title }, index) => (
        <li key={id}>
          <Link to={`#${id}`} state={state} className="public-link grid min-h-9 grid-cols-[1.5em_1fr] items-baseline py-2 text-sm">
            <span className="tabular-nums text-gray-600 dark:text-gray-400">{index + 1}.</span>
            <span>{title}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
  const backIcon = <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />;
  const backClass = "public-link mb-4 inline-flex min-h-11 items-center gap-2 text-sm";

  return (
    <div className="public-container public-section">
      <div className="mx-auto max-w-3xl md:max-w-none">
        {isTauriMobile() ? (
          <button type="button" className={backClass} onClick={() => navigate(-1)}>
            {backIcon}
            {t("Назад")}
          </button>
        ) : state?.fromRegister === true && (
          <Link to="/register" className={backClass}>
            {backIcon}
            {t("Вернуться к регистрации")}
          </Link>
        )}
        <header className="mb-6 max-w-3xl sm:mb-8">
          <h1 className="public-title">{t(title)}</h1>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {t("Последнее обновление:")}{" "}
            <time dateTime={lastUpdated}>{formatDateForDisplay(parseCalendarDate(lastUpdated), locale)}</time>
          </p>
          {language === "en" && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("Перевод с русского")}</p>
          )}
        </header>
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-12">
          <nav aria-label={t("Содержание документа")} className="md:sticky md:top-4">
            <details className="card-base public-card group px-4 md:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-3 text-sm font-semibold hover:opacity-80 [&::-webkit-details-marker]:hidden">
                {t("Содержание документа")}
                <ChevronDownIcon className="size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform" aria-hidden="true" />
              </summary>
              <div className="pb-3">{contents}</div>
            </details>
            <div className="hidden md:block">
              <p className="mb-2 font-semibold">{t("Содержание документа")}</p>
              {contents}
            </div>
          </nav>
          <article className="space-y-8 border-t border-gray-200 pt-6 sm:rounded-2xl sm:border sm:bg-white sm:p-8 dark:border-white/10 dark:sm:bg-[#1f1f1f]">
            {localizedSections.map(({ id, title, body }, index) => (
              <section key={id} aria-labelledby={id} className="prose prose-gray public-prose max-w-prose dark:prose-invert">
                <h2 id={id} tabIndex={-1} className="scroll-mt-6">{index + 1}. {title}</h2>
                {body}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
}
