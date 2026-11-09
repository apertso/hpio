import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PublicLocaleSync from "../components/PublicLocaleSync";
import { AuthProvider } from "../context/AuthContext";
import { LanguageProvider } from "../context/LanguageContext";
import { localizeBlogPost } from "./blog/localizeBlogPost";
import { localizeHref, pathForLanguage, seoAlternates } from "./localePath";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("locale paths", () => {
  it("keeps Russian urls and prefixes English ones", () => {
    expect(pathForLanguage("/about", "ru")).toBe("/about");
    expect(pathForLanguage("/en/about", "ru")).toBe("/about");
    expect(pathForLanguage("/about", "en")).toBe("/en/about");
    expect(pathForLanguage("/", "en")).toBe("/en");
    expect(pathForLanguage("/dashboard", "en")).toBe("/dashboard");
    expect(localizeHref("en", "/blog/hpio-vs-zenmoney")).toBe("/en/blog/hpio-vs-zenmoney");
    expect(pathForLanguage("/blog/other", "en")).toBe("/en/blog");
    expect(localizeHref("en", "/blog/other")).toBe("/blog/other");
    expect(seoAlternates("/about", "https://hpio.ru")).toEqual({
      canonical: "https://hpio.ru/about",
      ru: "https://hpio.ru/about",
      en: "https://hpio.ru/en/about",
    });
    expect(seoAlternates("/en", "https://hpio.ru")?.canonical).toBe("https://hpio.ru/en");
    expect(seoAlternates("/blog/other", "https://hpio.ru")?.en).toBeUndefined();
  });

  it("связывает русскую и английскую версии статьи об обновлении", () => {
    const path = "/blog/hpio-1-1";
    const englishPath = "/en/blog/hpio-1-1";
    const post = { id: "1", slug: "hpio-1-1", title: "Обновление", createdAt: "2026-11-09" };

    expect(localizeHref("en", path)).toBe(englishPath);
    expect(pathForLanguage(englishPath, "ru")).toBe(path);
    expect(seoAlternates(path, "https://hpio.ru")?.en).toBe(`https://hpio.ru${englishPath}`);
    expect(localizeBlogPost(post, "en")).toMatchObject({ language: "en", content: undefined });
    expect(localizeBlogPost({ ...post, content: "Русский текст" }, "en").content)
      .toContain("Choose a currency for each payment");
  });
});

describe("PublicLocaleSync", () => {
  const renderAt = (path: string): void => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <LanguageProvider>
            <PublicLocaleSync />
            <Routes>
              <Route path="/about" element={<h1>russian</h1>} />
              <Route path="/en/about" element={<h1>english</h1>} />
              <Route path="/blog/other" element={<h1>russian-post</h1>} />
              <Route path="/en/blog/other" element={<h1>english-post</h1>} />
              <Route path="/" element={<h1>home</h1>} />
              <Route path="/en" element={<h1>en-home</h1>} />
            </Routes>
          </LanguageProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  };

  it.each([
    ["en-US", "en-home", "en"],
    ["ru-RU", "home", "ru"],
    ["fr-FR", "home", "ru"],
  ])("выбирает главную по языку браузера %s", async (browserLanguage, heading, language) => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([browserLanguage]);
    renderAt("/");
    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
    expect(document.documentElement.lang).toBe(language);
  });

  it("оставляет русскую главную при сохранённом русском и английском браузере", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    localStorage.setItem("language", "ru");
    renderAt("/");
    expect(screen.getByRole("heading", { name: "home" })).toBeVisible();
    expect(document.documentElement.lang).toBe("ru");
  });

  it("keeps a Russian url in Russian when the browser is English", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    renderAt("/about");
    expect(screen.getByRole("heading", { name: "russian" })).toBeVisible();
    expect(document.documentElement.lang).toBe("ru");
    expect(localStorage.getItem("language")).toBeNull();
  });

  it("opens the English url when English was saved", async () => {
    localStorage.setItem("language", "en");
    renderAt("/about");
    expect(await screen.findByRole("heading", { name: "english" })).toBeVisible();
  });

  it("drops an English url for a post that has no translation", async () => {
    renderAt("/en/blog/other");
    expect(await screen.findByRole("heading", { name: "russian-post" })).toBeVisible();
  });

  it("leaves the signed-in home on its current url", () => {
    localStorage.setItem("language", "en");
    localStorage.setItem("jwtToken", "token");
    localStorage.setItem("user", JSON.stringify({ id: "1", email: "a@b.c", name: "A", isVerified: true }));
    renderAt("/");
    expect(screen.getByRole("heading", { name: "home" })).toBeVisible();
  });
});
