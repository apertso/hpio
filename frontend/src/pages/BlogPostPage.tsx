import { useLanguage } from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { blogApi, BlogPost } from "../api/blogApi";
import { comparisonSlug, localizeBlogPost } from "../i18n/blog/localizeBlogPost";
import { localizeHref } from "../i18n/localePath";
import { locales } from "../i18n/translate";
import { formatDateForDisplay } from "../utils/dateUtils";

const BlogPostPage: React.FC = () => {
  const { t, locale, language } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const baseMetadata = getPageMetadata("blogPost");
  const [sourcePost, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Статья не найдена.");
      setIsLoading(false);
      return;
    }

    const load = async (): Promise<void> => {
      try {
        const data = await blogApi.getBlogPost(slug);
        setPost(data);
      } catch {
        setError("Не удалось загрузить статью. Попробуйте позже.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [slug]);

  const post = sourcePost && localizeBlogPost(sourcePost, language);
  const meta = post
    ? {
      ...baseMetadata,
      description: post.excerpt || baseMetadata.description,
      ogTitle: post.title,
      ogDescription: post.excerpt || baseMetadata.ogDescription,
      ogType: "article" as const,
      locale: locales[post.language].replace("-", "_"),
    }
    : baseMetadata;

  return (
    <>
      <PageMeta {...meta} />
      <div className="public-container public-section max-w-3xl">
        <Link
          to={localizeHref(language, "/blog")}
          className="public-link mb-4 inline-flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeftIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("Назад к блогу")}</span>
        </Link>

        {isLoading && (
          <div role="status" className="space-y-4">
            <span className="sr-only">{t("Загрузка...")}</span>
            <div aria-hidden="true" className="h-8 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
            <div aria-hidden="true" className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
            <div aria-hidden="true" className="aspect-video rounded-2xl bg-gray-200 dark:bg-white/10" />
          </div>
        )}

        {!isLoading && error && (
          <p role="alert" className="card-base public-card p-6 text-red-800 dark:text-red-300">{t(error)}</p>
        )}

        {!isLoading && !error && !post && (
          <p className="card-base public-card p-6 text-gray-700 dark:text-gray-300">
            {t("Статья не найдена.")}
          </p>
        )}

        {!isLoading && !error && post && (
          <article>
            <header className="mb-6 border-b border-gray-200 pb-6 dark:border-white/10">
              <h1 lang={post.language} className="public-title max-w-2xl">{post.title}</h1>
              {post.excerpt && <p lang={post.language} className="public-lead mt-3 max-w-prose">{post.excerpt}</p>}
              <time dateTime={post.createdAt} className="mt-4 block text-sm text-gray-600 dark:text-gray-300">
                {formatDateForDisplay(new Date(post.createdAt), locale)}
              </time>
            </header>
            <div
              lang={post.language}
              className={`prose prose-gray public-prose max-w-none dark:prose-invert ${post.slug === comparisonSlug ? "comparison-content" : ""}`}
              dangerouslySetInnerHTML={{ __html: post.content?.replace(/<(\/?)h1(?=[\s>])/gi, "<$1h2") || "" }}
            />
          </article>
        )}
      </div>
    </>
  );
};

export default BlogPostPage;
