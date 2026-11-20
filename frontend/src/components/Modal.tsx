// src/components/Modal.tsx
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  className,
}) => {
  const openedAtRef = useRef<number>(0);
  useEffect(() => {
    openedAtRef.current = performance.now();
  }, []);

  if (!isOpen) return null;

  // Игнорируем «призрачный» клик, который может прийти сразу после открытия модалки (тач → синтетический click)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const sinceOpenMs = performance.now() - openedAtRef.current;
    if (sinceOpenMs < 350) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClose();
  };

  // Используем React Portal для рендеринга модального окна вне основного DOM-дерева
  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 bg-black/30 dark:bg-black/60 flex justify-center items-center z-50 ${
        className || ""
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-[var(--ui-surface)] rounded-lg shadow-2xl border border-[var(--ui-border)] p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex justify-between items-center gap-4 mb-4 -mr-1.5">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 cursor-pointer"
              aria-label="Close"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        )}
        {!title && showCloseButton && (
          <div className="flex justify-end -mb-2 -mr-1.5">
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100 cursor-pointer"
              aria-label="Close"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
