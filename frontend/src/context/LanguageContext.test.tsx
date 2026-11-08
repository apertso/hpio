import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import LanguageSelect from "../components/LanguageSelect";
import { translate } from "../i18n/translate";
import { LanguageProvider, useLanguage } from "./LanguageContext";

function LocalizedContent(): React.JSX.Element {
  const { t, locale } = useLanguage();
  return (
    <>
      <h1>{t("Настройки")}</h1>
      <p>{new Intl.NumberFormat(locale).format(1234.56)}</p>
      <LanguageSelect />
    </>
  );
}

const renderPage = (): ReturnType<typeof render> => render(
  <MemoryRouter initialEntries={["/settings"]}>
    <LanguageProvider>
      <LocalizedContent />
    </LanguageProvider>
  </MemoryRouter>,
);

afterEach(() => {
  localStorage.removeItem("language");
  vi.restoreAllMocks();
});

describe("LanguageProvider", () => {
  it("switches language and formatting in place and restores the preference", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["ru-RU"]);
    const page = renderPage();

    expect(screen.getByRole("heading", { name: "Настройки" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(screen.getByText("1,234.56")).toBeVisible();
    expect(document.documentElement.lang).toBe("en");
    page.unmount();

    renderPage();
    expect(screen.getByRole("button", { name: "Interface language" })).toHaveTextContent("English");
  });

  it("uses a supported browser language when the saved preference is invalid", () => {
    localStorage.setItem("language", "invalid");
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "en-GB"]);
    renderPage();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  it("defaults to Russian when the browser languages are unsupported", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR"]);
    renderPage();
    expect(screen.getByRole("heading", { name: "Настройки" })).toBeVisible();
  });

  it("moves a public page to its English url", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["ru-RU"]);
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <LanguageProvider>
          <Routes>
            <Route path="/about" element={<LanguageSelect />} />
            <Route path="/en/about" element={<p>english-about</p>} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));
    expect(screen.getByText("english-about")).toBeVisible();
    expect(localStorage.getItem("language")).toBe("en");
  });
});

describe("translate", () => {
  it("inserts values without interpreting or translating their content", () => {
    expect(translate("en", "Скачать {1}", "Чек {2}.pdf")).toBe("Download Чек {2}.pdf");
  });

  it("returns source text if no translation exists", () => {
    expect(translate("en", "constructor")).toBe("constructor");
    expect(translate("ru", "Настройки")).toBe("Настройки");
  });
});
