// frontend/src/components/CustomDailySpendingChart.tsx
import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";

interface Point {
  x: number;
  y: number;
}

interface CustomChartProps {
  data: number[];
  labels: string[]; // Formatted labels for tooltip
  theme: "light" | "dark";
  rawDates: string[];
  onPointClick?: (date: string, value: number, seriesId: string) => void;
  startDate: Date;
  endDate: Date;
}

// Утилита для создания сглаженной кривой (spline)
const createSplinePath = (points: Point[]): string => {
  if (points.length < 2) return "";

  const pathParts: string[] = [`M ${points[0].x} ${points[0].y}`];
  const tension = 0.2;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;

    pathParts.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }

  return pathParts.join(" ");
};

const CustomDailySpendingChart: React.FC<CustomChartProps> = ({
  data,
  labels,
  theme,
  rawDates,
  onPointClick,
  startDate,
  endDate,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: number;
    index: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]) {
          const { width, height } = entries[0].contentRect;
          setDimensions({ width, height });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const { width, height } = dimensions;
  // Константы для геометрии графика
  const yAxisAreaWidth = 35; // Пространство для меток оси Y
  const padding = { top: 20, right: 20, bottom: 30, left: 10 }; // Внутренние отступы самого графика

  const { linePath, areaPath, points, yAxisTicks, xAxisTicks } = useMemo(() => {
    if (width === 0 || height === 0 || !data || data.length === 0) {
      return {
        linePath: "",
        areaPath: "",
        points: [] as Point[],
        yAxisTicks: [] as { y: number; value: number }[],
        xAxisTicks: [] as { x: number; label: string }[],
      };
    }

    const maxValue = Math.max(...data, 0) * 1.25 || 1;
    const effectiveWidth =
      width - yAxisAreaWidth - padding.left - padding.right;
    const effectiveHeight = height - padding.top - padding.bottom;

    // Проверяем, если у нас есть данные по часам (содержат компонент времени)
    const hasHourlyData = rawDates.some((d) => d.includes(" "));

    // Для данных по часам, гарантируем, что мы охватываем весь день
    const chartStartDate = hasHourlyData
      ? new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          0,
          0,
          0,
          0
        )
      : startDate;
    const chartEndDate = hasHourlyData
      ? new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          23,
          59,
          59,
          999
        )
      : endDate;

    const timeDomain = chartEndDate.getTime() - chartStartDate.getTime();

    const getX = (date: Date) => {
      const plotStart = yAxisAreaWidth + padding.left;
      if (timeDomain <= 0) return plotStart + effectiveWidth / 2;
      return (
        plotStart +
        ((date.getTime() - chartStartDate.getTime()) / timeDomain) *
          effectiveWidth
      );
    };

    const calculatedPoints = rawDates.map((dateStr, index) => ({
      x: getX(new Date(dateStr)),
      y:
        padding.top +
        effectiveHeight -
        (data[index] / maxValue) * effectiveHeight,
    }));

    const yTicks = 4;
    const calculatedYAxisTicks = Array.from({ length: yTicks + 1 }, (_, i) => {
      const value = (maxValue / yTicks) * i;
      const y =
        padding.top + effectiveHeight - (value / maxValue) * effectiveHeight;
      return { y, value };
    });

    const numXTicks = Math.max(2, Math.floor(effectiveWidth / 80));
    const calculatedXAxisTicks: { x: number; label: string }[] = [];
    if (timeDomain > 0) {
      // Создаем тики для оси X, включая начальную и конечную дату
      for (let i = 0; i <= numXTicks; i++) {
        const tickDate = new Date(
          chartStartDate.getTime() + (timeDomain / numXTicks) * i
        );
        calculatedXAxisTicks.push({
          x: getX(tickDate),
          label: hasHourlyData
            ? tickDate.toLocaleString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : tickDate.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              }),
        });
      }
    }

    const linePath = createSplinePath(calculatedPoints);
    const areaPath =
      calculatedPoints.length > 1
        ? `${linePath} L ${calculatedPoints[calculatedPoints.length - 1].x},${
            height - padding.bottom
          } L ${calculatedPoints[0].x},${height - padding.bottom} Z`
        : "";

    return {
      linePath,
      areaPath,
      points: calculatedPoints,
      yAxisTicks: calculatedYAxisTicks,
      xAxisTicks: calculatedXAxisTicks,
    };
  }, [
    data,
    rawDates,
    width,
    height,
    startDate,
    endDate,
    yAxisAreaWidth,
    padding.top,
    padding.right,
    padding.bottom,
    padding.left,
  ]);

  // Strict hit radius for pointer and touch
  const HIT_RADIUS = 8; // px in SVG units
  // const TOUCH_HIT_RADIUS = 16; // px in SVG units для тача

  // const TOUCH_HIT_RADIUS = 16; // px in SVG units для тача (не используется при X-снапе)
  // Функция попадания по окружности более не используется после перехода на X-снап
  // const getPointAtEvent = useCallback(
  //   (
  //     clientX: number,
  //     clientY: number,
  //     overrideRadius?: number
  //   ): number | null => {
  //     const svg = svgRef.current;
  //     if (!svg || points.length === 0) return null;
  //     const p = svg.createSVGPoint();
  //     p.x = clientX;
  //     p.y = clientY;
  //     const svgPoint = p.matrixTransform(svg.getScreenCTM()!.inverse());
  //     let found: number | null = null;
  //     for (let i = 0; i < points.length; i++) {
  //       const dx = points[i].x - svgPoint.x;
  //       const dy = points[i].y - svgPoint.y;
  //       const dist = Math.sqrt(dx * dx + dy * dy);
  //       const radius = overrideRadius ?? HIT_RADIUS;
  //       if (dist <= radius) {
  //         found = i;
  //         break;
  //       }
  //     }
  //     return found;
  //   },
  //   [points]
  // );

  // Поиск ближайшей точки по оси X (игнорируя отклонение по Y)
  const getNearestIndexByClientX = useCallback(
    (clientX: number): number | null => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return null;
      const p = svg.createSVGPoint();
      p.x = clientX;
      p.y = 0;
      const svgPoint = p.matrixTransform(svg.getScreenCTM()!.inverse());
      let nearestIndex = 0;
      let minDx = Math.abs(points[0].x - svgPoint.x);
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(points[i].x - svgPoint.x);
        if (dx < minDx) {
          minDx = dx;
          nearestIndex = i;
        }
      }
      return nearestIndex;
    },
    [points]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const idx = getNearestIndexByClientX(event.clientX);
      if (idx === null) {
        setHoveredIndex(null);
        setTooltip(null);
        return;
      }
      const pt = points[idx];
      setHoveredIndex(idx);
      setTooltip({
        visible: true,
        x: pt.x,
        y: pt.y,
        value: data[idx],
        index: idx,
      });
    },
    [getNearestIndexByClientX, points, data]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltip(null);
  }, []);

  const handleMouseClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!onPointClick) return;
      const idx = getNearestIndexByClientX(event.clientX);
      if (idx === null) return;
      onPointClick(rawDates[idx], data[idx], "daily-spending");
    },
    [getNearestIndexByClientX, onPointClick, rawDates, data]
  );

  // Keyboard accessibility
  const handlePointKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGCircleElement>, idx: number) => {
      if (!onPointClick) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPointClick(rawDates[idx], data[idx], "daily-spending");
      }
    },
    [onPointClick, rawDates, data]
  );

  // Touch (mobile): drag shows tooltip, tap opens details
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const [isTouching, setIsTouching] = useState(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const touch = e.changedTouches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchMovedRef.current = false;
      setIsTouching(true);
      const idx = getNearestIndexByClientX(touch.clientX);
      if (idx !== null) {
        const pt = points[idx];
        setHoveredIndex(idx);
        setTooltip({
          visible: true,
          x: pt.x,
          y: pt.y,
          value: data[idx],
          index: idx,
        });
      }
    },
    [getNearestIndexByClientX, points, data]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (!isTouching) return;
      // Блокируем прокрутку во время перетаскивания по графику
      e.preventDefault();
      const touch = e.changedTouches[0];
      // Помечаем, что было движение
      if (touchStartRef.current) {
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 6) {
          touchMovedRef.current = true;
        }
      }
      const idx = getNearestIndexByClientX(touch.clientX);
      if (idx !== null) {
        const pt = points[idx];
        setHoveredIndex(idx);
        setTooltip({
          visible: true,
          x: pt.x,
          y: pt.y,
          value: data[idx],
          index: idx,
        });
      }
    },
    [isTouching, getNearestIndexByClientX, points, data]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const touch = e.changedTouches[0];
      const isTap = !touchMovedRef.current;
      const idx = getNearestIndexByClientX(touch.clientX);
      if (isTap && idx !== null && onPointClick) {
        onPointClick(rawDates[idx], data[idx], "daily-spending");
      }
      // Подсказку не скрываем: должна оставаться видимой до следующего взаимодействия
      touchStartRef.current = null;
      touchMovedRef.current = false;
      setIsTouching(false);
    },
    [getNearestIndexByClientX, onPointClick, rawDates, data]
  );

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    touchMovedRef.current = false;
    setIsTouching(false);
  }, []);

  const lineColor = theme === "dark" ? "#a78bfa" : "#6d28d9";
  const gradientStartColor = theme === "dark" ? "#5b21b6" : "#c4b5fd";
  const gradientEndColor =
    theme === "dark" ? "rgba(20, 20, 20, 0)" : "rgba(237, 233, 254, 0)";

  const cursorStyle =
    onPointClick && hoveredIndex !== null ? "pointer" : "default";

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width || 0} ${height || 0}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{ cursor: cursorStyle, touchAction: "none" }}
        role="img"
        aria-label={`График платежной нагрузки ${
          rawDates.some((d) => d.includes(" ")) ? "по часам" : "по дням"
        }`}
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={gradientStartColor}
              stopOpacity={0.4}
            />
            <stop
              offset="100%"
              stopColor={gradientEndColor}
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>

        {/* Y-Axis Grid Lines and Labels */}
        {yAxisTicks.map((tick, i) => (
          <g
            key={`y-${i}`}
            className="text-xs"
            fill={theme === "dark" ? "#9ca3af" : "#6b7280"}
          >
            <line
              x1={yAxisAreaWidth + padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke={theme === "dark" ? "#374151" : "#e5e7eb"}
              strokeWidth="1"
            />
            <text x={yAxisAreaWidth - 8} y={tick.y + 4} textAnchor="end">
              {tick.value === 0
                ? "0"
                : tick.value >= 1000
                ? `${Math.round(tick.value / 1000)}k`
                : Math.round(tick.value)}
            </text>
          </g>
        ))}

        {/* X-Axis Labels */}
        {xAxisTicks.map((tick, i) => (
          <g
            key={`x-${i}`}
            className="text-xs"
            fill={theme === "dark" ? "#9ca3af" : "#6b7280"}
          >
            <text
              x={tick.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
            >
              {tick.label}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#chartGradient)" />
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        />

        {/* Interactive points with strict hitboxes */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <g key={`pt-${idx}`}>
              {/* Visible point for hover feedback (уменьшен размер, однотонная заливка, без белой обводки) */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 4 : 3}
                fill={lineColor}
                stroke="none"
                pointerEvents="none"
              />
              {/* Strict hit target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={HIT_RADIUS}
                fill="transparent"
                stroke="transparent"
                tabIndex={-1}
                aria-label={`${labels[idx]}: ${new Intl.NumberFormat("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(data[idx])} ₽`}
                onFocus={(e) => {
                  // Убираем фокусное кольцо по табу
                  (e.target as SVGCircleElement).blur();
                }}
                onKeyDown={(e) => handlePointKeyDown(e, idx)}
                onMouseEnter={() => {
                  setHoveredIndex(idx);
                  setTooltip({
                    visible: true,
                    x: pt.x,
                    y: pt.y,
                    value: data[idx],
                    index: idx,
                  });
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setTooltip(null);
                }}
              />
              {/* Focus ring убран */}
            </g>
          );
        })}

        {/* Tooltip guide line when hovered */}
        {tooltip?.visible && points.length > 0 && (
          <g>
            <line
              x1={tooltip.x}
              y1={height - padding.bottom}
              x2={tooltip.x}
              y2={padding.top}
              stroke={lineColor}
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity="0.5"
              pointerEvents="none"
            />
          </g>
        )}
      </svg>
      {tooltip?.visible && (
        <div
          className="absolute p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-lg pointer-events-none border border-gray-200 dark:border-gray-700"
          style={{
            left: `${(tooltip.x / (width || 1)) * 100}%`,
            top: `${(tooltip.y / (height || 1)) * 100}%`,
            transform: "translate(-50%, -120%)",
            transition: "transform 0.1s ease-out",
          }}
        >
          {labels[tooltip.index]}:{" "}
          {new Intl.NumberFormat("ru-RU", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(data[tooltip.index])}
          <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
            ₽
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomDailySpendingChart;
