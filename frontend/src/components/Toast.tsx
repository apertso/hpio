import React, { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

export type ToastType = "success" | "error" | "info";

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  info: InformationCircleIcon,
};

const colors: Record<ToastType, string> = {
  success: "bg-green-500 dark:bg-green-600",
  error: "bg-red-500 dark:bg-red-600",
  info: "bg-blue-500 dark:bg-blue-600",
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = 5000,
  onClose,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const Icon = icons[type];

  return (
    <div
      role="alert"
      className={`relative flex items-center w-full max-w-sm p-4 text-white rounded-lg shadow-lg ${
        colors[type]
      } transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      }`}
    >
      <div className="flex-shrink-0 w-6 h-6 mr-3">
        <Icon />
      </div>
      <div className="flex-1 text-sm font-medium">{message}</div>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="py-1 px-2.5 ml-3 text-sm font-semibold bg-white/20 rounded-md hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(id), 300);
        }}
        className="p-1 -mr-2 -my-2 ml-auto text-white rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;
