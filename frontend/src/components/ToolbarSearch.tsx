import { useId, useRef, useEffect, type ReactElement } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "../context/LanguageContext";
import { Input } from "./Input";
import { HeaderIconButton } from "./layout/AppHeader";
import { useBackHandler } from "../hooks/useBackHandler";

interface ToolbarSearchProps {
  value: string;
  onChange: (value: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  placeholder: string;
}

/**
 * Поиск в шапке страницы: иконка-кнопка, раскрывающая поле ввода.
 * На мобильных поле перекрывает всю шапку, на десктопе раскрывается на месте.
 * Поле без рамки — с мягкой заливкой, как и остальные элементы шапки.
 */
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
  // Сохранённый запрос держит поле открытым, чтобы фильтрация не оставалась скрытой
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

  // «Назад» на Android сворачивает раскрытый поиск, как и Escape
  useBackHandler(isOpen, closeSearch);

  return (
    <div
      className="flex items-center"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeSearch();
        }
      }}
    >
      {isOpen && (
        <div className="absolute inset-0 z-10 flex items-center bg-[var(--ui-bg)] px-2 md:static md:inset-auto md:z-auto md:w-64 md:bg-transparent md:px-0">
          <div className="flex h-10 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-gray-100 pl-2.5 pr-0.5 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/30 dark:bg-white/[0.06] md:h-8 md:pl-2">
            <MagnifyingGlassIcon
              className="size-4 shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              id={inputId}
              unstyled
              aria-label={placeholder}
              placeholder={placeholder}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="h-full min-w-0 w-full bg-transparent text-base text-gray-900 placeholder:text-gray-500 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-400 md:text-sm"
            />
            <button
              type="button"
              aria-label={t("Очистить поиск")}
              title={t("Очистить поиск")}
              onClick={closeSearch}
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.08] dark:hover:text-gray-100 md:size-7 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              <XMarkIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <HeaderIconButton
        ref={triggerRef}
        label={t("Поиск...")}
        icon={<MagnifyingGlassIcon aria-hidden="true" />}
        aria-expanded={isOpen}
        aria-controls={isOpen ? inputId : undefined}
        onClick={() => {
          onExpandedChange(true);
          inputRef.current?.focus();
        }}
        className={isOpen ? "md:hidden" : ""}
      />
    </div>
  );
}
