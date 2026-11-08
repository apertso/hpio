import { useLayoutEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPreferredLanguage, getStoredLanguage, useLanguage } from "../context/LanguageContext";
import { hasEnglishUrl, isPublicSeoPath, splitLocalePath, toEnglishPath } from "../i18n/localePath";
import { isTauriMobile } from "../utils/platform";

function redirectPath(
  locale: "en" | null,
  bare: string,
  search: string,
  hash: string,
  isAuthenticated: boolean,
): string | null {
  if (locale === "en") {
    return hasEnglishUrl(bare) ? null : `${bare}${search}${hash}`;
  }
  if (bare === "/" && (isAuthenticated || isTauriMobile())) return null;
  if (!isPublicSeoPath(bare)) return null;
  // Сохранённый English открывает /en. У бота хранилища нет, русский адрес остаётся.
  if (hasEnglishUrl(bare) && getStoredLanguage() === "en") {
    return `${toEnglishPath(bare)}${search}${hash}`;
  }
  return null;
}

/** Держит язык публичной страницы равным адресу, а не языку браузера. */
export default function PublicLocaleSync(): ReactNode {
  const { pathname, search, hash } = useLocation();
  const { setLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { locale, bare } = splitLocalePath(pathname);
  const redirectTo = redirectPath(locale, bare, search, hash, isAuthenticated);

  useLayoutEffect(() => {
    if (redirectTo) return;
    if (locale === "en") {
      setLanguage("en");
      return;
    }
    if (bare === "/" && (isAuthenticated || isTauriMobile())) return;
    if (!isPublicSeoPath(bare)) {
      setLanguage(getPreferredLanguage(), false);
      return;
    }
    setLanguage("ru", false);
  }, [redirectTo, locale, bare, isAuthenticated, setLanguage]);

  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return null;
}
