import { useLanguage } from "../context/LanguageContext";
import { useEffect } from "react";
import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useDropdown } from "../hooks/useDropdown";
import type { Language } from "../i18n/translate";

const languages: { value: Language; label: string }[] = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
];

/** Пилюля с меню — тот же вид, что у кнопки «Войти» на главной */
export default function LanguageSelect(): React.JSX.Element {
  const { language, setLanguage, t } = useLanguage();
  const { isOpen, setIsOpen, containerRef } = useDropdown();
  const current = languages.find((item) => item.value === language) ?? languages[0];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 dark:border-white/10 dark:bg-white/5 dark:text-white"
        aria-label={t("Язык интерфейса")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span lang={current.value}>{current.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={t("Язык интерфейса")}
          className="absolute right-0 z-30 mt-2 w-44 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-gray-900"
        >
          {languages.map((item) => {
            const selected = item.value === language;
            return (
              <button
                key={item.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                lang={item.value}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "bg-gray-100 font-semibold text-gray-900 dark:bg-white/10 dark:text-white"
                    : "font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                }`}
                onClick={() => {
                  setLanguage(item.value);
                  setIsOpen(false);
                }}
              >
                {item.label}
                {selected && <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
