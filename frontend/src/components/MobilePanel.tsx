import React, { useEffect, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";

interface MobilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  shouldClose?: boolean;
  enableBackdropClick?: boolean;
}

const MobilePanel: React.FC<MobilePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  shouldClose = false,
  enableBackdropClick = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const openedAtRef = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      openedAtRef.current = performance.now();
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Handle programmatic close trigger
  useEffect(() => {
    if (shouldClose && isOpen) {
      handleClose();
    }
  }, [shouldClose, isOpen, handleClose]);

  if (!isOpen) return null;

  const handleBackdropClick = useCallback(() => {
    const sinceOpenMs = performance.now() - openedAtRef.current;
    if (sinceOpenMs < 350) {
      return;
    }
    handleClose();
  }, [handleClose]);

  return ReactDOM.createPortal(
    <div className="md:hidden" aria-modal="true" role="dialog">
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isVisible ? "bg-black/40" : "bg-black/0"
        } ${enableBackdropClick ? "backdrop-blur-sm" : "pointer-events-none"}`}
        onClick={enableBackdropClick ? handleBackdropClick : undefined}
        aria-hidden="true"
      />

      <div
        data-mobile-panel-content
        className={`fixed flex flex-col bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 p-4 rounded-t-2xl shadow-lg max-h-full transform transition-transform duration-300 ease-out safe-area-top safe-area-bottom ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
        )}
        <div className="flex flex-col overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default MobilePanel;
