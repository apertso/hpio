import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../components/PageMeta";
import { getPageMetadata } from "../utils/pageMetadata";
import { blogApi, BlogPost } from "../api/blogApi";

const BlogPage: React.FC = () => {
  const metadata = getPageMetadata("blog");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Блог
          </h1>
        </div>

        {isLoading && (
          <div className="text-gray-600 dark:text-gray-300">Загрузка...</div>
        )}

        {!isLoading && error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        {!isLoading && !error && posts.length === 0 && (
          <div className="text-gray-600 dark:text-gray-300">
            Статей пока нет.
          </div>
        )}

        {!isLoading && !error && posts.length > 0 && (
          <div className="grid gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="block cursor-pointer"
                >
                  <h2 className="text-xl font-semibold text-blue-600 hover:opacity-80 transition-opacity">
                    {post.title}
                  </h2>
                </Link>
                {post.excerpt && (
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    {post.excerpt}
                  </p>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                  {new Date(post.createdAt).toLocaleDateString("ru-RU")}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default BlogPage;


