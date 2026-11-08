import type { BlogPost } from "../../api/blogApi";
import type { Language } from "../translate";
import comparisonContent from "./hpio-vs-zenmoney.en.html?raw";

export const comparisonSlug = "hpio-vs-zenmoney";

export function localizeBlogPost(post: BlogPost, language: Language): BlogPost & { language: Language } {
  if (language === "en" && post.slug === comparisonSlug) {
    return {
      ...post,
      title: "Hochu Plachu vs. ZenMoney: A comparison",
      excerpt: "Compare two personal finance apps and see the pros and cons of each.",
      content: post.content === undefined ? undefined : comparisonContent,
      language: "en",
    };
  }

  return { ...post, language: "ru" };
}
