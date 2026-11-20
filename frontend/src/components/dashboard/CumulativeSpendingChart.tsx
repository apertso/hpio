// src/components/dashboard/CumulativeSpendingChart.tsx
import React, { useMemo, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import type { AnalyticsPayment } from "../../utils/dashboardStats";
import { formatMoney } from "../../utils/currencies";
import { formatDateHour, parseCalendarDate } from "../../utils/dateUtils";

interface CumulativeSpendingChartProps {
  /** Все платежи выбранного периода (выполненные, предстоящие, просроченные) */
  payments: AnalyticsPayment[];
  startDate: Date;
  endDate: Date;
  currency: string;
  /** Клик по точке: ключ даты (YYYY-MM-DD или YYYY-MM-DD HH:00) */
  onSelectDate?: (dateKey: string) => void;
  className?: string;
}

interface Point {
  key: string;
  label: string;
  tooltip: string;
  paid: number | null;
  plan: number;
}

const DAY_MS = 86400000;
const pad = (n: number): string => String(n).padStart(2, "0");
const toDayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// «Красивый» максимум шкалы для круглых подписей оси
const niceCeil = (value: number): number => {
  if (value <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * base >= value) ?? 10;
  return step * base;
};

/**
 * Накопительный график расходов: сплошная линия — сколько уже оплачено к каждому дню,
 * пунктир — сколько к этому дню было запланировано (по срокам платежей).
 * Сразу видно, идёте ли вы быстрее или медленнее плана.
 */
const CumulativeSpendingChart: React.FC<CumulativeSpendingChartProps> = ({
  payments,
  startDate,
  endDate,
  currency,
  onSelectDate,
  className = "",
}) => {
  const { t, locale } = useLanguage();
  const [hovered, setHovered] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);

  const { points, todayIndex, hourly } = useMemo(() => {
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    const isHourly = start.getTime() === end.getTime();
    const now = new Date();
    const active = payments.filter((p) => p.status !== "deleted");

    const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    const dayLong = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" });

    // Ключ корзины для оплаты и для срока
    const paidKey = (p: AnalyticsPayment): string | null => {
      if (p.status !== "completed") return null;
      const d = p.completedAt ? new Date(p.completedAt) : parseCalendarDate(p.dueDate);
      return isHourly ? formatDateHour(d) : toDayKey(d);
    };
    const planKey = (p: AnalyticsPayment): string =>
      isHourly ? `${p.dueDate} 00:00` : p.dueDate;

    const keys: { key: string; label: string; tooltip: string; time: number }[] = [];
    if (isHourly) {
      for (let h = 0; h < 24; h += 1) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h);
        keys.push({ key: formatDateHour(d), label: `${pad(h)}:00`, tooltip: `${dayLong.format(d)}, ${pad(h)}:00`, time: d.getTime() });
      }
    } else {
      for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY_MS)) {
        const day = startOfDay(d);
        keys.push({ key: toDayKey(day), label: dayLabel.format(day).replace(".", ""), tooltip: dayLong.format(day), time: day.getTime() });
      }
    }

    const paidBy = new Map<string, number>();
    const planBy = new Map<string, number>();
    active.forEach((p) => {
      const amount = p.convertedAmount;
      if (amount === null) return;
      const pk = paidKey(p);
      if (pk) paidBy.set(pk, (paidBy.get(pk) ?? 0) + amount);
      const sk = planKey(p);
      planBy.set(sk, (planBy.get(sk) ?? 0) + amount);
    });

    // Сегодняшняя позиция: оплаченная линия не идёт в будущее
    const nowTime = isHourly ? now.getTime() : startOfDay(now).getTime();
    let lastPastIndex = -1;
    keys.forEach((k, i) => {
      if (k.time <= nowTime) lastPastIndex = i;
    });

    let paidSum = 0;
    let planSum = 0;
    const pts: Point[] = keys.map((k, i) => {
      paidSum += paidBy.get(k.key) ?? 0;
      planSum += planBy.get(k.key) ?? 0;
      return {
        key: k.key,
        label: k.label,
        tooltip: k.tooltip,
        paid: i <= lastPastIndex ? paidSum : null,
        plan: planSum,
      };
    });

    return {
      points: pts,
      todayIndex: lastPastIndex >= 0 && lastPastIndex < pts.length - 1 ? lastPastIndex : null,
      hourly: isHourly,
    };
  }, [payments, startDate, endDate, locale]);

  const count = points.length;
  const maxValue = niceCeil(Math.max(0, ...points.map((p) => Math.max(p.plan, p.paid ?? 0))));
  const compact = useMemo(
    () => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }),
    [locale]
  );
  const ticks = [maxValue, maxValue / 2, 0];

  // Координаты в системе 0..1000 по X и 0..100 по Y
  const x = (i: number): number => (count <= 1 ? 500 : (i / (count - 1)) * 1000);
  const y = (v: number): number => 100 - (v / maxValue) * 100;

  const planPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.plan)}`).join(" ");
  const paidPoints = points.map((p, i) => ({ i, v: p.paid })).filter((p) => p.v !== null) as { i: number; v: number }[];
  const paidPath = paidPoints.map((p, k) => `${k === 0 ? "M" : "L"}${x(p.i)} ${y(p.v)}`).join(" ");
  const paidArea =
    paidPoints.length > 0
      ? `${paidPath} L${x(paidPoints[paidPoints.length - 1].i)} 100 L${x(paidPoints[0].i)} 100 Z`
      : "";
  const lastPaid = paidPoints[paidPoints.length - 1];

  // Подписи оси X: не больше ~6
  const step = Math.max(1, Math.ceil(count / 6));
  const xLabels = points
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i % step === 0 || i === count - 1)
    // Предпоследняя подпись слишком близко к последней — убираем, чтобы не наезжали
    .filter(({ i }, k, arr) => !(k === arr.length - 2 && count - 1 - i < step));

  const handleMove = (event: React.MouseEvent<HTMLDivElement>): void => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || count === 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHovered(Math.round(ratio * (count - 1)));
  };

  const hoveredPoint = hovered !== null ? points[hovered] : null;
  const hoverLeft = hovered !== null ? (x(hovered) / 1000) * 100 : 0;
  const tooltipShift = hoverLeft < 20 ? "0%" : hoverLeft > 80 ? "-100%" : "-50%";

  return (
    <div className={`flex flex-col ${className}`.trim()}>
      {/* Легенда */}
      <div className="mb-3 flex items-center justify-end gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-indigo-600 dark:bg-indigo-400" />
          {t("Оплачено")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-gray-400 dark:border-gray-500" />
          {t("План")}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Ось Y */}
        <div className="relative w-12 shrink-0">
          <div className="absolute inset-x-0 top-0 bottom-6">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 -translate-y-1/2 text-[11px] leading-none tabular-nums text-gray-400 dark:text-gray-500"
                style={{ top: `${(1 - tick / maxValue) * 100}%` }}
              >
                {compact.format(tick)}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Область графика */}
          <div
            ref={plotRef}
            className={`absolute inset-x-0 top-0 bottom-6 ${onSelectDate ? "cursor-pointer" : ""}`}
            onMouseMove={handleMove}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              if (hoveredPoint && onSelectDate) onSelectDate(hoveredPoint.key);
            }}
            role="img"
            aria-label={t("Накопленные расходы за период в сравнении с планом")}
          >
            {/* Сетка */}
            {ticks.map((tick) => (
              <div
                key={tick}
                className={`absolute inset-x-0 h-px ${tick === 0 ? "bg-gray-200 dark:bg-white/10" : "bg-gray-100 dark:bg-white/[0.05]"}`}
                style={{ top: `${(1 - tick / maxValue) * 100}%` }}
              />
            ))}

            <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              {paidArea && <path d={paidArea} className="fill-indigo-500/10 dark:fill-indigo-400/15" />}
              <path
                d={planPath}
                fill="none"
                strokeWidth="1.5"
                strokeDasharray="5 5"
                vectorEffect="non-scaling-stroke"
                className="stroke-gray-400 dark:stroke-gray-500"
              />
              {paidPath && (
                <path
                  d={paidPath}
                  fill="none"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-indigo-600 dark:stroke-indigo-400"
                />
              )}
            </svg>

            {/* Отметка «сегодня» */}
            {todayIndex !== null && (
              <div
                className="pointer-events-none absolute inset-y-0 w-px border-l border-dashed border-gray-300 dark:border-white/15"
                style={{ left: `${(x(todayIndex) / 1000) * 100}%` }}
              >
                <span className="absolute -top-0.5 left-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  {hourly ? t("Сейчас") : t("Сегодня")}
                </span>
              </div>
            )}

            {/* Конечная точка оплаченной линии */}
            {lastPaid && hovered === null && (
              <span
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 ring-2 ring-[var(--ui-surface)] dark:bg-indigo-400"
                style={{ left: `${(x(lastPaid.i) / 1000) * 100}%`, top: `${y(lastPaid.v)}%` }}
              />
            )}

            {/* Перекрестие и точки при наведении */}
            {hoveredPoint && hovered !== null && (
              <>
                <div className="pointer-events-none absolute inset-y-0 w-px bg-gray-300 dark:bg-white/20" style={{ left: `${hoverLeft}%` }} />
                <span
                  className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400 ring-2 ring-[var(--ui-surface)] dark:bg-gray-500"
                  style={{ left: `${hoverLeft}%`, top: `${y(hoveredPoint.plan)}%` }}
                />
                {hoveredPoint.paid !== null && (
                  <span
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600 ring-2 ring-[var(--ui-surface)] dark:bg-indigo-400"
                    style={{ left: `${hoverLeft}%`, top: `${y(hoveredPoint.paid)}%` }}
                  />
                )}
                <div
                  className="pointer-events-none absolute top-0 z-10 rounded-md border border-[var(--ui-border)] bg-[var(--ui-surface)] px-2.5 py-1.5 text-xs shadow-lg dark:bg-gray-800"
                  style={{ left: `${hoverLeft}%`, transform: `translateX(${tooltipShift})` }}
                  role="tooltip"
                >
                  <p className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    {t("К {1}", hoveredPoint.tooltip)}
                  </p>
                  {hoveredPoint.paid !== null && (
                    <p className="mt-1 flex items-center gap-2 whitespace-nowrap">
                      <span className="h-0.5 w-3 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                      <span className="text-gray-500 dark:text-gray-400">{t("Оплачено")}</span>
                      <span className="ml-auto pl-3 font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                        {formatMoney(hoveredPoint.paid, locale, currency)}
                      </span>
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-2 whitespace-nowrap">
                    <span className="w-3 border-t border-dashed border-gray-400" />
                    <span className="text-gray-500 dark:text-gray-400">{t("План")}</span>
                    <span className="ml-auto pl-3 tabular-nums text-gray-700 dark:text-gray-300">
                      {formatMoney(hoveredPoint.plan, locale, currency)}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Подписи оси X */}
          <div className="absolute inset-x-0 bottom-0 h-6">
            {xLabels.map(({ p, i }) => (
              <span
                key={p.key}
                className="absolute bottom-0 whitespace-nowrap text-[11px] text-gray-400 dark:text-gray-500"
                style={{
                  left: `${(x(i) / 1000) * 100}%`,
                  transform: i === 0 ? "none" : i === count - 1 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CumulativeSpendingChart;
