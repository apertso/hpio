import type { BlogPost } from "../../api/blogApi";
import type { Language } from "../translate";
import comparisonContent from "./hpio-vs-zenmoney.en.html?raw";
import releaseContent from "./hpio-1-1.en.html?raw";

export const comparisonSlug = "hpio-vs-zenmoney";
export const releaseSlug = "hpio-1-1";

const englishPosts = new Map([
  [comparisonSlug, {
    title: "Hochu Plachu vs. ZenMoney: A comparison",
    excerpt: "Compare two personal finance apps and see the pros and cons of each.",
    content: comparisonContent,
  }],
  [releaseSlug, {
    title: "Hochu Plachu 1.1 brings payments in multiple currencies and an English interface",
    excerpt: "Rent in Georgian lari, a subscription in US dollars, utility bills in rubles. You can now schedule them all in Hochu Plachu and choose the currency for each payment. The website and app are now available in English, too.",
    content: releaseContent,
  }],
]);

export function hasEnglishBlogPost(slug: string): boolean {
  return englishPosts.has(slug);
}

export function localizeBlogPost(post: BlogPost, language: Language): BlogPost & { language: Language } {
  const translation = language === "en" ? englishPosts.get(post.slug) : undefined;
  if (translation) {
    return {
      ...post,
      ...translation,
      content: post.content === undefined ? undefined : translation.content,
      language: "en",
    };
  }

  return { ...post, language: "ru" };
}
