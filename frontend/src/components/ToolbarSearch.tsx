import { useId, useRef, useEffect, type ReactElement } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { Input } from "./Input";

interface ToolbarSearchProps {
  value: string;
  onChange: (value: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  placeholder: string;
}

export default function ToolbarSearch({
  value,
  onChange,
  expanded,
  onExpandedChange,
  placeholder,
}: ToolbarSearchProps): ReactElement {
  const { t } = useLanguage();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = expanded || value.length > 0;

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  const closeSearch = (): void => {
    // Не трогаем значение, если поиск уже пуст, чтобы не провоцировать лишние обновления
    if (value) onChange("");
    onExpandedChange(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      className={`flex h-9 md:h-8 min-w-0 items-center rounded-md border ${
        isOpen
          ? "w-[280px] px-0.5 max-w-full border-[var(--ui-border)] bg-[var(--ui-surface)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/25"
          : "border-transparent"
      }`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeSearch();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("Поиск...")}
        aria-expanded={isOpen}
        aria-controls={isOpen ? inputId : undefined}
        title={t("Поиск...")}
        onClick={() => {
          onExpandedChange(true);
          inputRef.current?.focus();
        }}
        className={`flex ${isOpen ? "size-7" : "size-8"} shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`}
      >
        <MagnifyingGlassIcon className="size-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <>
          <Input
            ref={inputRef}
            id={inputId}
            unstyled
            aria-label={placeholder}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-full min-w-0 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-500 dark:text-gray-100 dark:placeholder:text-gray-400 focus:outline-none"
          />
          <button
            type="button"
            aria-label={t("Очистить поиск")}
            title={t("Очистить поиск")}
            onClick={closeSearch}
            className={`flex ${isOpen ? "size-7" : "size-8"} shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500`}
          >
            <XMarkIcon className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
