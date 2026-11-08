import { comparisonSlug } from "./blog/localizeBlogPost";
import type { Language } from "./translate";

const staticEnglishPaths = new Set(["/", "/download", "/about", "/terms", "/privacy", "/blog"]);

export interface LocalePath {
  locale: "en" | null;
  bare: string;
}

export interface SeoAlternates {
  canonical: string;
  ru: string;
  en?: string;
}

export function splitLocalePath(pathname: string): LocalePath {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const rest = pathname.slice(3);
    return { locale: "en", bare: rest === "" ? "/" : rest };
  }
  return { locale: null, bare: pathname };
}

export function hasEnglishUrl(bare: string): boolean {
  return staticEnglishPaths.has(bare) || bare === `/blog/${comparisonSlug}`;
}

export function isPublicSeoPath(bare: string): boolean {
  return hasEnglishUrl(bare) || /^\/blog\/[^/]+$/.test(bare);
}

export function toEnglishPath(bare: string): string {
  return bare === "/" ? "/en" : `/en${bare}`;
}

/** Куда ведёт переключатель. У непереведённой статьи английской страницы нет. */
export function pathForLanguage(pathname: string, language: Language): string {
  const { bare } = splitLocalePath(pathname);
  if (!isPublicSeoPath(bare)) return pathname;
  if (language === "ru") return bare;
  if (hasEnglishUrl(bare)) return toEnglishPath(bare);
  if (bare.startsWith("/blog/")) return "/en/blog";
  return pathname;
}

export function localizeHref(language: Language, to: string): string {
  const splitAt = to.search(/[?#]/);
  const path = splitAt === -1 ? to : to.slice(0, splitAt);
  const suffix = splitAt === -1 ? "" : to.slice(splitAt);
  if (!path.startsWith("/")) return to;
  const { bare } = splitLocalePath(path);
  if (language === "en" && hasEnglishUrl(bare)) return `${toEnglishPath(bare)}${suffix}`;
  return `${bare}${suffix}`;
}

export function seoAlternates(pathname: string, origin: string): SeoAlternates | null {
  const { locale, bare } = splitLocalePath(pathname);
  const originBase = origin.replace(/\/$/, "");
  const absolute = (path: string): string => `${originBase}${path}`;
  if (locale === "en") {
    if (!hasEnglishUrl(bare)) return null;
    const en = absolute(toEnglishPath(bare));
    return { canonical: en, ru: absolute(bare), en };
  }
  if (!isPublicSeoPath(bare)) return null;
  const ru = absolute(bare);
  return {
    canonical: ru,
    ru,
    en: hasEnglishUrl(bare) ? absolute(toEnglishPath(bare)) : undefined,
  };
}
