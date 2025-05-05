// src/components/PaymentIconDisplay.tsx
import React, { useState, useEffect } from "react"; // Add useState and useEffect
import axiosInstance from "../api/axiosInstance";
import { PhotoIcon } from "@heroicons/react/24/outline"; // Иконка-заглушка
import { useAuth } from "../context/AuthContext"; // Import useAuth
// TODO: Импортировать компоненты для отображения встроенных иконок из вашей библиотеки
import {
  CreditCardIcon,
  HomeIcon,
  TruckIcon,
  ShoppingCartIcon,
  PhoneIcon,
  WifiIcon,
  HeartIcon,
  WrenchIcon,
  BookOpenIcon,
  FilmIcon,
  GiftIcon,
  PaperAirplaneIcon,
  SparklesIcon, // Using SparklesIcon as a placeholder for 'utensils' as a direct match is not available
  BoltIcon,
  CloudIcon, // Using CloudIcon as a placeholder for 'water' as a direct match is not available
  FireIcon,
} from "@heroicons/react/24/outline";
import { BuiltinIcon } from "../utils/builtinIcons";

interface PaymentDataForIcon {
  id: string; // Нужен ID для получения пользовательской иконки с бэкенда
  iconType?: "builtin" | "custom" | null;
  builtinIconName?: BuiltinIcon | null;
  iconPath?: string | null;
  title?: string; // Добавляем title для alt текста изображения
}

interface PaymentIconDisplayProps {
  payment: PaymentDataForIcon;
  sizeClass?: string; // Класс размера (например, 'h-6 w-6')
  colorClass?: string; // Класс цвета текста (например, 'text-white')
}

// TODO: Маппинг имен встроенных иконок на реальные компоненты или пути в спрайте
// Map builtin icon names to their corresponding Heroicons components
// Note: Some names from builtinIcons.ts may not have direct matches in Heroicons.
// Placeholders (SparklesIcon, CloudIcon) are used where direct matches were not found in previous attempts.
export const builtinIconComponents = {
  "credit-card": CreditCardIcon,
  home: HomeIcon,
  truck: TruckIcon, // Using TruckIcon for 'car'
  "shopping-cart": ShoppingCartIcon,
  phone: PhoneIcon,
  wifi: WifiIcon,
  heart: HeartIcon,
  wrench: WrenchIcon,
  "book-open": BookOpenIcon,
  film: FilmIcon,
  gift: GiftIcon,
  plane: PaperAirplaneIcon, // Using PaperAirplaneIcon for 'plane'
  sparkles: SparklesIcon, // Using SparklesIcon as a placeholder for 'utensils'
  bolt: BoltIcon,
  cloud: CloudIcon, // Using CloudIcon as a placeholder for 'water'
  fire: FireIcon,
} as const; // Use 'as const' to infer the exact literal types of the keys and values

const PaymentIconDisplay: React.FC<PaymentIconDisplayProps> = ({
  payment,
  sizeClass = "h-6 w-6",
  colorClass, // Destructure the new prop
}) => {
  const { token } = useAuth(); // Get the token

  const [customIconContent, setCustomIconContent] = useState<string | null>(
    null
  ); // State for the custom icon content
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  useEffect(() => {
    const fetchCustomIcon = async () => {
      if (payment.iconType === "custom" && payment.id && token) {
        setIsLoading(true);
        setError(null);
        try {
          // Construct the URL
          const iconUrl = `${axiosInstance.defaults.baseURL}/files/icon/${payment.id}`;

          // Fetch the image data with authorization header
          const response = await axiosInstance.get(iconUrl, {
            responseType: "text", // Fetch as text for inline rendering
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Set the SVG content directly
          setCustomIconContent(response.data);
          setIsLoading(false);
        } catch (err: any) {
          console.error("Failed to fetch custom icon:", err);
          setError("Failed to load icon");
          setIsLoading(false);
          setCustomIconContent(null); // Clear the content on error
        }
      } else {
        // Clear state if not a custom icon or missing data/token
        if (customIconContent) {
          // No object URL to revoke when using inline SVG
        }
        setCustomIconContent(null);
        setIsLoading(false);
        setError(null);
      }
    };

    fetchCustomIcon();

    // Cleanup function to revoke the object URL when the component unmounts
    return () => {
      // Clear custom icon content state
      setCustomIconContent(null);
    };
  }, [payment.id, payment.iconType, token]); // Dependencies

  if (
    !payment ||
    payment.iconType === null ||
    (payment.iconType === "custom" && (isLoading || error)) // Include error in the condition
  ) {
    // Нет иконки, статус null, или ошибка загрузки пользовательской иконки
    return <PhotoIcon className={`${sizeClass} text-gray-400`} />; // Иконка-заглушка
  }

  if (payment.iconType === "builtin" && payment.builtinIconName) {
    // Отображение встроенной иконки
    // Get the corresponding icon component from the mapping
    // Use 'as keyof typeof builtinIconComponents' to assert that the icon name is a valid key
    const BuiltinIconComponent = builtinIconComponents[payment.builtinIconName];
    if (BuiltinIconComponent) {
      return <BuiltinIconComponent className={`${sizeClass} ${colorClass}`} />;
    }

    // Fallback to placeholder if icon component not found (shouldn't happen if mapping is complete)
    // This part remains as a safeguard, though ideally all icons from builtinIcons.ts should be mapped
    return (
      <div
        className={`${sizeClass} flex items-center justify-center border rounded dark:border-gray-600 text-blue-500 dark:text-blue-400`}
      >
        {payment.builtinIconName[0]?.toUpperCase() || "?"}
      </div>
    );
  }

  if (payment.iconType === "custom" && customIconContent) {
    // Отображение пользовательской SVG иконки
    // Рендерим SVG содержимое inline для лучшего контроля стилей
    return (
      <div
        className={`${sizeClass} ${
          colorClass || "text-blue-500"
        } overflow-hidden`} // Применяем классы размера и цвета к контейнеру и скрываем переполнение
        dangerouslySetInnerHTML={{ __html: customIconContent }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* We can't directly style the SVG here, but the container styles and overflow-hidden help */}
        {/* A more robust solution might involve parsing the SVG content to remove width/height attributes */}
      </div>
    );
    // TODO: Add error handling/placeholder if customIconContent is null after loading attempt
  }

  return (
    <PhotoIcon className={`${sizeClass} text-gray-400 dark:text-gray-300`} />
  ); // Заглушка на случай, если iconType есть, но данные некорректны
};

export default PaymentIconDisplay;
