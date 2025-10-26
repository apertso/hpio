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
    <div className="flex h-full">
      <div className="w-full">
        {data.map((category, index) => {
          const percentage =
            totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0;
          const color = colors[index % colors.length];

          return (
            <div
              key={category.id || category.name}
              className="space-y-1 text-sm mb-2 hidden md:grid md:grid-cols-12 md:gap-2 md:items-center"
            >
              {/* Category name - col-span-3 */}
              <span
                className="md:col-span-3 truncate font-medium text-gray-700 dark:text-gray-200"
                title={category.name}
              >
                {category.name}
              </span>
              {/* Progress bar - col-span-8 */}
              <div className="md:col-span-8 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(to right, ${color}99, ${color})`,
                  }}
                ></div>
              </div>
              {/* Progress text - col-span-1 */}
              <span className="md:col-span-1 font-medium text-gray-500 dark:text-gray-400 text-right">
                {percentage.toFixed(1)}%
              </span>
            </div>
          );
        })}
        {/* Mobile layout */}
        {data.map((category, index) => {
          const percentage =
            totalAmount > 0 ? (category.amount / totalAmount) * 100 : 0;
          const color = colors[index % colors.length];

          return (
            <div
              key={`mobile-${category.id || category.name}`}
              className="space-y-1 text-sm mb-3 md:hidden"
            >
              {/* Category name and percentage on same line */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className="flex-1 truncate font-medium text-gray-700 dark:text-gray-200"
                  title={category.name}
                >
                  {category.name}
                </span>
                <span className="font-medium text-gray-500 dark:text-gray-400">
                  {percentage.toFixed(1)}%
                </span>
              </div>
              {/* Progress bar below */}
              <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div
                  className="h-2.5 rounded-full"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(to right, ${color}99, ${color})`,
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryDistributionBars;
