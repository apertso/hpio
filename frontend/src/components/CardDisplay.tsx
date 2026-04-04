import React from "react";
import { CardData } from "../types/cardData";
import { getVendorDisplayName } from "../utils/cardVendor";
import { getCardDisplayName } from "../utils/cardName";

interface CardDisplayProps {
  card: CardData;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  className?: string;
}

// Get card color based on level
const getCardColors = (
  level?: string | null
): { bg: string; text: string; accent: string } => {
  const normalizedLevel = level?.toLowerCase() || "";

  switch (normalizedLevel) {
    case "platinum":
    case "infinite":
    case "signature":
      return {
        bg: "bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800",
        text: "text-white",
        accent: "text-slate-300",
      };
    case "gold":
      return {
        bg: "bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600",
        text: "text-amber-950",
        accent: "text-amber-800",
      };
    case "black":
    case "world elite":
    case "centurion":
      return {
        bg: "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
        text: "text-white",
        accent: "text-gray-400",
      };
    case "premium":
    case "world":
      return {
        bg: "bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700",
        text: "text-white",
        accent: "text-purple-200",
      };
    default:
      // Standard/Classic - blue gradient
      return {
        bg: "bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700",
        text: "text-white",
        accent: "text-indigo-200",
      };
  }
};

// Get payment system badge
const PaymentSystemBadge: React.FC<{
  vendor?: string | null;
  className?: string;
}> = ({ vendor, className = "" }) => {
  const normalizedVendor = vendor?.trim().toLowerCase() || "";
  const displayVendor = getVendorDisplayName(vendor);

  const baseClasses = `font-bold tracking-wider ${className}`;

  switch (normalizedVendor) {
    case "visa":
      return <span className={`${baseClasses} italic`}>VISA</span>;
    case "mastercard":
      return <span className={baseClasses}>mastercard</span>;
    case "mir":
    case "nspk mir":
    case "nspk-mir":
      return displayVendor ? <span className={baseClasses}>MIR</span> : null;
    case "china union pay":
    case "unionpay":
      return <span className={baseClasses}>UnionPay</span>;
    case "amex":
    case "american express":
      return <span className={baseClasses}>AMEX</span>;
    case "jcb":
      return <span className={baseClasses}>JCB</span>;
    case "maestro":
      return <span className={baseClasses}>Maestro</span>;
    default:
      return displayVendor ? (
        <span className={baseClasses}>{displayVendor}</span>
      ) : null;
  }
};

// Format card number with masking
const formatCardNumber = (pan?: string | null): string => {
  if (!pan) return "**** **** **** ****";

  // If we have full or partial number
  const cleaned = pan.replace(/\s/g, "");

  if (cleaned.length <= 4) {
    return `${cleaned.padEnd(4, "*")} **** **** ****`;
  }

  if (cleaned.length <= 8) {
    return `${cleaned.slice(0, 4)} ${cleaned
      .slice(4)
      .padEnd(4, "*")} **** ****`;
  }

  // Show first 6 and last 4, mask the rest
  const first6 = cleaned.slice(0, 6);
  const last4 = cleaned.length >= 10 ? cleaned.slice(-4) : "****";

  return `${first6.slice(0, 4)} ${first6.slice(4, 6)}** **** ${last4}`;
};

const CardDisplay: React.FC<CardDisplayProps> = ({
  card,
  size = "medium",
  onClick,
  className = "",
}) => {
  const colors = getCardColors(card.level);
  const cardDisplayName = getCardDisplayName(card.name, card.pan);
  const bankLabel = card.bankName?.trim();
  const countryLabel = card.country?.trim();
  const typeLabel = (card.type || "DEBIT").toUpperCase();
  const cardTypeLabel = countryLabel
    ? `${typeLabel} · ${countryLabel.toUpperCase()}`
    : typeLabel;

  const sizeClasses = {
    small: "w-48 h-28 text-xs",
    medium: "w-72 h-44 text-sm",
    large: "w-96 h-56 text-base",
  };
  const nameTextSize = size === "small" ? "text-xs" : "text-sm";
  const bankTextSize = size === "small" ? "text-[10px]" : "text-xs";

  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        ${colors.bg}
        ${colors.text}
        rounded-2xl
        p-4
        flex flex-col justify-between
        shadow-lg
        ${
          onClick
            ? "cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            : ""
        }
        ${className}
      `}
    >
      {/* Top row: Bank name and payment system */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col min-w-0 max-w-[70%] text-left">
          <span className={`font-semibold ${nameTextSize} truncate`}>
            {cardDisplayName}
          </span>
          {bankLabel && (
            <span
              className={`font-medium ${colors.accent} ${bankTextSize} truncate`}
            >
              {bankLabel}
            </span>
          )}
        </div>
        <PaymentSystemBadge
          vendor={card.vendor}
          className={size === "small" ? "text-sm" : "text-lg"}
        />
      </div>

      {/* Middle: Card chip placeholder */}
      <div className="flex items-center">
        <div
          className={`
          ${
            size === "small"
              ? "w-8 h-6"
              : size === "medium"
              ? "w-10 h-7"
              : "w-12 h-9"
          }
          bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md
          opacity-80
        `}
        />
      </div>

      {/* Bottom: Card number and type */}
      <div className="space-y-1">
        <div
          className={`
          font-mono tracking-wider
          ${
            size === "small"
              ? "text-sm"
              : size === "medium"
              ? "text-lg"
              : "text-xl"
          }
        `}
        >
          {formatCardNumber(card.pan)}
        </div>
        <div className="flex justify-between items-center">
          <div className={`text-xs ${colors.accent} uppercase`}>
            {cardTypeLabel}
          </div>
          {card.level && (
            <div className={`text-xs ${colors.accent} uppercase`}>
              {card.level}
            </div>
          )}
        </div>
      </div>
    </Component>
  );
};

export default CardDisplay;
