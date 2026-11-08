import { useLanguage } from "../context/LanguageContext";
import React, { useLayoutEffect } from "react";

export interface PageMetaProps {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: "website" | "article";
  canonical?: string;
  robots?: string;
  locale?: string;
  isLandingPage?: boolean;
}

const PageMeta: React.FC<PageMetaProps> = ({
  title,
  description,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  ogType = "website",
  canonical,
  robots,
  locale: ogLocale,
  isLandingPage = false,
}) => {
  const { t, locale } = useLanguage();
  const baseUrl = import.meta.env.VITE_APP_URL || "https://hpio.ru";
  const defaultOgImage = `${baseUrl}/og-image.png`;
  const siteName = t("Хочу Плачу");

  const finalTitle =
    title ?? isLandingPage
      ? `${siteName} - ${t(ogTitle ?? "")}`
      : `${t(ogTitle ?? "")} - ${siteName}`;
  const finalOgTitle = t(ogTitle || title || "");
  const finalOgDescription = t(ogDescription || description || "");
  const finalOgImage = ogImage || defaultOgImage;
  const finalOgUrl =
    ogUrl || (typeof window !== "undefined" ? window.location.href : baseUrl);

  // Обновляем теги из index.html при переходах между страницами.
  useLayoutEffect((): void => {
    document.title = finalTitle;
    document.head
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t(description || ogDescription || ""));
  }, [description, ogDescription, finalTitle, t]);

  return (
    <>
      {robots && <meta name="robots" content={robots} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph meta tags */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content={ogLocale ?? locale.replace("-", "_")} />

      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={finalOgImage} />

      {/* Additional meta tags for better SEO */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charSet="utf-8" />
    </>
  );
};

export default PageMeta;
