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
import { Input } from "./Input";
import RadioButton from "./RadioButton";
import ToggleSwitch from "./ToggleSwitch";

// --- Типы и константы ---
type Period = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
const periods: SelectOption[] = [
  { value: "DAILY", label: "День" },
  { value: "WEEKLY", label: "Неделя" },
  { value: "MONTHLY", label: "Месяц" },
  { value: "YEARLY", label: "Год" },
];

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

// --- Основной компонент ---
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

  // Синхронизация локального состояния с currentRule (без вызова onRuleChange)
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

  // 2. Модифицируем updateState для опционального вызова onRuleChange
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
    updateState(updates, true); // Always trigger rule change when due date changes
  }, [dueDate, state.freq, updateState]);

  // Initialize the rule on mount or when currentRule is not set
  useEffect(() => {
    if (!currentRule) {
      const initialRule = generateRuleFromState(state);
      onRuleChange(initialRule);
    }
  }, []); // Only run once on mount

  // Generate RRULE string when state changes
  const handleWeekdayToggle = useCallback(
    (day: string) => {
      // Cannot unselect the day that matches the due date
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

  // 5. handleFreqChange вызывает updateState с флагом
  const handleFreqChange = (v: string | null) => {
    if (!v) return;
    const newFreq = v as Period;
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
    <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4 space-y-4">
      {/* Повторение всегда включено когда компонент отображается */}
      <div className="space-y-6">
        {/* Interval and Frequency */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="dark:text-white">Повторять каждые</span>
          <Input
            type="number"
            value={state.interval}
            onChange={(e) =>
              updateState(
                {
                  interval: Math.max(1, parseInt(e.target.value, 10) || 1),
                },
                true
              )
            }
            className="py-2"
            disabled={isSubmitting}
          />
          <Select
            options={periods}
            value={state.freq}
            onChange={handleFreqChange}
            disabled={isSubmitting}
          />
        </div>

        {/* Weekday selector */}
        {state.freq === "WEEKLY" && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Дни недели
            </label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  onClick={() => handleWeekdayToggle(day.value)}
                  disabled={day.value === dueDateWeekday || isSubmitting}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    state.byday.includes(day.value)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-600"
                  } ${
                    day.value === dueDateWeekday
                      ? "opacity-70 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly options */}
        {state.freq === "MONTHLY" && (
          <div className="flex items-center gap-3 flex-wrap">
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
            <span className="text-sm text-gray-800 dark:text-gray-200">
              Только в{" "}
            </span>
            <Select
              options={nthWeekOptions}
              value={String(state.bysetpos)}
              onChange={(v) => updateState({ bysetpos: Number(v) }, true)}
              disabled={isSubmitting || state.monthday_type !== "BYSETPOS"}
            />
            <Select
              options={weekDayOptions}
              value={state.byday_pos}
              onChange={(v) => updateState({ byday_pos: v as string }, true)}
              disabled={isSubmitting || state.monthday_type !== "BYSETPOS"}
            />
          </div>
        )}

        {/* End condition */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Завершение
          </label>
          <div className="space-y-3">
            <RadioButton
              id="end_never"
              name="end_type"
              value="NEVER"
              checked={state.end_type === "NEVER"}
              onChange={() => updateState({ end_type: "NEVER" }, true)}
              label="Никогда"
            />
            <RadioButton
              id="end_until"
              name="end_type"
              value="UNTIL"
              checked={state.end_type === "UNTIL"}
              onChange={() => updateState({ end_type: "UNTIL" }, true)}
              label={
                <div className="flex items-center gap-2 flex-wrap">
                  <span>До даты:</span>
                  <DatePicker
                    mode="single"
                    selected={state.until}
                    onSingleChange={(date) =>
                      updateState({ until: date }, true)
                    }
                    dateFormat="yyyy-MM-dd"
                    className="w-40"
                    disabled={state.end_type !== "UNTIL" || isSubmitting}
                    inline={false}
                  />
                </div>
              }
            />
            <RadioButton
              id="end_count"
              name="end_type"
              value="COUNT"
              checked={state.end_type === "COUNT"}
              onChange={() => updateState({ end_type: "COUNT" }, true)}
              label={
                <div className="flex items-center gap-2">
                  <span>После</span>
                  <Input
                    type="number"
                    value={state.count}
                    onChange={(e) =>
                      updateState(
                        {
                          count: Math.max(1, parseInt(e.target.value, 10) || 1),
                        },
                        true
                      )
                    }
                    className="py-2"
                    disabled={state.end_type !== "COUNT" || isSubmitting}
                  />
                  <span>повторений</span>
                </div>
              }
            />
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
          <span className="font-semibold">Сводка:</span> {summary}
        </div>
      </div>
    </div>
  );
};

export default PaymentRecurrenceSection;
