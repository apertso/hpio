import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { isLanguage, locales, translate, type Language } from "../i18n/translate";

const storageKey = "language";

export function getStoredLanguage(): Language | null {
  try {
    const saved = localStorage.getItem(storageKey);
    return isLanguage(saved) ? saved : null;
  } catch {
    // Хранилище может быть недоступно в браузере или WebView.
    return null;
  }
}

export function getPreferredLanguage(): Language {
  const saved = getStoredLanguage();
  if (saved) return saved;

  for (const preference of navigator.languages ?? [navigator.language]) {
    const language = preference.split("-")[0].toLowerCase();
    if (isLanguage(language)) return language;
  }
  return "ru";
}

interface LanguageContextValue {
  language: Language;
  locale: (typeof locales)[Language];
  setLanguage: (language: Language, persist?: boolean) => void;
  t: (message: string, ...values: unknown[]) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "ru",
  locale: locales.ru,
  setLanguage: () => {},
  t: (message, ...values) => translate("ru", message, ...values),
});

export function LanguageProvider({ children }: { children: ReactNode }): ReactNode {
  const [language, setCurrentLanguage] = useState(getPreferredLanguage);

  const setLanguage = useCallback((nextLanguage: Language, persist = true): void => {
    setCurrentLanguage(nextLanguage);
    if (!persist) return;
    try {
      localStorage.setItem(storageKey, nextLanguage);
    } catch {
      // Выбор действует до перезагрузки, если хранилище недоступно.
    }
  }, []);

  useLayoutEffect((): void => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (message: string, ...values: unknown[]): string =>
      translate(language, message, ...values),
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, locale: locales[language], setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
