import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserIcon,
  HomeIcon,
  CreditCardIcon,
  ArchiveBoxIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { User } from "../context/AuthContext";
import { useAvatarCache } from "../hooks/useAvatarCache";

type NavItem = {
  to: string;
  label: string;
};

type DragMode = "opening" | "closing";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startProgress: number;
  lastProgress: number;
  locked: boolean;
}

const DRAG_ACTIVATION_DISTANCE = 6;
const DEFAULT_DRAWER_WIDTH = 288;

const clamp = (value: number, min: number, max: number) => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  user: User | null;
  token: string | null;
  navItems: NavItem[];
  currentPath: string;
  onLogout: () => void;
  gesturesEnabled?: boolean;
}

const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  onOpen,
  user,
  token,
  navItems,
  currentPath,
  onLogout,
  gesturesEnabled = true,
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { avatarUrl } = useAvatarCache(user?.photoPath, token);

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const drawerWidthRef = useRef(0);
  const dragStateRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Соответствие иконок элементам навигации
  const getNavIcon = (path: string) => {
    switch (path) {
      case "/dashboard":
        return <HomeIcon className="h-5 w-5" />;
      case "/payments":
        return <CreditCardIcon className="h-5 w-5" />;
      case "/archive":
        return <ArchiveBoxIcon className="h-5 w-5" />;
      case "/categories":
        return <Squares2X2Icon className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const updateDrawerWidth = useCallback(() => {
    if (drawerRef.current) {
      drawerWidthRef.current = drawerRef.current.getBoundingClientRect().width;
    }
  }, []);

  useEffect(() => {
    if (isOpen || isDragging) {
      setShouldRender(true);
      // Небольшая задержка перед запуском анимации
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    }

    setIsVisible(false);
    // Ожидаем завершения анимации перед размонтированием
    const timer = setTimeout(() => setShouldRender(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen, isDragging]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    updateDrawerWidth();
    window.addEventListener("resize", updateDrawerWidth);

    return () => {
      window.removeEventListener("resize", updateDrawerWidth);
    };
  }, [updateDrawerWidth]);

  useEffect(() => {
    if (shouldRender) {
      updateDrawerWidth();
    }
  }, [shouldRender, updateDrawerWidth]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("ontouchstart" in window) ||
      !gesturesEnabled
    ) {
      return;
    }

    let rafId: number | null = null;

    const shouldIgnoreGesture = (event: TouchEvent): boolean => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return false;
      }
      return Boolean(target.closest("[data-prevent-drawer-gesture]"));
    };

    const startDrag = (mode: DragMode, touch: Touch) => {
      if (dragStateRef.current) {
        return;
      }

      const startProgress = mode === "opening" ? 0 : 1;

      dragStateRef.current = {
        mode,
        startX: touch.clientX,
        startY: touch.clientY,
        startProgress,
        lastProgress: startProgress,
        locked: false,
      };
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || shouldIgnoreGesture(event)) {
        return;
      }

      const touch = event.touches[0];

      if (!isOpenRef.current) {
        startDrag("opening", touch);
        return;
      }

      if (isOpenRef.current) {
        startDrag("closing", touch);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const state = dragStateRef.current;
      if (!state) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - state.startX;
      const deltaY = touch.clientY - state.startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (!state.locked) {
        if (absDeltaY > absDeltaX && absDeltaY > DRAG_ACTIVATION_DISTANCE) {
          dragStateRef.current = null;
          return;
        }

        if (absDeltaX < DRAG_ACTIVATION_DISTANCE) {
          return;
        }

        state.locked = true;

        if (state.mode === "opening") {
          setShouldRender(true);
          setIsVisible(true);
        }

        setIsDragging(true);
      }

      const width = drawerWidthRef.current || DEFAULT_DRAWER_WIDTH;
      const nextProgress = clamp(state.startProgress + deltaX / width, 0, 1);

      state.lastProgress = nextProgress;
      setDragProgress(nextProgress);
      event.preventDefault();
    };

    const handleTouchEnd = () => {
      const state = dragStateRef.current;
      if (!state) {
        return;
      }

      dragStateRef.current = null;

      if (!state.locked) {
        return;
      }

      const finalProgress = state.lastProgress;
      setIsDragging(false);
      setDragProgress(finalProgress);

      if (finalProgress >= 0.5) {
        onOpen();
      } else {
        onClose();
      }

      rafId = window.requestAnimationFrame(() => {
        setDragProgress(null);
      });
    };

    const handleTouchCancel = () => {
      dragStateRef.current = null;
      setIsDragging(false);
      setDragProgress(null);
    };

    const touchMoveOptions: AddEventListenerOptions = { passive: false };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove, touchMoveOptions);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener(
        "touchmove",
        handleTouchMove,
        touchMoveOptions
      );
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchCancel);

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      dragStateRef.current = null;
      setIsDragging(false);
      setDragProgress(null);
    };
  }, [gesturesEnabled, onClose, onOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) {
    return null;
  }

  const drawerWidth = drawerWidthRef.current || DEFAULT_DRAWER_WIDTH;
  const drawerStyle: React.CSSProperties | undefined =
    dragProgress !== null
      ? {
          transform: `translateX(${(dragProgress - 1) * drawerWidth}px)`,
          transitionDuration: "0ms",
        }
      : undefined;

  const overlayStyle: React.CSSProperties | undefined =
    dragProgress !== null ? { opacity: dragProgress } : undefined;

  return (
    <div className="md:hidden">
      {/* Фон с анимацией затухания */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
        style={overlayStyle}
      />

      {/* Панель с анимацией выдвижения */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col pt-[var(--safe-area-inset-top)] pb-[var(--safe-area-inset-bottom)] ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        ref={drawerRef}
        style={drawerStyle}
      >
        {/* Заголовок с информацией о пользователе */}
        <button
          onClick={() => {
            navigate("/settings#account");
            onClose();
          }}
          className="flex items-center w-full px-7 py-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Аватар пользователя"
                className="size-12 rounded-full object-cover bg-gray-300 dark:bg-gray-800"
              />
            ) : (
              <div className="flex items-center justify-center size-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              {user?.name && (
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {user.name}
                </span>
              )}
              {user?.email && (
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Элементы навигации */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.to;
            const icon = getNavIcon(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-opacity cursor-pointer ${
                  isActive
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-900 dark:text-gray-100 hover:opacity-80"
                }`}
              >
                {icon && (
                  <span
                    className={
                      isActive ? "" : "text-gray-500 dark:text-gray-400"
                    }
                  >
                    {icon}
                  </span>
                )}
                {item.label}
              </Link>
            );
          })}

          <Link
            to="/settings"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-opacity cursor-pointer ${
              currentPath === "/settings"
                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                : "text-gray-900 dark:text-gray-100 hover:opacity-80"
            }`}
          >
            <Cog6ToothIcon
              className={`h-5 w-5 ${
                currentPath === "/settings"
                  ? ""
                  : "text-gray-500 dark:text-gray-400"
              }`}
            />
            Настройки
          </Link>
        </nav>

        {/* Кнопка выхода в нижней части */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Выйти
          </button>
        </div>
      </aside>
    </div>
  );
};

export default MobileNavigationDrawer;
