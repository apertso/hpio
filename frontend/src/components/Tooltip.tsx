import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "bottom",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwipingAway, setIsSwipingAway] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const isMobile = window.innerWidth < 768; // md breakpoint

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320; // w-80 = 320px
    const tooltipHeight = 60; // approximate height
    const margin = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = triggerRect.top - tooltipHeight - margin;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + margin;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.left - tooltipWidth - margin;
        break;
      case "right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.right + margin;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    left = Math.max(
      margin,
      Math.min(left, viewportWidth - tooltipWidth - margin)
    );
    top = Math.max(
      margin,
      Math.min(top, viewportHeight - tooltipHeight - margin)
    );

    setTooltipPosition({ top, left });
  };

  const toggleTooltip = () => {
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    // Only add click outside handler on desktop
    if (isVisible && !isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, isMobile]);

  // Reset swipe states when tooltip closes
  useEffect(() => {
    if (!isVisible) {
      setTranslateX(0);
      setIsDragging(false);
      setIsSwipingAway(false);
    }
  }, [isVisible]);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible, position]);

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

      {isVisible &&
        ReactDOM.createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[100] w-80 max-w-sm"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: `translateX(${translateX}px)`,
              opacity: isSwipingAway ? 0 : 1,
              transition: isDragging
                ? "none"
                : isSwipingAway
                ? "transform 0.5s cubic-bezier(0.4, 0, 0.1, 1), opacity 0.5s ease-out"
                : "transform 0.3s cubic-bezier(0.4, 0, 0.1, 1)",
            }}
          >
            <div className="bg-gray-900 text-white text-sm rounded-lg shadow-lg p-3 border border-gray-700 touch-pan-y">
              <div className="flex justify-between items-start">
                <p className="flex-1">{content}</p>
                {!isMobile && (
                  <button
                    onClick={() => setIsVisible(false)}
                    className="ml-2 flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                    aria-label="Закрыть"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
