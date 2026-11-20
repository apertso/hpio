import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { TextField } from "./Input";
import { useLanguage } from "../context/LanguageContext";

type Period = "AM" | "PM";

interface TimeInputProps {
  label?: React.ReactNode;
  /** Значение в формате "HH:mm" (24 часа), как хранится на бэкенде */
  value: string;
  /** Вызывается только при фиксации изменений (уход фокуса, Enter, переключение AM/PM) */
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  hint?: React.ReactNode;
  wrapperClassName?: string;
}

// Задержка автосохранения после последнего ввода
const AUTO_SAVE_DELAY_MS = 1000;

const pad = (n: number): string => String(n).padStart(2, "0");

/** Собирает значение "HH:mm" из полей ввода; null — если ввод некорректен */
const buildTime = (
  hText: string,
  mText: string,
  p: Period,
  uses12Hour: boolean
): string | null => {
  if (!/^\d{1,2}$/.test(hText) || !/^\d{1,2}$/.test(mText)) return null;
  let h = Number(hText);
  const m = Number(mText);
  if (m > 59) return null;
  if (uses12Hour) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (p === "PM" ? 12 : 0);
  } else if (h > 23) {
    return null;
  }
  return `${pad(h)}:${pad(m)}`;
};

/**
 * Возвращает цифры сегмента (максимум 2). Если сегмент уже был заполнен и
 * текст не выделился (частый случай на мобильных при тапе), новая цифра
 * начинает ввод заново, а не отбрасывается.
 */
const readSegmentDigits = (input: HTMLInputElement): string => {
  const digits = input.value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  const caret = input.selectionStart ?? input.value.length;
  const typed = input.value.charAt(caret - 1);
  return /\d/.test(typed) ? typed : digits.slice(0, 2);
};

/** Выделяет содержимое после фокуса — отложенно, чтобы тап на мобильных не сбросил выделение */
const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
  const input = e.target;
  window.setTimeout(() => input.select(), 0);
};

const parseTime = (value: string): { hours: number; minutes: number } => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return { hours: 0, minutes: 0 };
  return {
    hours: Math.min(23, Number(match[1])),
    minutes: Math.min(59, Number(match[2])),
  };
};

/** Определяет, использует ли локаль 12-часовой формат, и подписи AM/PM для неё */
const getLocaleTimeInfo = (
  locale: string
): { uses12Hour: boolean; periodLabels: Record<Period, string> } => {
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric" });
  const uses12Hour = Boolean(formatter.resolvedOptions().hour12);
  const periodLabel = (hours: number, fallback: string): string =>
    formatter
      .formatToParts(new Date(2000, 0, 1, hours))
      .find((part) => part.type === "dayPeriod")?.value ?? fallback;
  return {
    uses12Hour,
    periodLabels: { AM: periodLabel(9, "AM"), PM: periodLabel(21, "PM") },
  };
};

/**
 * Поле ввода времени с форматом по языку интерфейса (а не по локали ОС, как у
 * нативного input[type=time]). Часы и минуты вводятся с клавиатуры или стрелками,
 * для 12-часовых локалей добавляется переключатель AM/PM.
 */
const TimeInput: React.FC<TimeInputProps> = ({
  label,
  value,
  onChange,
  disabled,
  id,
  hint,
  wrapperClassName,
}) => {
  const { t, locale } = useLanguage();
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  const { uses12Hour, periodLabels } = useMemo(
    () => getLocaleTimeInfo(locale),
    [locale]
  );

  const { hours, minutes } = parseTime(value);
  const toDisplayHour = (h24: number): string =>
    uses12Hour ? String(h24 % 12 === 0 ? 12 : h24 % 12) : pad(h24);

  const [hourText, setHourText] = useState(toDisplayHour(hours));
  const [minuteText, setMinuteText] = useState(pad(minutes));
  const [period, setPeriod] = useState<Period>(hours >= 12 ? "PM" : "AM");

  // Синхронизируем локальное состояние с внешним значением и сменой локали
  useEffect(() => {
    const parsed = parseTime(value);
    setHourText(
      uses12Hour
        ? String(parsed.hours % 12 === 0 ? 12 : parsed.hours % 12)
        : pad(parsed.hours)
    );
    setMinuteText(pad(parsed.minutes));
    setPeriod(parsed.hours >= 12 ? "PM" : "AM");
  }, [value, uses12Hour]);

  // Последнее отправленное значение — защищает от повторной отправки, пока
  // родитель ещё не обновил value после сохранения
  const lastSentRef = useRef<string | null>(null);
  // Значение, ожидающее автосохранения (отправляется и при размонтировании)
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    lastSentRef.current = null;
  }, [value]);

  const send = (next: string): void => {
    pendingRef.current = null;
    if (next === value || next === lastSentRef.current) return;
    lastSentRef.current = next;
    onChange(next);
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  // Автосохранение: на мобильных скрытие клавиатуры не снимает фокус,
  // поэтому не полагаемся только на blur
  useEffect(() => {
    const next = buildTime(hourText, minuteText, period, uses12Hour);
    if (next === null || minuteText.length < 2 || next === value) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = next;
    const timer = window.setTimeout(
      () => sendRef.current(next),
      AUTO_SAVE_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [hourText, minuteText, period, uses12Hour, value]);

  // Уход со страницы до истечения задержки — сохраняем сразу
  useEffect(
    () => () => {
      if (pendingRef.current) sendRef.current(pendingRef.current);
    },
    []
  );

  const commit = (hText = hourText, mText = minuteText, p = period): void => {
    const next = buildTime(hText, mText, p, uses12Hour);
    if (next === null) {
      // Некорректный ввод — возвращаем сохранённое значение
      setHourText(toDisplayHour(hours));
      setMinuteText(pad(minutes));
      setPeriod(hours >= 12 ? "PM" : "AM");
      return;
    }
    const parsed = parseTime(next);
    setHourText(toDisplayHour(parsed.hours));
    setMinuteText(pad(parsed.minutes));
    send(next);
  };

  // Фиксируем изменения, когда фокус покидает всё поле целиком
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>): void => {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      commit();
    }
  };

  const step = (
    part: "hour" | "minute",
    delta: number
  ): void => {
    if (part === "hour") {
      const max = uses12Hour ? 12 : 23;
      const min = uses12Hour ? 1 : 0;
      const current = Number(hourText) || min;
      let next = current + delta;
      if (next > max) next = min;
      if (next < min) next = max;
      setHourText(uses12Hour ? String(next) : pad(next));
    } else {
      const current = Number(minuteText) || 0;
      setMinuteText(pad((current + delta + 60) % 60));
    }
  };

  const handleKeyDown =
    (part: "hour" | "minute") =>
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        step(part, e.key === "ArrowUp" ? 1 : -1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (part === "hour") {
          minutesRef.current?.focus();
        } else {
          commit();
          e.currentTarget.blur();
        }
      } else if (
        part === "hour" &&
        (e.key === ":" || e.key === "." || e.key === " ")
      ) {
        e.preventDefault();
        minutesRef.current?.focus();
      }
    };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const digits = readSegmentDigits(e.target);
    setHourText(digits);
    // Переходим к минутам, когда час введён однозначно
    const firstDigitLimit = uses12Hour ? 1 : 2;
    if (
      digits.length === 2 ||
      (digits.length === 1 && Number(digits) > firstDigitLimit)
    ) {
      minutesRef.current?.focus();
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setMinuteText(readSegmentDigits(e.target));
  };

  const handlePeriodClick = (p: Period): void => {
    setPeriod(p);
    commit(hourText, minuteText, p);
  };

  const segmentClasses =
    "h-full w-11 md:w-[2.5ch] bg-transparent text-center text-sm tabular-nums text-gray-900 dark:text-gray-100 focus:outline-none rounded-sm focus:bg-indigo-500/15 disabled:cursor-not-allowed";

  return (
    <TextField
      label={label}
      hint={hint}
      inputId={`${fieldId}-hours`}
      className={wrapperClassName}
    >
      <div
        ref={containerRef}
        onBlur={handleBlur}
        className={`inline-flex items-center gap-2 ${disabled ? "opacity-60" : ""}`}
      >
        <div
          className="flex items-center rounded-md border border-gray-200 bg-white px-0.5 md:px-2.5 h-11 md:h-8 shadow-sm transition-colors hover:border-gray-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/25 dark:bg-white/[0.03] dark:border-white/10 dark:hover:border-white/20 dark:focus-within:border-indigo-500"
        >
          <input
            id={`${fieldId}-hours`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={t("Часы")}
            className={segmentClasses}
            value={hourText}
            enterKeyHint="next"
            onChange={handleHourChange}
            onKeyDown={handleKeyDown("hour")}
            onFocus={selectOnFocus}
            disabled={disabled}
          />
          <span className="text-sm text-gray-400 select-none">:</span>
          <input
            ref={minutesRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label={t("Минуты")}
            className={segmentClasses}
            value={minuteText}
            enterKeyHint="done"
            onChange={handleMinuteChange}
            onKeyDown={handleKeyDown("minute")}
            onFocus={selectOnFocus}
            disabled={disabled}
          />
        </div>

        {uses12Hour && (
          <div
            role="group"
            className="flex h-11 md:h-8 items-center rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-white/10 dark:bg-white/[0.03]"
          >
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodClick(p)}
                disabled={disabled}
                aria-pressed={period === p}
                className={`h-full min-w-11 md:min-w-0 rounded px-2 text-sm md:text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  period === p
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        )}
      </div>
    </TextField>
  );
};

export default TimeInput;
