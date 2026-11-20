import { useLanguage } from "../context/LanguageContext";
import React from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import MobilePanel from "./MobilePanel";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
}

type ContentOptions = {
  showTitleInBody: boolean;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  isConfirming = false,
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const renderContent = ({ showTitleInBody }: ContentOptions) => (
    <>
      <div className="flex items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center size-9 rounded-md border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 sm:mx-0">
          <ExclamationTriangleIcon
            className="size-4 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-3.5 sm:text-left">
          {showTitleInBody && (
            <h3
              className="text-base font-semibold text-gray-900 dark:text-gray-50"
              id="modal-title"
            >
              {title}
            </h3>
          )}
          <div className={showTitleInBody ? "mt-1" : "mt-0"}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          type="button"
          disabled={isConfirming}
          className="w-full inline-flex items-center justify-center rounded-md border border-red-700/20 shadow-sm px-3 h-10 sm:h-8 bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:w-auto disabled:opacity-50 min-w-24 cursor-pointer"
          onClick={onConfirm}
        >
          {isConfirming ? <Spinner size="sm" className="text-white!" /> : t(confirmText)}
        </button>
        <button
          type="button"
          className="w-full inline-flex items-center justify-center rounded-md border border-gray-200 bg-white shadow-sm px-3 h-10 sm:h-8 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-100 dark:hover:bg-white/[0.08] sm:w-auto cursor-pointer"
          onClick={onClose}
        >
          {t(cancelText)}
        </button>
      </div>
    </>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="hidden md:flex">
        {renderContent({ showTitleInBody: true })}
      </Modal>
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title={title}
      >
        {renderContent({ showTitleInBody: false })}
      </MobilePanel>
    </>
  );
};

export default ConfirmModal;

