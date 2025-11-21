import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import MobilePanel from "./MobilePanel";
import { Input, TextField } from "./Input";
import { Button } from "./Button";
import Overlay from "./Overlay";
import "./DatePicker.css";

export type DatePickerMode = "single" | "range" | "datetime";
export type DatePickerVariant = "default" | "compact";

export interface DatePickerProps {
  mode?: DatePickerMode;
  selected?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  labelClassName?: string;
  inputClassName?: string;
  onChange?: (date: Date | null | [Date | null, Date | null]) => void;
  onRangeChange?: (dates: [Date | null, Date | null]) => void;
  onSingleChange?: (date: Date | null) => void;
  onApply?: (value: Date | null | [Date | null, Date | null]) => void;
  onCancel?: () => void;
  label?: string;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  wrapperClassName?: string;
  showTimeSelect?: boolean;
  timeFormat?: string;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  inline?: boolean;
  id?: string;
  name?: string;
  showActionButtons?: boolean;
  applyLabel?: string;
  cancelLabel?: string;
  variant?: DatePickerVariant;
}

const WEEK_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const TIME_STEP_MINUTES = 30;
const DEFAULT_DATE_FORMAT = "dd.MM.yyyy";
const DEFAULT_TIME_FORMAT = "HH:mm";
const RANGE_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
});
const RANGE_DATE_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const padValue = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

const formatWithTokens = (date: Date, format: string) =>
  format
    .replace(/yyyy/g, date.getFullYear().toString())
    .replace(/MM/g, padValue(date.getMonth() + 1))
    .replace(/dd/g, padValue(date.getDate()))
    .replace(/HH/g, padValue(date.getHours()))
    .replace(/mm/g, padValue(date.getMinutes()));

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isBeforeDay = (a: Date, b: Date) =>
  startOfDay(a).getTime() < startOfDay(b).getTime();
const isAfterDay = (a: Date, b: Date) =>
  startOfDay(a).getTime() > startOfDay(b).getTime();

const isWithinRange = (date: Date, start?: Date | null, end?: Date | null) => {
  if (!start || !end) {
    return false;
  }

  const from = startOfDay(start);
  const to = startOfDay(end);
  const target = startOfDay(date);

  if (from.getTime() <= to.getTime()) {
    return (
      target.getTime() >= from.getTime() && target.getTime() <= to.getTime()
    );
  }

  return target.getTime() >= to.getTime() && target.getTime() <= from.getTime();
};

const addMonths = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const getCalendarStart = (viewDate: Date) => {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const weekday = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - weekday);
  return start;
};

const buildCalendarDays = (viewDate: Date) => {
  const start = getCalendarStart(viewDate);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const formatMonthTitle = (date: Date) => {
  const raw = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const generateTimeOptions = (format: string) => {
  const options = [] as { value: number; label: string }[];
  for (let minutes = 0; minutes < 24 * 60; minutes += TIME_STEP_MINUTES) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const date = new Date();
    date.setHours(hours, mins, 0, 0);
    options.push({ value: minutes, label: formatWithTokens(date, format) });
  }
  return options;
};

const combineDateAndMinutes = (
  datePart: Date,
  minutes: number | null,
  withTime: boolean
) => {
  const base = new Date(datePart);
  if (!withTime) {
    return base;
  }
  if (minutes === null) {
    return null;
  }
  base.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return base;
};

const formatDateValue = (
  date: Date | null,
  includeTime: boolean,
  dateFormat: string,
  timeFormat: string
) => {
  if (!date) {
    return "";
  }

  const base = formatWithTokens(date, dateFormat);
  if (!includeTime) {
    return base;
  }

  return `${base} ${formatWithTokens(date, timeFormat)}`;
};

const formatRangePart = (date: Date, includeYear: boolean) =>
  (includeYear ? RANGE_DATE_WITH_YEAR_FORMATTER : RANGE_DATE_FORMATTER).format(
    date
  );

const formatRangeDisplayValue = (
  start: Date | null,
  end: Date | null
): string => {
  if (start && end) {
    const includeYear = start.getFullYear() !== end.getFullYear();
    return `${formatRangePart(start, includeYear)} - ${formatRangePart(
      end,
      includeYear
    )}`;
  }

  if (start) {
    return `${formatRangePart(start, true)} -`;
  }

  if (end) {
    return `- ${formatRangePart(end, true)}`;
  }

  return "";
};

const resolveInitialViewDate = (
  single: Date | null,
  rangeStart: Date | null,
  rangeEnd: Date | null
) => startOfDay(single ?? rangeStart ?? rangeEnd ?? new Date());

interface TriggerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  displayValue: string;
  inputClasses: string;
  isInvalid?: boolean;
}

const DatePickerTriggerInput = forwardRef<HTMLInputElement, TriggerInputProps>(
  (props, ref) => {
    const {
      displayValue,
      inputClasses,
      isInvalid,
      placeholder,
      disabled,
      onClick,
      onKeyDown,
      value: _ignored,
      ...rest
    } = props;

    void _ignored;

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={inputClasses}
        isInvalid={isInvalid}
      />
    );
  }
);

DatePickerTriggerInput.displayName = "DatePickerTriggerInput";

const DatePicker: React.FC<DatePickerProps> = ({
  mode = "single",
  selected,
  startDate,
  endDate,
  onChange,
  onRangeChange,
  onSingleChange,
  onApply,
  onCancel,
  label,
  labelClassName = "",
  error,
  placeholder = "Выберите дату",
  disabled = false,
  required = false,
  className = "",
  inputClassName = "",
  wrapperClassName = "",
  showTimeSelect = false,
  inline: forceInline = false,
  id,
  name,
  showActionButtons = true,
  applyLabel = "Применить",
  cancelLabel = "Отмена",
  timeFormat = DEFAULT_TIME_FORMAT,
  dateFormat = DEFAULT_DATE_FORMAT,
  minDate,
  maxDate,
  variant = "default",
}) => {
  const showTimePicker = mode === "datetime" || showTimeSelect;
  const useDraftWorkflow = showActionButtons;

  const initialSingleValue = selected ?? null;
  const initialRangeStartValue = startDate ?? null;
  const initialRangeEndValue = endDate ?? null;

  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(false);
  const triggerWrapperRef = useRef<HTMLDivElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);

  const [internalSingleDate, setInternalSingleDate] = useState<Date | null>(
    initialSingleValue
  );
  const [internalRangeDates, setInternalRangeDates] = useState<
    [Date | null, Date | null]
  >([initialRangeStartValue, initialRangeEndValue]);

  const [viewDate, setViewDate] = useState<Date>(() =>
    resolveInitialViewDate(
      initialSingleValue,
      initialRangeStartValue,
      initialRangeEndValue
    )
  );

  const isSingleControlled = selected !== undefined;
  const isRangeControlled = startDate !== undefined || endDate !== undefined;

  useEffect(() => {
    if (selected !== undefined) {
      setInternalSingleDate(selected ?? null);
    }
  }, [selected]);

  useEffect(() => {
    if (startDate !== undefined || endDate !== undefined) {
      setInternalRangeDates([startDate ?? null, endDate ?? null]);
    }
  }, [startDate, endDate]);

  const committedSingleDate = isSingleControlled
    ? selected ?? null
    : internalSingleDate;
  const [committedRangeStart, committedRangeEnd] = isRangeControlled
    ? [startDate ?? null, endDate ?? null]
    : internalRangeDates;

  useEffect(() => {
    const focusCandidate =
      mode === "range"
        ? committedRangeStart ?? committedRangeEnd ?? committedSingleDate
        : committedSingleDate;
    if (focusCandidate) {
      setViewDate((prev) => {
        if (
          prev.getFullYear() === focusCandidate.getFullYear() &&
          prev.getMonth() === focusCandidate.getMonth()
        ) {
          return prev;
        }
        return startOfDay(focusCandidate);
      });
    }
  }, [mode, committedRangeStart, committedRangeEnd, committedSingleDate]);

  const [draftRangeDates, setDraftRangeDates] = useState<
    [Date | null, Date | null]
  >([committedRangeStart, committedRangeEnd]);
  const [draftSingleDatePart, setDraftSingleDatePart] = useState<Date | null>(
    committedSingleDate ? startOfDay(committedSingleDate) : null
  );
  const [draftTimeValue, setDraftTimeValue] = useState<number | null>(
    showTimePicker && committedSingleDate
      ? committedSingleDate.getHours() * 60 + committedSingleDate.getMinutes()
      : null
  );
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    setDraftRangeDates([committedRangeStart, committedRangeEnd]);
  }, [committedRangeStart, committedRangeEnd]);

  useEffect(() => {
    setDraftSingleDatePart(
      committedSingleDate ? startOfDay(committedSingleDate) : null
    );
    if (showTimePicker && committedSingleDate) {
      setDraftTimeValue(
        committedSingleDate.getHours() * 60 + committedSingleDate.getMinutes()
      );
    }
    if (!showTimePicker) {
      setDraftTimeValue(null);
    }
  }, [committedSingleDate, showTimePicker]);

  const [draftRangeStart, draftRangeEnd] = draftRangeDates;

  const draftSingleDate = useMemo(() => {
    if (!draftSingleDatePart) {
      return null;
    }
    return combineDateAndMinutes(
      draftSingleDatePart,
      showTimePicker ? draftTimeValue : 0,
      showTimePicker
    );
  }, [draftSingleDatePart, draftTimeValue, showTimePicker]);

  const activeSingleDate = useDraftWorkflow
    ? draftSingleDate
    : committedSingleDate ?? null;
  const activeSingleDatePart = useDraftWorkflow
    ? draftSingleDatePart
    : committedSingleDate
    ? startOfDay(committedSingleDate)
    : null;

  const activeRangeStart = useDraftWorkflow
    ? draftRangeStart
    : committedRangeStart;
  const activeRangeEnd = useDraftWorkflow ? draftRangeEnd : committedRangeEnd;

  const minDateStart = minDate ? startOfDay(minDate) : undefined;
  const maxDateStart = maxDate ? startOfDay(maxDate) : undefined;

  const isCompactVariant = variant === "compact";

  const interactionClasses = disabled
    ? "cursor-not-allowed opacity-60"
    : "cursor-pointer";
  const inputClasses = [
    "font-medium",
    interactionClasses,
    className,
    inputClassName,
    isCompactVariant ? "hp-datepicker__trigger--compact !w-auto min-w-[140px] pl-10" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const containerClassName = [
    "hp-datepicker",
    isCompactVariant ? "hp-datepicker--compact" : "",
    wrapperClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const shouldWrapLabel =
    Boolean(label) && (Boolean(labelClassName) || isCompactVariant);
  const resolvedLabel =
    shouldWrapLabel && label ? (
      <span
        className={[
          labelClassName,
          isCompactVariant ? "hp-datepicker__label--compact" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </span>
    ) : (
      label
    );

  const closeOverlays = useCallback(() => {
    setIsMobilePanelOpen(false);
    setIsDesktopPanelOpen(false);
  }, []);

  const emitSingleChange = useCallback(
    (date: Date | null) => {
      if (!isSingleControlled) {
        setInternalSingleDate(date ?? null);
      }

      onSingleChange?.(date ?? null);
      onChange?.(date ?? null);
    },
    [isSingleControlled, onSingleChange, onChange]
  );

  const emitRangeChange = useCallback(
    (range: [Date | null, Date | null]) => {
      if (!isRangeControlled) {
        setInternalRangeDates(range);
      }

      onRangeChange?.(range);
      onChange?.(range);
    },
    [isRangeControlled, onRangeChange, onChange]
  );

  const handleCancelAction = useCallback(() => {
    setDraftRangeDates([committedRangeStart, committedRangeEnd]);
    setDraftSingleDatePart(
      committedSingleDate ? startOfDay(committedSingleDate) : null
    );
    if (showTimePicker && committedSingleDate) {
      setDraftTimeValue(
        committedSingleDate.getHours() * 60 + committedSingleDate.getMinutes()
      );
    } else if (!showTimePicker) {
      setDraftTimeValue(null);
    }
    setHoveredDate(null);
    onCancel?.();
    if (!forceInline) {
      closeOverlays();
    }
  }, [
    committedRangeStart,
    committedRangeEnd,
    committedSingleDate,
    showTimePicker,
    onCancel,
    forceInline,
    closeOverlays,
  ]);

  const handleApplyAction = useCallback(() => {
    if (mode === "range") {
      if (draftRangeStart && draftRangeEnd) {
        const nextRange: [Date, Date] = [draftRangeStart, draftRangeEnd];
        emitRangeChange(nextRange);
        onApply?.(nextRange);
        if (!forceInline) {
          closeOverlays();
        }
      }
      return;
    }

    if (!draftSingleDatePart) {
      return;
    }

    const combinedValue = combineDateAndMinutes(
      draftSingleDatePart,
      showTimePicker ? draftTimeValue : 0,
      showTimePicker
    );

    if (!combinedValue) {
      return;
    }

    emitSingleChange(combinedValue);
    onApply?.(combinedValue);
    if (!forceInline) {
      closeOverlays();
    }
  }, [
    mode,
    draftRangeStart,
    draftRangeEnd,
    emitRangeChange,
    onApply,
    forceInline,
    closeOverlays,
    draftSingleDatePart,
    draftTimeValue,
    emitSingleChange,
    showTimePicker,
  ]);

  const isApplyDisabled = useMemo(() => {
    if (!showActionButtons) {
      return false;
    }
    if (mode === "range") {
      return !(draftRangeStart && draftRangeEnd);
    }
    if (showTimePicker) {
      return !(draftSingleDatePart && draftTimeValue !== null);
    }
    return !draftSingleDatePart;
  }, [
    showActionButtons,
    mode,
    draftRangeStart,
    draftRangeEnd,
    draftSingleDatePart,
    draftTimeValue,
    showTimePicker,
  ]);

  const isDateDisabled = useCallback(
    (day: Date) => {
      if (minDateStart && isBeforeDay(day, minDateStart)) {
        return true;
      }
      if (maxDateStart && isAfterDay(day, maxDateStart)) {
        return true;
      }
      return false;
    },
    [minDateStart, maxDateStart]
  );

  const handleRangeSelection = useCallback(
    (day: Date) => {
      const normalizedDay = startOfDay(day);
      if (!draftRangeStart || (draftRangeStart && draftRangeEnd)) {
        setDraftRangeDates([normalizedDay, null]);
        setHoveredDate(null);
        return;
      }

      if (isBeforeDay(normalizedDay, draftRangeStart)) {
        setDraftRangeDates([normalizedDay, null]);
        setHoveredDate(null);
        return;
      }

      const nextRange: [Date, Date] = [draftRangeStart, normalizedDay];
      setDraftRangeDates(nextRange);
      setHoveredDate(null);

      if (!useDraftWorkflow) {
        emitRangeChange(nextRange);
        if (!forceInline) {
          closeOverlays();
        }
      }
    },
    [
      draftRangeStart,
      draftRangeEnd,
      useDraftWorkflow,
      emitRangeChange,
      forceInline,
      closeOverlays,
    ]
  );

  const handleSingleSelection = useCallback(
    (day: Date) => {
      const normalizedDay = startOfDay(day);
      setDraftSingleDatePart(normalizedDay);

      if (!useDraftWorkflow && !showTimePicker) {
        emitSingleChange(normalizedDay);
        if (!forceInline) {
          closeOverlays();
        }
      }
    },
    [
      useDraftWorkflow,
      showTimePicker,
      emitSingleChange,
      forceInline,
      closeOverlays,
    ]
  );

  const handleDaySelect = useCallback(
    (day: Date) => {
      if (disabled || isDateDisabled(day)) {
        return;
      }

      if (mode === "range") {
        handleRangeSelection(day);
      } else {
        handleSingleSelection(day);
      }
    },
    [
      disabled,
      isDateDisabled,
      mode,
      handleRangeSelection,
      handleSingleSelection,
    ]
  );

  const handleTimeSelect = useCallback(
    (value: number) => {
      if (!draftSingleDatePart || disabled) {
        return;
      }

      setDraftTimeValue(value);

      if (!useDraftWorkflow) {
        const combined = combineDateAndMinutes(
          draftSingleDatePart,
          value,
          true
        );
        emitSingleChange(combined);
        if (!forceInline) {
          closeOverlays();
        }
      }
    },
    [
      draftSingleDatePart,
      disabled,
      useDraftWorkflow,
      emitSingleChange,
      forceInline,
      closeOverlays,
    ]
  );

  const handleInputClick = () => {
    if (!disabled) {
      setIsMobilePanelOpen(true);
    }
  };

  const handleDesktopTriggerClick = () => {
    if (disabled) {
      return;
    }
    setIsDesktopPanelOpen((prev) => !prev);
  };

  const handleDesktopTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (disabled) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsDesktopPanelOpen((prev) => !prev);
    }
    if (event.key === "Escape") {
      setIsDesktopPanelOpen(false);
    }
  };

  useEffect(() => {
    if (!isDesktopPanelOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        desktopPanelRef.current &&
        triggerWrapperRef.current &&
        !desktopPanelRef.current.contains(target) &&
        !triggerWrapperRef.current.contains(target)
      ) {
        setIsDesktopPanelOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDesktopPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDesktopPanelOpen]);

  const handleMonthChange = useCallback((offset: number) => {
    setViewDate((prev) => addMonths(prev, offset));
  }, []);

  const calendarDays = useMemo(() => buildCalendarDays(viewDate), [viewDate]);
  const timeOptions = useMemo(
    () => generateTimeOptions(timeFormat),
    [timeFormat]
  );

  const rangePreviewEnd = useMemo(() => {
    if (
      mode !== "range" ||
      !useDraftWorkflow ||
      !draftRangeStart ||
      draftRangeEnd ||
      !hoveredDate
    ) {
      return null;
    }

    if (
      isAfterDay(hoveredDate, draftRangeStart) ||
      isSameDay(hoveredDate, draftRangeStart)
    ) {
      return hoveredDate;
    }

    return null;
  }, [mode, useDraftWorkflow, draftRangeStart, draftRangeEnd, hoveredDate]);

  const effectiveRangeEnd = activeRangeEnd ?? rangePreviewEnd;

  const today = useMemo(() => startOfDay(new Date()), []);

  const displayValue = useMemo(() => {
    if (mode === "range") {
      return formatRangeDisplayValue(activeRangeStart, activeRangeEnd);
    }

    if (activeSingleDate) {
      return formatDateValue(
        activeSingleDate,
        showTimePicker,
        dateFormat,
        timeFormat
      );
    }

    if (showTimePicker && activeSingleDatePart) {
      return formatWithTokens(activeSingleDatePart, dateFormat);
    }

    return "";
  }, [
    mode,
    activeRangeStart,
    activeRangeEnd,
    activeSingleDate,
    activeSingleDatePart,
    showTimePicker,
    dateFormat,
    timeFormat,
  ]);

  const activeTimeValue = useDraftWorkflow
    ? draftTimeValue
    : showTimePicker && committedSingleDate
    ? committedSingleDate.getHours() * 60 + committedSingleDate.getMinutes()
    : null;

  const isTimeDisabled = showTimePicker && !draftSingleDatePart;

  const renderActionButtons = () => {
    if (!showActionButtons) {
      return null;
    }

    return (
      <>
        <div className="hidden md:flex justify-end space-x-4 mt-6 pt-6">
          <Button
            type="button"
            variant="ghost"
            label={cancelLabel}
            onClick={handleCancelAction}
          />
          <Button
            type="button"
            variant="primary"
            label={applyLabel}
            onClick={handleApplyAction}
            disabled={isApplyDisabled}
          />
        </div>
        <div className="flex flex-col md:hidden px-6 space-y-3 mt-6">
          <Button
            type="button"
            variant="primary"
            size="large"
            label={applyLabel}
            onClick={handleApplyAction}
            disabled={isApplyDisabled}
            className="w-full"
          />
          <Button
            type="button"
            variant="ghost"
            label={cancelLabel}
            onClick={handleCancelAction}
            className="w-full"
          />
        </div>
      </>
    );
  };

  const renderCalendarSection = () => (
    <div className="hp-datepicker__date-section">
      <div className="hp-datepicker__month-header">
        <button
          type="button"
          className="hp-datepicker__nav-button cursor-pointer"
          onClick={() => handleMonthChange(-1)}
          aria-label="Предыдущий месяц"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="hp-datepicker__month-title">
          {formatMonthTitle(viewDate)}
        </div>
        <button
          type="button"
          className="hp-datepicker__nav-button cursor-pointer"
          onClick={() => handleMonthChange(1)}
          aria-label="Следующий месяц"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="hp-datepicker__week-row">
        {WEEK_DAYS.map((day) => (
          <span key={day} className="hp-datepicker__weekday">
            {day}
          </span>
        ))}
      </div>
      <div className="hp-datepicker__grid">
        {calendarDays.map((day) => {
          const normalizedDay = startOfDay(day);
          const isCurrentMonth = day.getMonth() === viewDate.getMonth();
          const disabledDay = isDateDisabled(normalizedDay);
          const isSelectedSingle =
            mode !== "range" &&
            activeSingleDatePart &&
            isSameDay(normalizedDay, activeSingleDatePart);
          const isRangeStartDay =
            mode === "range" &&
            activeRangeStart &&
            isSameDay(normalizedDay, activeRangeStart);
          const isRangeEndDay =
            mode === "range" &&
            effectiveRangeEnd &&
            isSameDay(normalizedDay, effectiveRangeEnd);
          const isInRangeHighlight =
            mode === "range" && activeRangeStart && effectiveRangeEnd
              ? isWithinRange(
                  normalizedDay,
                  activeRangeStart,
                  effectiveRangeEnd
                )
              : false;
          const isToday = isSameDay(normalizedDay, today);

          const dayClasses = [
            "hp-datepicker__day",
            "cursor-pointer",
            !isCurrentMonth ? "hp-datepicker__day--muted" : "",
            disabledDay ? "hp-datepicker__day--disabled" : "",
            isToday ? "hp-datepicker__day--today" : "",
            isSelectedSingle ? "hp-datepicker__day--selected" : "",
            isInRangeHighlight ? "hp-datepicker__day--in-range" : "",
            isRangeStartDay ? "hp-datepicker__day--range-start" : "",
            isRangeEndDay ? "hp-datepicker__day--range-end" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              type="button"
              key={normalizedDay.getTime()}
              className={dayClasses}
              disabled={disabledDay}
              onClick={() => handleDaySelect(normalizedDay)}
              onMouseEnter={() => {
                if (
                  mode === "range" &&
                  draftRangeStart &&
                  !draftRangeEnd &&
                  !disabledDay
                ) {
                  setHoveredDate(normalizedDay);
                }
              }}
              onMouseLeave={() => {
                if (mode === "range") {
                  setHoveredDate(null);
                }
              }}
            >
              {normalizedDay.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTimeSection = () => {
    if (!showTimePicker) {
      return null;
    }

    return (
      <div className="hp-datepicker__time-section">
        <p className="hp-datepicker__time-title">Время</p>
        <div className="hp-datepicker__time-list">
          {timeOptions.map((option) => {
            const isSelected = activeTimeValue === option.value;
            return (
              <button
                type="button"
                key={option.value}
                className={`hp-datepicker__time-item cursor-pointer${
                  isSelected ? " hp-datepicker__time-item--selected" : ""
                }`}
                disabled={isTimeDisabled}
                onClick={() => handleTimeSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPickerSurface = (hideBackground = false) => (
    <div
      className={`hp-datepicker__panel ${
        hideBackground ? "!bg-transparent" : ""
      }`}
    >
      <div
        className={
          showTimePicker
            ? "hp-datepicker__calendar"
            : "hp-datepicker__calendar hp-datepicker__calendar--single"
        }
      >
        {renderCalendarSection()}
        {renderTimeSection()}
      </div>
      {renderActionButtons()}
    </div>
  );

  const renderDesktopTrigger = () => (
    <div className="relative" ref={triggerWrapperRef}>
      {isCompactVariant && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <CalendarDaysIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <DatePickerTriggerInput
        id={id}
        name={name}
        displayValue={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onClick={handleDesktopTriggerClick}
        onKeyDown={handleDesktopTriggerKeyDown}
        inputClasses={inputClasses}
        isInvalid={Boolean(error)}
      />
      <Overlay
        isOpen={isDesktopPanelOpen}
        anchorRef={triggerWrapperRef}
        widthClass="w-auto"
        offset={12}
        className="hp-datepicker__overlay max-w-[calc(100vw-2rem)]"
      >
        <div ref={desktopPanelRef}>{renderPickerSurface()}</div>
      </Overlay>
    </div>
  );

  const renderInlinePicker = () => renderPickerSurface();

  return (
    <TextField
      className={containerClassName}
      label={resolvedLabel}
      error={error}
      required={required}
      inputId={id}
    >
      {forceInline ? (
        renderInlinePicker()
      ) : (
        <>
          <div className="hidden md:block">{renderDesktopTrigger()}</div>

          <div className="md:hidden">
            <DatePickerTriggerInput
              id={id ? `${id}-mobile-trigger` : undefined}
              name={name}
              displayValue={displayValue}
              placeholder={placeholder}
              disabled={disabled}
              onClick={handleInputClick}
              inputClasses={inputClasses}
              isInvalid={Boolean(error)}
            />
          </div>

          <MobilePanel
            isOpen={isMobilePanelOpen}
            onClose={() => setIsMobilePanelOpen(false)}
            title={label || "Выбор даты"}
          >
            {renderPickerSurface(true)}
          </MobilePanel>
        </>
      )}
    </TextField>
  );
};

export default DatePicker;
