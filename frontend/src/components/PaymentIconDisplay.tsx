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
  BanknotesIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  CakeIcon,
  ChatBubbleLeftRightIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  KeyIcon,
  LightBulbIcon,
  MapPinIcon,
  MusicalNoteIcon,
  PuzzlePieceIcon,
  QrCodeIcon,
  RadioIcon,
  RocketLaunchIcon,
  ScaleIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  TicketIcon,
  TrophyIcon,
  UserIcon,
  VideoCameraIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import {
  BusIcon,
  CoinsIcon,
  ParkingIcon,
  GasStationIcon,
  TaxiIcon,
} from "./CustomIcons";
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
  banknotes: BanknotesIcon,
  bank: BuildingLibraryIcon,
  education: AcademicCapIcon,
  briefcase: BriefcaseIcon,
  cake: CakeIcon,
  chat: ChatBubbleLeftRightIcon,
  computer: ComputerDesktopIcon,
  mobile: DevicePhoneMobileIcon,
  internet: GlobeAltIcon,
  key: KeyIcon,
  lightbulb: LightBulbIcon,
  location: MapPinIcon,
  music: MusicalNoteIcon,
  puzzle: PuzzlePieceIcon,
  qrcode: QrCodeIcon,
  radio: RadioIcon,
  rocket: RocketLaunchIcon,
  scale: ScaleIcon,
  scissors: ScissorsIcon,
  shield: ShieldCheckIcon,
  ticket: TicketIcon,
  trophy: TrophyIcon,
  user: UserIcon,
  video: VideoCameraIcon,
  wallet: WalletIcon,
  bus: BusIcon,
  coins: CoinsIcon,
  parking: ParkingIcon,
  gas: GasStationIcon,
  taxi: TaxiIcon,
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
