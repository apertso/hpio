import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Overlay from "./Overlay";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const isMobile = window.innerWidth < 768; // md breakpoint

  const toggleTooltip = () => {
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handlePointerOutside, true);
      document.addEventListener("touchstart", handlePointerOutside, true);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerOutside, true);
      document.removeEventListener("touchstart", handlePointerOutside, true);
    };
  }, [isVisible]);

  // Reset swipe states when tooltip closes
  useEffect(() => {
    if (!isVisible) {
      setTranslateX(0);
      setIsDragging(false);
      setIsSwipingAway(false);
    }
  }, [isVisible]);

  // Calculate position when tooltip becomes visible
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
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
    if (!isMobile) return;
    const deltaX = translateX;
    const swipeThreshold = 100;

    if (Math.abs(deltaX) > swipeThreshold) {
      // Swipe to dismiss - fly away in the direction of the swipe
      setIsDragging(false);
      setIsSwipingAway(true);

      // Animate to far off screen in the direction of the swipe
      const direction = deltaX > 0 ? 1 : -1;
      setTranslateX(direction * window.innerWidth);

      // Close after animation completes
      setTimeout(() => setIsVisible(false), 500);
    } else {
      // Snap back
      setTranslateX(0);
      setIsDragging(false);
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onClick={toggleTooltip}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex cursor-pointer"
      >
        {children}
      </div>

      <Overlay
        isOpen={isVisible}
        anchorRef={triggerRef}
        widthClass="w-auto"
        className="!bg-transparent !dark:bg-transparent !border-none !shadow-none !overflow-visible"
      >
        <div
          ref={tooltipRef}
          className="w-80 max-w-sm touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateX(${translateX}px)`,
            opacity: isSwipingAway ? 0 : 1,
            transition: isDragging
              ? "none"
              : isSwipingAway
              ? "transform 0.5s cubic-bezier(0.4, 0, 0.1, 1), opacity 0.5s ease-out"
              : "transform 0.3s cubic-bezier(0.4, 0, 0.1, 1)",
          }}
        >
          <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <div className="flex items-start justify-between">
              <p className="flex-1">{content}</p>
              {!isMobile && (
                <button
                  onClick={() => setIsVisible(false)}
                  className="ml-2 flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-white"
                  aria-label="Close tooltip"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </Overlay>
    </>
  );
};
