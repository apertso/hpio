import React from "react";
import { BuiltinIcon, builtinIcons } from "../utils/builtinIcons";
import { XCircleIcon } from "@heroicons/react/24/outline";
import PaymentIconDisplay from "./PaymentIconDisplay";
import Icon from "./Icon";

const iconTranslations: Record<string, string> = {
  "credit-card": "Кредитная карта",
  home: "Дом",
  truck: "Машина",
  "shopping-cart": "Корзина",
  phone: "Связь",
  wifi: "Wi-Fi",
  heart: "Здоровье",
  wrench: "Ремонт",
  "book-open": "Образование",
  film: "Развлечения",
  gift: "Подарок",
  plane: "Самолет",
  sparkles: "Услуги",
  bolt: "Электричество",
  cloud: "Облако",
  fire: "Газ",
};

interface IconSelectorProps {
  selectedIconName: BuiltinIcon | null;
  onIconChange: (iconName: BuiltinIcon | null) => void;
  isFormSubmitting?: boolean;
}

const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIconName,
  onIconChange,
  isFormSubmitting,
}) => {
  const handleSelectBuiltinIcon = (iconName: BuiltinIcon) => {
    if (isFormSubmitting) return;
    onIconChange(iconName);
  };

  const handleClearIcon = () => {
    if (isFormSubmitting) return;
    onIconChange(null);
  };

  const IconDisplay = ({
    iconName,
    sizeClass = "h-6 w-6",
  }: {
    iconName: BuiltinIcon | null;
    sizeClass?: string;
  }) => {
    if (!iconName) {
      return (
        <Icon className={`${sizeClass} text-gray-400 dark:text-gray-300`} />
      );
    }
    const paymentDataForDisplay = {
      id: "icon-selector-preview",
      builtinIconName: iconName,
    };
    return (
      <PaymentIconDisplay
        payment={paymentDataForDisplay}
        sizeClass={sizeClass}
      />
    );
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        Иконка
      </label>
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex-shrink-0 text-gray-700 dark:text-white">
          <IconDisplay iconName={selectedIconName} sizeClass="h-10 w-10" />
        </div>
        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
          {selectedIconName
            ? `Выбрано: ${iconTranslations[selectedIconName] || "Неизвестная"}`
            : "Без иконки"}
        </div>
        {selectedIconName && (
          <button
            type="button"
            onClick={handleClearIcon}
            disabled={isFormSubmitting}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 disabled:opacity-50 cursor-pointer"
            title="Удалить иконку"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
          Выберите встроенную иконку:
        </p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700">
          {builtinIcons.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => handleSelectBuiltinIcon(iconName)}
              disabled={isFormSubmitting}
              className={`p-2 border rounded-md transition-colors duration-100 disabled:opacity-50 cursor-pointer
                ${
                  selectedIconName === iconName
                    ? "border-blue-500 bg-blue-100 dark:bg-blue-600"
                    : "border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                }`}
              title={iconTranslations[iconName] || iconName}
            >
              <div className="h-6 w-6 flex items-center justify-center text-gray-700 dark:text-white">
                <IconDisplay iconName={iconName} sizeClass="h-6 w-6" />
              </div>
            </button>
          ))}
          {builtinIcons.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Нет доступных встроенных иконок.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IconSelector;
