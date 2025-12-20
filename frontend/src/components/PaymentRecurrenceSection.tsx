import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import DatePicker from "./DatePicker";
import { PaymentFormInputs } from "./PaymentForm";
import Select, { SelectOption } from "./Select";
import { NumberField } from "./Input";
import ToggleSwitch from "./ToggleSwitch";
import SegmentedControl, { SegmentedControlOption } from "./SegmentedControl";
import { CalendarIcon, HashtagIcon } from "@heroicons/react/24/outline";

// --- Типы и константы ---
type Period = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

const weekDays = [
  { value: "MO", label: "Пн" },
  { value: "TU", label: "Вт" },
  { value: "WE", label: "Ср" },
  { value: "TH", label: "Чт" },
  { value: "FR", label: "Пт" },
  { value: "SA", label: "Сб" },
  { value: "SU", label: "Вс" },
];

const weekDayOptions: SelectOption[] = [
  { value: "MO", label: "Понедельник" },
  { value: "TU", label: "Вторник" },
  { value: "WE", label: "Среда" },
  { value: "TH", label: "Четверг" },
  { value: "FR", label: "Пятница" },
  { value: "SA", label: "Суббота" },
  { value: "SU", label: "Воскресенье" },
];

const nthWeekOptions: SelectOption[] = [
  { value: "1", label: "Первый" },
  { value: "2", label: "Второй" },
  { value: "3", label: "Третий" },
  { value: "4", label: "Четвертый" },
  { value: "-1", label: "Последний" },
];

const endTypeOptions: SegmentedControlOption<"NEVER" | "UNTIL" | "COUNT">[] = [
  { value: "NEVER", label: "Бессрочно" },
  { value: "UNTIL", label: "До даты" },
  { value: "COUNT", label: "Кол-во раз" },
];

const frequencyOptions: SegmentedControlOption<Period>[] = [
  { value: "DAILY", label: "День" },
  { value: "WEEKLY", label: "Неделя" },
  { value: "MONTHLY", label: "Месяц" },
  { value: "YEARLY", label: "Год" },
];

interface RecurrenceState {
  interval: number;
  freq: Period;
  byday: string[]; // e.g., ['MO', 'WE']
  monthday_type: "BYMONTHDAY" | "BYSETPOS";
  bymonthday: number;
  bysetpos: number;
  byday_pos: string; // e.g., 'MO' for the Nth Monday
  end_type: "NEVER" | "UNTIL" | "COUNT";
  until: Date | null;
  count: number;
}

interface PaymentRecurrenceSectionProps {
  onRuleChange: (rule: string | null) => void;
  isSubmitting: boolean;
  currentRule?: PaymentFormInputs["recurrenceRule"];
  dueDate?: PaymentFormInputs["dueDate"];
  // Компонент всегда показывает настройки повторения без переключателя
}

const weekdayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Function to parse RRULE string into state
const parseRrule = (
  rrule: string | null | undefined
): Partial<RecurrenceState> => {
  if (!rrule) return {};
  const state: Partial<RecurrenceState> = {};
  const bydayValues: string[] = [];

  rrule.split(";").forEach((part) => {
    const [key, value] = part.split("=");
    switch (key) {
      case "FREQ": {
        // Map old values to new ones for backward compatibility
        let mappedFreq = value;
        if (value === "DAY") mappedFreq = "DAILY";
        else if (value === "WEEK") mappedFreq = "WEEKLY";
        else if (value === "MONTH") mappedFreq = "MONTHLY";
        else if (value === "YEAR") mappedFreq = "YEARLY";
        state.freq = mappedFreq as Period;
        break;
      }
      case "INTERVAL":
        state.interval = parseInt(value, 10);
        break;
      case "BYDAY":
        bydayValues.push(...value.split(","));
        break;
      case "BYMONTHDAY":
        state.monthday_type = "BYMONTHDAY";
        state.bymonthday = parseInt(value, 10);
        break;
      case "BYSETPOS":
        state.monthday_type = "BYSETPOS";
        state.bysetpos = parseInt(value, 10);
        break;
      case "UNTIL": {
        // Move variable declarations outside the case block
        const untilValue = value;
        const year = untilValue.substring(0, 4);
        const month = untilValue.substring(4, 6);
        const day = untilValue.substring(6, 8);
        state.end_type = "UNTIL";
        state.until = new Date(`${year}-${month}-${day}T12:00:00Z`); // Use midday to avoid timezone issues
        break;
      }
      case "COUNT":
        state.end_type = "COUNT";
        state.count = parseInt(value, 10);
        break;
    }
  });

  if (state.monthday_type === "BYSETPOS") {
    state.byday_pos = bydayValues[0];
  } else {
    state.byday = bydayValues;
  }

  return state;
};

// 1. Добавляем функцию генерации RRULE
const generateRuleFromState = (state: RecurrenceState): string | null => {
  // Recurrence is always enabled when this component is rendered
  let rule = `FREQ=${state.freq};INTERVAL=${state.interval}`;
  if (state.freq === "WEEKLY" && state.byday.length > 0) {
    rule += `;BYDAY=${state.byday.join(",")}`;
  }
  if (state.freq === "MONTHLY") {
    if (state.monthday_type === "BYMONTHDAY") {
      rule += `;BYMONTHDAY=${state.bymonthday}`;
    } else {
      rule += `;BYDAY=${state.byday_pos};BYSETPOS=${state.bysetpos}`;
    }
  }
  if (state.end_type === "UNTIL" && state.until) {
    const utcDate = new Date(
      Date.UTC(
        state.until.getFullYear(),
        state.until.getMonth(),
        state.until.getDate(),
        23,
        59,
        59
      )
    );
    rule += `;UNTIL=${
      utcDate.toISOString().replace(/[-:.]/g, "").slice(0, -3) + "Z"
    }`;
  }
  if (state.end_type === "COUNT") {
    rule += `;COUNT=${state.count}`;
  }
  return rule;
};

const PaymentRecurrenceSection: React.FC<PaymentRecurrenceSectionProps> = ({
  onRuleChange,
  isSubmitting,
  currentRule,
  dueDate,
}) => {
  const shouldNotifyRef = useRef(false);
  const [state, setState] = useState<RecurrenceState>(() => {
    const parsed = parseRrule(currentRule);
    const initialDayOfMonth = dueDate?.getDate() || new Date().getDate();
    const initialWeekday = dueDate ? weekdayMap[dueDate.getDay()] : "MO";

    return {
      interval: 1,
      freq: "MONTHLY",
      byday: [initialWeekday],
      monthday_type: "BYMONTHDAY",
      bymonthday: initialDayOfMonth,
      bysetpos: 1,
      byday_pos: initialWeekday,
      end_type: "NEVER",
      until: null,
      count: 10,
      ...parsed,
    };
  });

  const dueDateWeekday = useMemo(() => {
    return dueDate ? weekdayMap[dueDate.getDay()] : null;
  }, [dueDate]);

  // Sync local state with currentRule
  useEffect(() => {
    const initialDayOfMonth = dueDate?.getDate() || new Date().getDate();
    const initialWeekday = dueDate ? weekdayMap[dueDate.getDay()] : "MO";
    if (currentRule) {
      const parsed = parseRrule(currentRule);
      setState((prev) => ({
        ...prev,
        interval: 1,
        freq: "MONTHLY",
        byday: [initialWeekday],
        monthday_type: "BYMONTHDAY",
        bymonthday: initialDayOfMonth,
        bysetpos: 1,
        byday_pos: initialWeekday,
        end_type: "NEVER",
        until: null,
        count: 10,
        ...parsed,
      }));
    } else {
      setState({
        interval: 1,
        freq: "MONTHLY",
        byday: [initialWeekday],
        monthday_type: "BYMONTHDAY",
        bymonthday: initialDayOfMonth,
        bysetpos: 1,
        byday_pos: initialWeekday,
        end_type: "NEVER",
        until: null,
        count: 10,
      });
    }
  }, [currentRule, dueDate]);

  const updateState = useCallback(
    (part: Partial<RecurrenceState>, triggerRuleChange = false) => {
      setState((prevState) => {
        const newState = { ...prevState, ...part };
        if (triggerRuleChange) {
          shouldNotifyRef.current = true;
        }
        return newState;
      });
    },
    []
  );

  useEffect(() => {
    if (!shouldNotifyRef.current) return;
    shouldNotifyRef.current = false;
    onRuleChange(generateRuleFromState(state));
  }, [state, onRuleChange]);

  // Sync state with dueDate changes
  useEffect(() => {
    if (!dueDate) return;
    const dayOfMonth = dueDate.getDate();
    const weekday = weekdayMap[dueDate.getDay()];
    const updates: Partial<RecurrenceState> = {
      bymonthday: dayOfMonth,
      byday_pos: weekday,
    };
    if (state.freq === "WEEKLY") {
      updates.byday = [weekday];
    }
    updateState(updates, true);
  }, [dueDate, state.freq, updateState]);

  // Initialize rule on mount
  useEffect(() => {
    if (!currentRule) {
      const initialRule = generateRuleFromState(state);
      onRuleChange(initialRule);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWeekdayToggle = useCallback(
    (day: string) => {
      if (day === dueDateWeekday) return;
      const newByday = state.byday.includes(day)
        ? state.byday.filter((d) => d !== day)
        : [...state.byday, day].sort(
            (a, b) => weekdayMap.indexOf(a) - weekdayMap.indexOf(b)
          );
      updateState({ byday: newByday }, true);
    },
    [state.byday, dueDateWeekday, updateState]
  );

  const summary = useMemo(() => {
    let summaryStr = "Каждые ";
    if (state.interval > 1) {
      summaryStr += `${state.interval} `;
      switch (state.freq) {
        case "DAILY":
          summaryStr += "дня";
          break;
        case "WEEKLY":
          summaryStr += "недели";
          break;
        case "MONTHLY":
          summaryStr += "месяца";
          break;
        case "YEARLY":
          summaryStr += "года";
          break;
      }
    } else {
      switch (state.freq) {
        case "DAILY":
          summaryStr += "день";
          break;
        case "WEEKLY":
          summaryStr += "неделю";
          break;
        case "MONTHLY":
          summaryStr += "месяц";
          break;
        case "YEARLY":
          summaryStr += "год";
          break;
      }
    }

    if (state.freq === "WEEKLY" && state.byday.length > 0) {
      summaryStr += ` по: ${state.byday
        .map((d) => weekDays.find((wd) => wd.value === d)?.label)
        .join(", ")}`;
    }

    if (state.freq === "MONTHLY") {
      if (state.monthday_type === "BYMONTHDAY") {
        summaryStr += `, ${state.bymonthday}-го числа`;
      } else {
        const posLabel = nthWeekOptions
          .find((o) => o.value === String(state.bysetpos))
          ?.label.toLowerCase();
        const dayLabel = weekDayOptions
          .find((o) => o.value === state.byday_pos)
          ?.label.toLowerCase()
          .replace(/а$/, "у")
          .replace(/е$/, "е");
        summaryStr += `, в ${posLabel} ${dayLabel}`;
      }
    }

    if (state.end_type === "UNTIL" && state.until) {
      summaryStr += `, до ${state.until.toLocaleDateString("ru-RU")}`;
    } else if (state.end_type === "COUNT") {
      summaryStr += `, ${state.count} раз`;
    }

    return summaryStr + ".";
  }, [state]);

  // Handle frequency change using SegmentedControl (returns T)
  const handleFreqChange = (newFreq: Period) => {
    const newState: Partial<RecurrenceState> = { freq: newFreq };

    if (newFreq === "WEEKLY") {
      if (dueDateWeekday && !state.byday.includes(dueDateWeekday)) {
        newState.byday = [dueDateWeekday, ...state.byday]
          .filter((d, i, a) => a.indexOf(d) === i)
          .sort((a, b) => weekdayMap.indexOf(a) - weekdayMap.indexOf(b));
      } else if (state.byday.length === 0 && dueDateWeekday) {
        newState.byday = [dueDateWeekday];
      }
    }

    updateState(newState, true);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
      <div className="space-y-8">
        {/* Top Row: Interval and Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-6">
          {/* Interval Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Повторять
            </label>
            <NumberField
              value={state.interval}
              onChange={(e) =>
                updateState(
                  {
                    interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                  },
                  true
                )
              }
              className="w-full font-semibold dark:bg-gray-900"
              wrapperClassName="w-full"
              disabled={isSubmitting}
              min={1}
              suffix={state.interval === 1 ? "раз в" : "раза в"}
            />
          </div>

          {/* Frequency Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              Периодичность
            </label>
            <SegmentedControl
              options={frequencyOptions}
              selected={state.freq}
              onChange={handleFreqChange}
              className="w-full p-1.5 bg-gray-100 dark:bg-gray-900"
              optionClassName="flex-1 justify-center"
            />
          </div>
        </div>

        {/* Weekday Selector */}
        {state.freq === "WEEKLY" && (
          <div className="animate-fade-in-up">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Дни недели
            </label>
            <div className="flex justify-between gap-2 max-w-md">
              {weekDays.map((day) => {
                const isSelected = state.byday.includes(day.value);
                const isDueDate = day.value === dueDateWeekday;
                return (
                  <button
                    type="button"
                    key={day.value}
                    onClick={() => handleWeekdayToggle(day.value)}
                    disabled={isDueDate || isSubmitting}
                    className={`
                      w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 flex items-center justify-center
                      ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
                          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                      }
                      ${
                        isDueDate
                          ? "ring-2 ring-offset-1 ring-indigo-600 dark:ring-offset-gray-800 cursor-not-allowed opacity-90"
                          : "cursor-pointer"
                      }
                    `}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Configuration */}
        {state.freq === "MONTHLY" && (
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                В определенный день недели
              </span>
              <ToggleSwitch
                checked={state.monthday_type === "BYSETPOS"}
                onChange={(checked) =>
                  updateState(
                    { monthday_type: checked ? "BYSETPOS" : "BYMONTHDAY" },
                    true
                  )
                }
                disabled={isSubmitting}
              />
            </div>
            {state.monthday_type === "BYSETPOS" ? (
              <div className="grid grid-cols-2 gap-4">
                <Select
                  options={nthWeekOptions}
                  value={String(state.bysetpos)}
                  onChange={(v) => updateState({ bysetpos: Number(v) }, true)}
                  disabled={isSubmitting}
                  wrapperClassName="w-full"
                />
                <Select
                  options={weekDayOptions}
                  value={state.byday_pos}
                  onChange={(v) =>
                    updateState({ byday_pos: v as string }, true)
                  }
                  disabled={isSubmitting}
                  wrapperClassName="w-full"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <span>
                  Повтор каждое <strong>{state.bymonthday}-е</strong> число
                </span>
              </div>
            )}
          </div>
        )}

        {/* End Condition */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
            Завершение
          </label>
          <div className="flex flex-col gap-4">
            <SegmentedControl
              options={endTypeOptions}
              selected={state.end_type}
              onChange={(v) => updateState({ end_type: v }, true)}
              className="w-full p-1.5 bg-gray-100 dark:bg-gray-900"
              optionClassName="flex-1 justify-center text-sm py-2"
            />
            <div className="min-h-[50px] flex items-center animate-fade-in">
              {state.end_type === "NEVER" && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  Платежи будут создаваться бесконечно
                </p>
              )}
              {state.end_type === "UNTIL" && (
                <div className="w-full max-w-xs">
                  <DatePicker
                    mode="single"
                    selected={state.until}
                    onSingleChange={(date) =>
                      updateState({ until: date }, true)
                    }
                    dateFormat="dd.MM.yyyy"
                    wrapperClassName="w-full"
                    disabled={isSubmitting}
                    inline={false}
                    placeholder="Выберите дату окончания"
                    inputClassName="!bg-white dark:!bg-gray-900"
                  />
                </div>
              )}
              {state.end_type === "COUNT" && (
                <div className="flex items-center gap-3">
                  <NumberField
                    value={state.count}
                    onChange={(e) =>
                      updateState(
                        {
                          count: Math.max(1, parseInt(e.target.value, 10) || 1),
                        },
                        true
                      )
                    }
                    className="w-72"
                    disabled={isSubmitting}
                    min={1}
                    suffix={
                      <>
                        <HashtagIcon className="h-4 w-4 text-gray-400" />
                        <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                          платежей всего
                        </span>
                      </>
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-500/20 flex items-start gap-3">
          <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <span className="block text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide mb-0.5">
              Итоговое правило
            </span>
            <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentRecurrenceSection;
