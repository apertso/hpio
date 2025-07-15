// src/components/PaymentIconDisplay.tsx
import React from "react";
import Icon from "./Icon"; // Иконка-заглушка
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
  SparklesIcon,
  BoltIcon,
  CloudIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { BuiltinIcon } from "../utils/builtinIcons";
import { getIconColorByName } from "../utils/paymentColors";

interface PaymentDataForIcon {
  id: string;
  builtinIconName?: BuiltinIcon | null;
  title?: string;
  category?: {
    builtinIconName?: BuiltinIcon | null;
  } | null;
}

interface PaymentIconDisplayProps {
  payment: PaymentDataForIcon;
  sizeClass?: string;
}

export const builtinIconComponents = {
  "credit-card": CreditCardIcon,
  home: HomeIcon,
  truck: TruckIcon,
  "shopping-cart": ShoppingCartIcon,
  phone: PhoneIcon,
  wifi: WifiIcon,
  heart: HeartIcon,
  wrench: WrenchIcon,
  "book-open": BookOpenIcon,
  film: FilmIcon,
  gift: GiftIcon,
  plane: PaperAirplaneIcon,
  sparkles: SparklesIcon,
  bolt: BoltIcon,
  cloud: CloudIcon,
  fire: FireIcon,
} as const;

const PaymentIconDisplay: React.FC<PaymentIconDisplayProps> = ({
  payment,
  sizeClass = "h-6 w-6",
}) => {
  const iconName = payment.builtinIconName || payment.category?.builtinIconName;
  if (!payment || !iconName) {
    return <Icon className={`${sizeClass} text-gray-400`} />;
  }
  const iconColor = getIconColorByName(iconName);

  const BuiltinIconComponent = builtinIconComponents[iconName];
  if (BuiltinIconComponent) {
    return (
      <BuiltinIconComponent
        className={`${sizeClass}`}
        style={{ color: iconColor }}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} flex items-center justify-center border rounded dark:border-gray-600`}
      style={{ color: iconColor, borderColor: iconColor }}
    >
      {iconName[0]?.toUpperCase() || "?"}
    </div>
  );
};

export default PaymentIconDisplay;
