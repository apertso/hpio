import React, { useEffect, useState, useCallback } from "react";

interface MobilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  shouldClose?: boolean;
  enableBackdropClick?: boolean;
}

const MobilePanel: React.FC<MobilePanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  shouldClose = false,
  enableBackdropClick = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
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

  return (
    <div className="md:hidden" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isVisible ? "bg-black/40" : "bg-black/0"
        } ${enableBackdropClick ? "" : "pointer-events-none"}`}
        onClick={enableBackdropClick ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        data-mobile-panel-content
        className={`fixed flex flex-col bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 p-4 rounded-t-2xl shadow-lg max-h-full transform transition-transform duration-300 ease-out safe-area-top safe-area-bottom ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className={`flex items-center mb-4 ${
              showCloseButton ? "justify-between" : "justify-center"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default MobilePanel;
