import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark"; // Фактическая тема, используемая UI
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Чтение темы из localStorage при старте, по умолчанию 'system'
  const [theme, setThemeState] = useState<Theme>(
    (localStorage.getItem("theme") as Theme) || "system"
  );
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");

  // Эффект для отслеживания системных предпочтений
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light"); // Инициализация
    mediaQuery.addEventListener("change", handleChange); // Подписка на изменения

    return () => {
      mediaQuery.removeEventListener("change", handleChange); // Отписка
    };
  }, []);

  // Вычисляем фактическую тему для UI
  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (theme === "system") {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  // Эффект для применения класса темы к элементу <html>
  useEffect(() => {
    const root = window.document.documentElement;
    if (root.classList.contains(resolvedTheme)) {
      return;
    }

    // Временно отключаем все CSS-переходы, иначе элементы с transition-colors/transition-all
    // перекрашиваются с разной скоростью и страница "мигает" при смене темы
    const style = document.createElement("style");
    style.appendChild(
      document.createTextNode(
        "*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"
      )
    );
    document.head.appendChild(style);

    root.classList.remove("light", "dark"); // Удаляем старые классы
    root.classList.add(resolvedTheme); // Добавляем текущую фактическую тему

    // Принудительный пересчёт стилей, чтобы новая тема применилась без анимации
    void window.getComputedStyle(document.body).opacity;

    // Возвращаем переходы сразу после применения стилей
    // (setTimeout, а не requestAnimationFrame: rAF не срабатывает в фоновых вкладках)
    const timeout = window.setTimeout(() => style.remove(), 1);

    return () => {
      window.clearTimeout(timeout);
      style.remove();
    };
  }, [resolvedTheme]);

  // Функция для изменения темы пользователем
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme); // Сохраняем выбор пользователя
    // TODO: Возможно, отправить выбор темы на бэкенд в настройки пользователя
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, setTheme, resolvedTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// Хук для использования контекста темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
