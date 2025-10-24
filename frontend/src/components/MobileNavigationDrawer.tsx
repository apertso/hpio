import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  token: string | null;
  navItems: NavItem[];
  currentPath: string;
  onLogout: () => void;
}

const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  user,
  token,
  navItems,
  currentPath,
  onLogout,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const trackingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const drawerWidthRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const { avatarUrl } = useAvatarCache(user?.photoPath, token);

  const updateDragOffset = useCallback((value: number) => {
    dragOffsetRef.current = value;
    setDragOffset(value);
  }, []);

  // Icon mapping for navigation items
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

  useEffect(() => {
    if (isOpen) {
      return;
    }

    trackingRef.current = false;
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    setIsDragging(false);
    updateDragOffset(0);
  }, [isOpen, updateDragOffset]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    trackingRef.current = true;
    isDraggingRef.current = false;
    drawerWidthRef.current = drawerRef.current?.offsetWidth ?? 0;
    setIsDragging(false);
    updateDragOffset(0);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!trackingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - startXRef.current;
    const deltaY = event.clientY - startYRef.current;

    if (!isDraggingRef.current) {
      if (Math.abs(deltaX) <= Math.abs(deltaY) || Math.abs(deltaX) < 10) {
        return;
      }

      isDraggingRef.current = true;
      setIsDragging(true);

      const drawer = drawerRef.current;
      if (drawer?.setPointerCapture) {
        drawer.setPointerCapture(event.pointerId);
      }
    }

    if (!isDraggingRef.current) {
      return;
    }

    event.preventDefault();
    const width = drawerWidthRef.current || drawerRef.current?.offsetWidth || 0;
    const clamped = Math.max(Math.min(deltaX, 0), -width);
    updateDragOffset(clamped);
  };

  const releasePointerCapture = (pointerId: number) => {
    const drawer = drawerRef.current;
    if (drawer?.hasPointerCapture?.(pointerId)) {
      drawer.releasePointerCapture(pointerId);
    }
  };

  const handlePointerEnd = (
    event: React.PointerEvent<HTMLElement>,
    shouldCancel = false
  ) => {
    if (!trackingRef.current || pointerIdRef.current !== event.pointerId) {
      return;
    }

    const width = drawerWidthRef.current || drawerRef.current?.offsetWidth || 0;
    const threshold = width > 0 ? width * 0.35 : 120;
    const shouldClose =
      !shouldCancel &&
      isDraggingRef.current &&
      dragOffsetRef.current <= -threshold;

    if (isDraggingRef.current && !shouldCancel) {
      event.preventDefault();
    }

    releasePointerCapture(event.pointerId);

    trackingRef.current = false;
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    drawerWidthRef.current = 0;
    startXRef.current = 0;
    startYRef.current = 0;
    setIsDragging(false);

    if (shouldClose && width > 0) {
      updateDragOffset(-width);
      onClose();
      return;
    }

    updateDragOffset(0);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
    handlePointerEnd(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLElement>) => {
    handlePointerEnd(event, true);
  };

  const drawerStyle: React.CSSProperties = {
    touchAction: "pan-y",
    transform:
      isDragging || dragOffset !== 0
        ? `translateX(${dragOffset}px)`
        : undefined,
    transition: isDragging ? "none" : undefined,
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="md:hidden">
      {/* Backdrop with fade animation */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer with slide animation */}
      <aside
        ref={drawerRef}
        style={drawerStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col pt-[var(--safe-area-inset-top)] pb-[var(--safe-area-inset-bottom)] ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header with user info */}
        <div className="flex items-center px-7 py-4 border-b border-gray-200 dark:border-gray-800">
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
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.to;
            const icon = getNavIcon(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                    : "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
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
            className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
              currentPath === "/settings"
                ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                : "text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
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

        {/* Logout button at the bottom */}
        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
