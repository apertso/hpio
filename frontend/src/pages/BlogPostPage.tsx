import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { blogApi, BlogPost } from "../api/blogApi";

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const baseMetadata = getPageMetadata("blogPost");
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("Статья не найдена.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
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

  const meta = useMemo(() => {
    if (!post) {
      return baseMetadata;
    }

    return {
      ...baseMetadata,
      title: post.title,
      description: post.excerpt || baseMetadata.description,
      ogTitle: post.title,
      ogDescription: post.excerpt || baseMetadata.ogDescription,
      ogType: "article" as const,
    };
  }, [baseMetadata, post]);

  return (
    <>
      <PageMeta {...meta} />
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-blue-600 hover:opacity-80 transition-opacity cursor-pointer mb-6"
        >
          <span>←</span>
          <span>Назад к блогу</span>
        </Link>

        {isLoading && (
          <div className="text-gray-600 dark:text-gray-300">Загрузка...</div>
        )}

        {!isLoading && error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {!isLoading && !error && !post && (
          <div className="text-gray-600 dark:text-gray-300">
            Статья не найдена.
          </div>
        )}

        {!isLoading && !error && post && (
          <article className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              {post.title}
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {new Date(post.createdAt).toLocaleDateString("ru-RU")}
            </div>
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />
          </article>
        )}
      </div>
    </>
  );
};

export default BlogPostPage;
