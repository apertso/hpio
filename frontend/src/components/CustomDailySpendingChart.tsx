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
  onPointClick?: (date: string) => void;
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
        points: [],
        yAxisTicks: [],
        xAxisTicks: [],
      };
    }

    const maxValue = Math.max(...data, 0) * 1.25 || 1;
    const effectiveWidth =
      width - yAxisAreaWidth - padding.left - padding.right;
    const effectiveHeight = height - padding.top - padding.bottom;
    const timeDomain = endDate.getTime() - startDate.getTime();

    const getX = (date: Date) => {
      const plotStart = yAxisAreaWidth + padding.left;
      if (timeDomain <= 0) return plotStart + effectiveWidth / 2;
      return (
        plotStart +
        ((date.getTime() - startDate.getTime()) / timeDomain) * effectiveWidth
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
          startDate.getTime() + (timeDomain / numXTicks) * i
        );
        calculatedXAxisTicks.push({
          x: getX(tickDate),
          label: tickDate.toLocaleDateString("ru-RU", {
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
  }, [data, rawDates, width, height, startDate, endDate]);

  const transformMouseEvent = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM()!.inverse());
  };

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svgPoint = transformMouseEvent(event);
      if (!svgPoint || points.length === 0) return;

      let closestIndex = 0;
      let minDistance = Infinity;
      points.forEach((point, index) => {
        const distance = Math.abs(point.x - svgPoint.x);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      const point = points[closestIndex];
      setTooltip({
        visible: true,
        x: point.x,
        y: point.y,
        value: data[closestIndex],
        index: closestIndex,
      });
    },
    [points, data]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleMouseClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svgPoint = transformMouseEvent(event);
      if (!svgPoint || points.length === 0 || !onPointClick) return;

      let closestIndex = 0;
      let minDistance = Infinity;
      points.forEach((point, index) => {
        const distance = Math.abs(point.x - svgPoint.x);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      onPointClick(rawDates[closestIndex]);
    },
    [points, onPointClick, rawDates]
  );

  const lineColor = theme === "dark" ? "#a78bfa" : "#6d28d9";
  const gradientStartColor = theme === "dark" ? "#5b21b6" : "#c4b5fd";
  const gradientEndColor =
    theme === "dark" ? "rgba(20, 20, 20, 0)" : "rgba(237, 233, 254, 0)";

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width || 0} ${height || 0}`}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleMouseClick}
        style={{ cursor: onPointClick ? "pointer" : "default" }}
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
        />

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
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r="5"
              fill={theme === "dark" ? "#0a0a0a" : "#ffffff"}
              stroke={lineColor}
              strokeWidth="2"
            />
          </g>
        )}
      </svg>
      {tooltip?.visible && (
        <div
          className="absolute p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-lg pointer-events-none border border-gray-200 dark:border-gray-700"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100}%`,
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
