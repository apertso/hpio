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
}

const IconSelector: React.FC<IconSelectorProps> = ({
  selectedIconName,
  onIconChange,
  isFormSubmitting,
  isDisabled,
}) => {
  const { isOpen, setIsOpen, containerRef } = useDropdown();
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    if (isDisabled && isOpen) {
      setIsOpen(false);
      setSearchTerm("");
    }
  }, [isDisabled, isOpen, setIsOpen]);
  const isInteractionLocked = isFormSubmitting || isDisabled;

  const filteredIcons = useMemo(() => {
    if (!searchTerm) return builtinIcons;
    const lowerTerm = searchTerm.toLowerCase();
    return builtinIcons.filter((icon) => {
      const translation = iconTranslations[icon]?.toLowerCase() || "";
      return icon.includes(lowerTerm) || translation.includes(lowerTerm);
    });
  }, [searchTerm]);

  const handleSelectBuiltinIcon = (iconName: BuiltinIcon) => {
    if (isInteractionLocked) return;
    onIconChange(iconName);
    setIsOpen(false);
    setSearchTerm(""); // Reset search on select
  };

  const handleClearIcon = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isInteractionLocked) return;
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

      <div ref={containerRef} className="relative">
        {/* Trigger Button */}
        <div
          onClick={() => {
            if (isInteractionLocked) return;
            setIsOpen(!isOpen);
            // Focus search input when opening? We can't easily ref the input inside Overlay here before render.
            // But standard behavior is fine.
            if (!isOpen) setSearchTerm(""); // Reset search on open
          }}
          className={`flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 ${
            isOpen
              ? "border-indigo-500 ring-2 ring-indigo-500/20"
              : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
          } ${
            isInteractionLocked
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full border transition-colors ${
                selectedIconName
                  ? "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-white"
                  : "bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600 text-gray-400"
              }`}
            >
              <IconDisplay iconName={selectedIconName} sizeClass="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span
                className={`text-sm font-medium ${
                  selectedIconName
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {selectedIconName
                  ? iconTranslations[selectedIconName] || "Неизвестная"
                  : "Выберите иконку"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedIconName ? "Нажмите для изменения" : "Из списка"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedIconName && !isDisabled && (
              <button
                type="button"
                onClick={handleClearIcon}
                disabled={isInteractionLocked}
                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 z-10"
                title="Удалить иконку"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            )}
            <ChevronDownIcon
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Overlay */}
        <Overlay
          isOpen={!isDisabled && isOpen}
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
                disabled={isInteractionLocked}
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
