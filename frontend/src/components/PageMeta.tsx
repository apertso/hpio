import React from "react";

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
  locale = "ru_RU",
  isLandingPage = false,
}) => {
  const baseUrl = import.meta.env.VITE_APP_URL || "https://hpio.ru";
  const defaultOgImage = `${baseUrl}/og-image.png`;
  const ogSiteName = "Хочу Плачу";

  // Title logic: landing page uses title as-is, others use ogTitle + " - " + siteName
  const finalTitle =
    title ?? isLandingPage
      ? `${ogSiteName} - ${ogTitle}`
      : `${ogTitle} - ${ogSiteName}`;
  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  const finalOgImage = ogImage || defaultOgImage;
  const finalOgUrl =
    ogUrl || (typeof window !== "undefined" ? window.location.href : baseUrl);

  return (
    <>
      {/* Basic meta tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      {robots && <meta name="robots" content={robots} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph meta tags */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={ogSiteName} />
      <meta property="og:locale" content={locale} />

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
