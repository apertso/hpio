import React, { useState, useMemo, useEffect } from "react";
import { BuiltinIcon, builtinIcons } from "../utils/builtinIcons";
import {
  XCircleIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import PaymentIconDisplay from "./PaymentIconDisplay";
import Icon from "./Icon";
import Overlay from "./Overlay";
import { useDropdown } from "../hooks/useDropdown";

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
  banknotes: "Наличные",
  bank: "Банк",
  education: "Обучение",
  briefcase: "Работа",
  cake: "Праздник",
  chat: "Общение",
  computer: "Компьютер",
  mobile: "Мобильный",
  internet: "Интернет",
  key: "Аренда",
  lightbulb: "Свет",
  location: "Локация",
  music: "Музыка",
  puzzle: "Игры",
  qrcode: "QR код",
  radio: "Радио",
  rocket: "Стартап",
  scale: "Налоги",
  scissors: "Красота",
  shield: "Страховка",
  ticket: "Билеты",
  trophy: "Спорт",
  user: "Личное",
  video: "Видео",
  wallet: "Кошелек",
  bus: "Автобус",
  coins: "Монеты",
  parking: "Парковка",
  gas: "Заправка",
  taxi: "Такси",
};

export interface IconSelectorProps {
  selectedIconName: BuiltinIcon | null;
  onIconChange: (iconName: BuiltinIcon | null) => void;
  isFormSubmitting?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIconName,
  onIconChange,
  isFormSubmitting,
  isDisabled,
  isReadOnly,
}) => {
  const { isOpen, setIsOpen, containerRef } = useDropdown();
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    if ((isDisabled || isReadOnly) && isOpen) {
      setIsOpen(false);
      setSearchTerm("");
    }
  }, [isDisabled, isReadOnly, isOpen, setIsOpen]);
  const isSelectionLocked = isFormSubmitting || isDisabled || isReadOnly;
  const isTriggerDisabled = isFormSubmitting || isDisabled;

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return builtinIcons;
    const lowerTerm = searchTerm.toLowerCase();
    return builtinIcons.filter((icon) => {
      const translation = iconTranslations[icon]?.toLowerCase() || "";
      return icon.includes(lowerTerm) || translation.includes(lowerTerm);
    });
  }, [searchTerm]);

  const handleSelectBuiltinIcon = (iconName: BuiltinIcon) => {
    if (isSelectionLocked) return;
    onIconChange(iconName);
    setIsOpen(false);
    setSearchTerm(""); // Reset search on select
  };

  const handleClearIcon = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSelectionLocked) return;
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
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Иконка
      </label>

      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (isSelectionLocked) return;
            setIsOpen(!isOpen);
            if (!isOpen) setSearchTerm("");
          }}
          className={`relative block w-full rounded-xl bg-white dark:bg-gray-900 px-3 pr-12 py-2.5 text-base text-gray-900 dark:text-gray-100 shadow-sm border transition-colors text-left flex items-center gap-3 ${
            isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          } ${
            isTriggerDisabled
              ? "cursor-not-allowed opacity-70 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
              : isReadOnly
              ? "cursor-default"
              : "cursor-pointer focus:outline-none focus:ring-3 focus:ring-indigo-500"
          }`}
          disabled={isTriggerDisabled}
        >
          <span className="flex items-center gap-2 flex-1 min-w-0">
            <span className="flex items-center">
              <IconDisplay iconName={selectedIconName} sizeClass="h-5 w-5" />
            </span>
            <span
              className={`text-base truncate ${
                selectedIconName
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {selectedIconName
                ? iconTranslations[selectedIconName] || selectedIconName
                : "Выбрать иконку"}
            </span>
          </span>
        </button>
        {selectedIconName && !isDisabled && !isReadOnly && (
          <button
            type="button"
            onClick={handleClearIcon}
            disabled={isSelectionLocked}
            className="absolute right-11 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 bg-white dark:bg-gray-900"
            title="Удалить иконку"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        )}
        {!isReadOnly && (
          <ChevronDownIcon
            className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-transform duration-200 pointer-events-none ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}

        {/* Overlay */}
        <Overlay
          isOpen={!isDisabled && !isReadOnly && isOpen}
          anchorRef={containerRef}
          widthClass="w-[340px]"
          className="p-3"
        >
          {/* Search Input */}
          <div className="mb-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg leading-5 bg-white dark:bg-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
              placeholder="Поиск иконки..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()} // Prevent closing on click
            />
          </div>

          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Доступные иконки ({filteredIcons.length})
          </p>

          <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent pr-1">
            {filteredIcons.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => handleSelectBuiltinIcon(iconName)}
                disabled={isSelectionLocked}
                className={`aspect-square flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800
                  ${
                    selectedIconName === iconName
                      ? "bg-indigo-50 border-2 border-indigo-500 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300 shadow-sm"
                      : "border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}
                title={iconTranslations[iconName] || iconName}
              >
                <IconDisplay iconName={iconName} sizeClass="h-5 w-5" />
              </button>
            ))}
            {filteredIcons.length === 0 && (
              <p className="col-span-full text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Ничего не найдено
              </p>
            )}
          </div>
        </Overlay>
      </div>
    </div>
  );
};

export default IconSelector;
