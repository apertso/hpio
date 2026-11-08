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

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(storageKey);
    if (isLanguage(saved)) return saved;
  } catch {
    // Хранилище может быть недоступно в браузере или WebView.
  }

  for (const preference of navigator.languages ?? [navigator.language]) {
    const language = preference.split("-")[0].toLowerCase();
    if (isLanguage(language)) return language;
  }
  return "ru";
}

interface LanguageContextValue {
  language: Language;
  locale: (typeof locales)[Language];
  setLanguage: (language: Language) => void;
  t: (message: string, ...values: unknown[]) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "ru",
  locale: locales.ru,
  setLanguage: () => {},
  t: (message, ...values) => translate("ru", message, ...values),
});

export function LanguageProvider({ children }: { children: ReactNode }): ReactNode {
  const [language, setCurrentLanguage] = useState(getInitialLanguage);

  const setLanguage = useCallback((nextLanguage: Language): void => {
    setCurrentLanguage(nextLanguage);
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
