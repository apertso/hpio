import db from "../models";
import logger from "../config/logger";
import { BlogPostInstance } from "../models/BlogPost";

export const getPublishedPosts = async (): Promise<BlogPostInstance[]> => {
  try {
    const posts = await db.BlogPost.findAll({
      where: { published: true },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "slug", "title", "excerpt", "createdAt"],
    });
    logger.info(`Fetched ${posts.length} published blog posts`);
    return posts;
  } catch (error) {
    logger.error("Failed to fetch blog posts", error);
    throw new Error("Не удалось получить список статей.");
  }
};

export const getPostBySlug = async (
  slug: string
): Promise<BlogPostInstance | null> => {
  try {
    const post = await db.BlogPost.findOne({
      where: { slug, published: true },
    });
    if (!post) {
      logger.warn(`Blog post not found by slug: ${slug}`);
    }
    return post;
  } catch (error) {
    logger.error(`Failed to fetch blog post by slug ${slug}`, error);
    throw new Error("Не удалось получить статью.");
  }
};
