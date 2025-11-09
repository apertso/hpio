import React from "react";

export type PaymentTabType = "all" | "active" | "archive" | "trash";

interface TabOption {
  value: PaymentTabType;
  label: string;
}

interface PaymentFilterTabsProps {
  activeTab: PaymentTabType;
  onTabChange: (tab: PaymentTabType) => void;
  className?: string;
}

const tabOptions: TabOption[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "archive", label: "Архив" },
  { value: "trash", label: "Корзина" },
];

const PaymentFilterTabs: React.FC<PaymentFilterTabsProps> = ({
  activeTab,
  onTabChange,
  className = "",
}) => {
  return (
    <div className={`mb-4 flex justify-center md:justify-start ${className}`}>
      <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1 overflow-x-auto">
        {tabOptions.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex items-center justify-center cursor-pointer ${
              activeTab === tab.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaymentFilterTabs;
