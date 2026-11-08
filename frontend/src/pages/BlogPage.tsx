import { useLanguage } from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { blogApi, BlogPost } from "../api/blogApi";
import { localizeBlogPost } from "../i18n/blog/localizeBlogPost";
import { localizeHref } from "../i18n/localePath";
import { formatDateForDisplay } from "../utils/dateUtils";

const BlogPage: React.FC = () => {
  const { t, locale, language } = useLanguage();
  const metadata = getPageMetadata("blog");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const data = await blogApi.getBlogPosts();
        setPosts(data);
      } catch {
        setError("Не удалось загрузить статьи. Попробуйте позже.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <>
      <PageMeta {...metadata} />
      <div className="public-container public-section max-w-4xl">
        <header className="mb-8">
          <h1 className="public-title">{t("Блог")}</h1>
          <p className="public-lead mt-3 max-w-prose">{t("Гиды по учёту расходов и сравнения финансовых приложений.")}</p>
        </header>

        {isLoading && (
          <div role="status" className="card-base public-card space-y-3 p-6">
            <span className="sr-only">{t("Загрузка...")}</span>
            <div aria-hidden="true" className="h-4 w-24 rounded bg-gray-200 dark:bg-white/10" />
            <div aria-hidden="true" className="h-6 w-3/4 rounded bg-gray-200 dark:bg-white/10" />
            <div aria-hidden="true" className="h-4 w-full rounded bg-gray-200 dark:bg-white/10" />
          </div>
        )}

        {!isLoading && error && (
          <p role="alert" className="card-base public-card p-6 text-red-800 dark:text-red-300">{t(error)}</p>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <p className="card-base public-card p-6 text-gray-700 dark:text-gray-300">
            {t("Статей пока нет.")}
          </p>
        )}

        {!isLoading && !error && posts.length > 0 && (
          <div className="grid gap-4">
            {posts.map((post) => localizeBlogPost(post, language)).map((post) => (
              <article key={post.id}>
                <Link
                  to={localizeHref(language, `/blog/${post.slug}`)}
                  aria-labelledby={`post-${post.id}`}
                  className="card-base public-card group block cursor-pointer p-4 transition-colors hover:border-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500 motion-reduce:transition-none sm:p-6 dark:hover:border-indigo-400/60"
                >
                  <time dateTime={post.createdAt} className="text-sm text-gray-600 dark:text-gray-300">
                    {formatDateForDisplay(new Date(post.createdAt), locale)}
                  </time>
                  <h2 id={`post-${post.id}`} lang={post.language} className="public-subtitle mt-2 group-hover:opacity-80">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p lang={post.language} className="mt-2 max-w-prose text-pretty text-gray-700 dark:text-gray-300">
                      {post.excerpt}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                    {t("Читать статью")}
                    <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default BlogPage;
