import React from "react";

interface CategoryStat {
  id?: string;
  name: string;
  amount: number;
}

interface CategoryDistributionBarsProps {
  data: CategoryStat[] | undefined | null;
  colors: string[];
}

const CategoryDistributionBars: React.FC<CategoryDistributionBarsProps> = ({
  data,
  colors,
}) => {
  if (!data || data.length === 0 || data.every((cat) => cat.amount === 0)) {
    return (
      <div className="text-center text-gray-700 dark:text-gray-300 py-10">
        Нет данных по категориям за этот период.
      </div>
    );
  }

  // Calculate total amount for percentage calculation
  const totalAmount = data.reduce((sum, category) => sum + category.amount, 0);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-3 w-full">
        {data.map((category, index) => {
          const percentage =
            totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0;
          const color = colors[index % colors.length]; // Cycle through colors

          return (
            <div
              key={category.id || category.name}
              className="grid grid-cols-12 items-center gap-2 text-sm"
            >
              <span
                className="col-span-3 truncate font-medium text-gray-700 dark:text-gray-200"
                title={category.name}
              >
                {category.name}
              </span>
              <div className="col-span-8 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="h-2.5 rounded-full"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                ></div>
              </div>
              <span className="col-span-1 text-right font-medium text-gray-500 dark:text-gray-400">
                {percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryDistributionBars;
