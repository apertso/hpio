import React from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../context/ThemeContext";

export const ThemeSwitcher = ({
  variant = "default",
}: {
  variant?: "default" | "landing";
}): React.ReactElement => {
  const { setTheme, resolvedTheme } = useTheme();

  if (variant === "landing") {
    return (
      <div className="flex items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
        <button
          onClick={() => setTheme("light")}
          className={`flex size-8 items-center justify-center rounded-full transition-all cursor-pointer focus:outline-none ${
            resolvedTheme === "light"
              ? "bg-gray-100 text-gray-900 shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label="Светлая тема"
          title="Светлая тема"
        >
          <SunIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`flex size-8 items-center justify-center rounded-full transition-all cursor-pointer focus:outline-none ${
            resolvedTheme === "dark"
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          aria-label="Тёмная тема"
          title="Тёмная тема"
        >
          <MoonIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 hover:opacity-80 transition-all cursor-pointer focus:outline-none"
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      {resolvedTheme === "light" ? (
        <MoonIcon className="h-5 w-5" />
      ) : (
        <SunIcon className="h-5 w-5" />
      )}
    </button>
  );
};
