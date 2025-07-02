import React, { useMemo, useState, useRef, useCallback } from "react";

interface Point {
  x: number;
  y: number;
}

interface CustomChartProps {
  data: number[];
  labels: string[];
  theme: "light" | "dark";
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
}) => {
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    value: number;
    index: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 500;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 20, left: 20 };

  const { linePath, areaPath, points } = useMemo(() => {
    const maxValue = Math.max(...data, 0) * 1.25 || 1; // Добавляем 25% "воздуха" сверху
    const effectiveWidth = width - padding.left - padding.right;
    const effectiveHeight = height - padding.top - padding.bottom;

    const calculatedPoints = data.map((value, index) => {
      const xPosition =
        data.length > 1
          ? padding.left + (index / (data.length - 1)) * effectiveWidth
          : padding.left + effectiveWidth / 2; // Center if only one point

      return {
        x: xPosition,
        y: padding.top + effectiveHeight - (value / maxValue) * effectiveHeight,
      };
    });

    const linePath = createSplinePath(calculatedPoints);
    const areaPath =
      calculatedPoints.length > 1
        ? `${linePath} L ${calculatedPoints[calculatedPoints.length - 1].x},${
            height - padding.bottom
          } L ${calculatedPoints[0].x},${height - padding.bottom} Z`
        : ""; // No area for a single point

    return { linePath, areaPath, points: calculatedPoints };
  }, [data, width, height, padding]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;

      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const x = event.clientX - rect.left;

      let closestIndex = 0;
      let minDistance = Infinity;

      points.forEach((point, index) => {
        const distance = Math.abs(point.x - x);
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

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const lineColor = theme === "dark" ? "#a78bfa" : "#6d28d9"; // Saturated purple
  const gradientStartColor = theme === "dark" ? "#5b21b6" : "#c4b5fd";
  const gradientEndColor =
    theme === "dark" ? "rgba(20, 20, 20, 0)" : "rgba(237, 233, 254, 0)";

  // Label rendering logic
  const maxLabelsToShow = 10;
  const labelStep =
    labels.length > maxLabelsToShow
      ? Math.ceil(labels.length / maxLabelsToShow)
      : 1;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="relative flex-grow">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
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

          {/* Gradient Fill Area */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Tooltip Indicators */}
          {tooltip?.visible && points.length > 1 && (
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
        {/* Tooltip HTML element */}
        {tooltip?.visible && (
          <div
            className="absolute p-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-lg pointer-events-none border border-gray-200 dark:border-gray-700"
            style={{
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: "translate(-50%, -120%)",
              transition: "transform 0.1s ease-out",
            }}
          >
            {data[tooltip.index].toLocaleString("ru-RU", {
              style: "currency",
              currency: "RUB",
            })}
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between pt-2 h-6 text-xs text-gray-500 dark:text-gray-400">
        {labels.map((label, index) => (
          <div
            key={index}
            className="flex-1 text-center"
            style={{
              visibility:
                index % labelStep === 0 ||
                (index === labels.length - 1 &&
                  (labels.length - 1) % labelStep !== 0)
                  ? "visible"
                  : "hidden",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomDailySpendingChart;
