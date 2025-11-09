import React, { useEffect, useRef, useState } from "react";
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
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const [scale, setScale] = useState(0.85);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtProgressRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(duration);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const Icon = icons[type];

  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgress = () => {
    const startAt = Date.now();
    const startProgress = progress; // Resume from current progress

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startAt;
      const newProgress = Math.min(
        startProgress + (elapsed / duration) * 100,
        100
      );
      setProgress(newProgress);

      if (newProgress >= 100 && !isPaused) {
        clearTimers();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setIsVisible(false);
        setTimeout(() => onClose(id), 700);
      }
    }, 50);
  };

  useEffect(() => {
    // Animate in with bubble pop effect
    setIsVisible(true);
    // Animate scale from 0.85 to 1
    setTimeout(() => setScale(1), 10);
    startTimeRef.current = Date.now();
    remainingTimeRef.current = duration;
    startProgress();

    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setScale(1.15); // Bubble pop out effect
      setTimeout(() => onClose(id), 600);
    }, duration);

    return () => {
      clearTimers();
    };
  }, [id, duration, onClose]);

  const handleMouseEnter = () => {
    if (!isDragging && !isPaused) {
      // Save current progress and pause
      pausedAtProgressRef.current = progress;
      // Calculate remaining time based on progress
      remainingTimeRef.current = duration * (1 - progress / 100);
      setIsPaused(true);
      clearTimers();
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging && isPaused) {
      setIsPaused(false);
      startProgress();
      // Restart the timeout with remaining time
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        setScale(1.15); // Bubble pop out effect
        setTimeout(() => onClose(id), 600);
      }, remainingTimeRef.current);
    }
  };

  const handleClick = () => {
    if (!isDragging) {
      if (!isPaused) {
        // Pause
        pausedAtProgressRef.current = progress;
        // Calculate remaining time based on progress
        remainingTimeRef.current = duration * (1 - progress / 100);
        setIsPaused(true);
        clearTimers();
      } else {
        // Resume
        setIsPaused(false);
        startProgress();
        // Restart the timeout with remaining time
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
          setScale(1.15); // Bubble pop out effect
          setTimeout(() => onClose(id), 600);
        }, remainingTimeRef.current);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartXRef.current;
    const deltaY = currentY - touchStartYRef.current;

    // Only start dragging if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setIsDragging(true);
      setTranslateX(deltaX);
    }
  };

  const handleTouchEnd = () => {
    const deltaX = translateX;
    const swipeThreshold = 100;

    if (Math.abs(deltaX) > swipeThreshold) {
      // Swipe to dismiss - fly away in the direction of the swipe
      setIsDragging(false);
      setIsSwipingAway(true);
      clearTimers();

      // Animate to far off screen in the direction of the swipe
      const direction = deltaX > 0 ? 1 : -1;
      setTranslateX(direction * window.innerWidth);

      // Close after animation completes
      setTimeout(() => onClose(id), 500);
    } else {
      // Snap back
      setTranslateX(0);
      setIsDragging(false);
    }
  };

  const getOverlayColor = (type: ToastType): string => {
    const colors: Record<ToastType, string> = {
      success: "#7CB342", // Мятный зелёный (inspir. PANTONE 361 C)
      error: "#B71C1C", // Тёмно-красный для контраста (inspir. PANTONE 18-1664)
      info: "#64B5F6", // Небесно-голубой (inspir. PANTONE 286 C)
    };
    return colors[type];
  };

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative flex items-center w-full max-w-sm p-4 text-white rounded-lg shadow-lg touch-pan-y select-none overflow-hidden ${colors[type]}`}
      style={{
        transform: `translateX(${translateX}px) scale(${scale})`,
        opacity: isSwipingAway ? 0 : isVisible ? 1 : 0,
        transition: isDragging
          ? "none"
          : isSwipingAway
          ? "transform 0.5s cubic-bezier(0.4, 0, 0.1, 1), opacity 0.5s ease-out"
          : "transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      {/* Фоновая полоса прогресса, заполняющаяся слева направо */}
      <div
        className="absolute inset-0 transition-all duration-50 ease-linear"
        style={{
          backgroundColor: getOverlayColor(type),
          width: `${progress}%`,
          opacity: 0.3,
        }}
      />

      <div className="flex-shrink-0 w-6 h-6 mr-3 relative z-10">
        <Icon />
      </div>
      <div className="flex-1 text-sm font-medium relative z-10">{message}</div>
      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            setIsVisible(false);
            setScale(1.15); // Bubble pop out effect
            setTimeout(() => onClose(id), 600);
          }}
          className="py-1 px-2.5 ml-3 text-sm font-semibold bg-white/20 rounded-md hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white relative z-10"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
          setScale(1.15); // Bubble pop out effect
          setTimeout(() => onClose(id), 600);
        }}
        className="hidden md:block p-1 -mr-2 -my-2 ml-auto text-white rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white relative z-10"
        aria-label="Close"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;
