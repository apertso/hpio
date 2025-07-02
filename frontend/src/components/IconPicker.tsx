// src/components/IconPicker.tsx
import React, { useState, useEffect } from "react";
import { BuiltinIcon, builtinIcons } from "../utils/builtinIcons";
import { PhotoIcon, XCircleIcon } from "@heroicons/react/24/outline";
import PaymentIconDisplay, {
  builtinIconComponents,
} from "./PaymentIconDisplay";
import useIconUpload from "../hooks/useIconUpload";
import useIconDeletion from "../hooks/useIconDeletion";
import Spinner from "./Spinner";

export interface PaymentIconInfo {
  iconType: "builtin" | "custom" | null;
  builtinIconName?: keyof typeof iconTranslations | null;
  iconPath?: string | null;
}

interface IconPickerProps {
  paymentId?: string;
  initialIcon?: PaymentIconInfo | null;
  onIconChange: (iconInfo: PaymentIconInfo | null) => void;
  onError?: (message: string) => void;
  isFormSubmitting?: boolean;
}

export const iconTranslations: Record<
  keyof typeof builtinIconComponents,
  string
> = {
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

const IconPicker: React.FC<IconPickerProps> = ({
  paymentId,
  initialIcon,
  onIconChange,
  onError,
  isFormSubmitting,
}) => {
  const [selectedIcon, setSelectedIcon] = useState<PaymentIconInfo | null>(
    initialIcon || null
  );

  // Сбрасываем состояние иконки, если initialIcon изменился
  useEffect(() => {
    setSelectedIcon(initialIcon || null);
  }, [initialIcon]);

  // Уведомляем родительскую форму об изменении иконки
  useEffect(() => {
    const areEqual = (
      icon1?: PaymentIconInfo | null,
      icon2?: PaymentIconInfo | null
    ) => {
      if (!icon1 && !icon2) return true;
      if (!icon1 || !icon2) return false;

      // Compare iconType
      if (icon1.iconType !== icon2.iconType) return false;

      // Compare builtinIconName, handling null/undefined
      if (icon1.builtinIconName !== icon2.builtinIconName) return false;

      // Compare iconPath, handling null/undefined
      if (icon1.iconPath !== icon2.iconPath) return false;

      return true;
    };

    if (!areEqual(selectedIcon, initialIcon)) {
      onIconChange(selectedIcon);
    }
  }, [selectedIcon, onIconChange]);

  const handleSelectBuiltinIcon = (iconName: BuiltinIcon) => {
    if (isFormSubmitting) return;

    setSelectedIcon({
      iconType: "builtin",
      builtinIconName: iconName,
      iconPath: null,
    });
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isUploading,
    uploadError,
  } = useIconUpload({
    paymentId,
    onError,
    isFormSubmitting,
    onIconChange: (iconInfo) => {
      setSelectedIcon(iconInfo);
    },
  });

  const { isDeleting, deleteError, handleDeleteIcon } = useIconDeletion({
    paymentId,
    onError,
    onIconChange: () => {
      setSelectedIcon(null);
    },
  });

  const handleClearIcon = () => {
    if (isUploading || isDeleting || isFormSubmitting) return;

    if (selectedIcon?.iconType === "custom" && selectedIcon.iconPath) {
      handleDeleteIcon();
    } else {
      setSelectedIcon(null);
    }
  };

  const IconDisplay = ({
    iconInfo,
    sizeClass = "h-6 w-6",
  }: {
    iconInfo: PaymentIconInfo | null;
    sizeClass?: string;
  }) => {
    if (!iconInfo) {
      return (
        <PhotoIcon
          className={`${sizeClass} text-gray-400 dark:text-gray-300`}
        />
      );
    }

    const paymentDataForDisplay = {
      id: paymentId || "",
      iconType: iconInfo.iconType,
      builtinIconName: iconInfo.builtinIconName,
      iconPath: iconInfo.iconPath,
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
          <IconDisplay iconInfo={selectedIcon} sizeClass="h-10 w-10" />
        </div>

        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
          {selectedIcon?.iconType === "builtin" &&
            `Встроенная: ${
              (selectedIcon.builtinIconName &&
                iconTranslations[selectedIcon.builtinIconName]) ||
              "Неизвестная"
            }`}
          {selectedIcon?.iconType === "custom" &&
            selectedIcon?.iconPath &&
            `Пользовательская (SVG)`}
          {!selectedIcon && "Без иконки"}
        </div>

        {selectedIcon && (
          <button
            type="button"
            onClick={handleClearIcon}
            disabled={isUploading || isDeleting || isFormSubmitting}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 disabled:opacity-50 cursor-pointer"
            title={isDeleting ? "Удаление иконки..." : "Удалить иконку"}
          >
            {isDeleting ? (
              <Spinner size="sm" />
            ) : (
              <XCircleIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      <div className="border border-gray-300 dark:border-gray-600 rounded-md p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
          Выберите встроенную или загрузите свою:
        </p>

        <div className="flex flex-wrap gap-2 mb-4 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700">
          {builtinIcons.map((iconName) => (
            <button
              key={iconName}
              type="button"
              onClick={() => handleSelectBuiltinIcon(iconName)}
              disabled={isUploading || isDeleting || isFormSubmitting}
              className={`p-2 border rounded-md transition-colors duration-100 disabled:opacity-50 cursor-pointer
                                  ${
                                    selectedIcon?.iconType === "builtin" &&
                                    selectedIcon.builtinIconName === iconName
                                      ? "border-blue-500 bg-blue-100 dark:bg-blue-600"
                                      : "border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                                  }`}
              title={iconName}
            >
              <div className="h-6 w-6 flex items-center justify-center text-gray-700 dark:text-white">
                <IconDisplay
                  iconInfo={{
                    iconType: "builtin",
                    builtinIconName: iconName,
                    iconPath: null,
                  }}
                  sizeClass="h-6 w-6"
                />
              </div>
            </button>
          ))}
          {builtinIcons.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Нет доступных встроенных иконок.
            </p>
          )}
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
          Или загрузите пользовательскую (SVG):
        </p>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed p-6 rounded-md text-center cursor-pointer transition-colors duration-200
                          ${
                            isDragActive
                              ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                          }
                          ${
                            isUploading ||
                            isDeleting ||
                            !paymentId ||
                            isFormSubmitting
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
          aria-disabled={
            isUploading || isDeleting || !paymentId || isFormSubmitting
          }
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div>
              <div className="flex flex-col items-center justify-center">
                <Spinner />
                <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                  Загрузка иконки...
                </p>
              </div>
            </div>
          ) : (
            <div>
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
              <p className="mt-2 text-sm text-gray-900 dark:text-gray-100">
                {isDragActive
                  ? "Перетащите SVG иконку сюда..."
                  : "Перетащите SVG сюда или кликните для выбора"}
              </p>
              {!paymentId && (
                <p className="mt-2 text-sm font-semibold text-red-500 dark:text-red-400">
                  Сначала сохраните платеж, чтобы прикрепить пользовательскую
                  иконку.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <p className="mt-1 text-sm text-red-600">{uploadError}</p>
      )}
      {deleteError && (
        <p className="mt-1 text-sm text-red-600">{deleteError}</p>
      )}
    </div>
  );
};

export default IconPicker;
