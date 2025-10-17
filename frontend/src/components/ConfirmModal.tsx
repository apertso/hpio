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
  if (!isOpen) return null;

  const renderContent = ({ showTitleInBody }: ContentOptions) => (
    <>
      <div className="flex items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
          <ExclamationTriangleIcon
            className="h-6 w-6 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          {showTitleInBody && (
            <h3
              className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
              id="modal-title"
            >
              {title}
            </h3>
          )}
          <div className={`mt-2 ${showTitleInBody ? "" : "mt-0"}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          disabled={isConfirming}
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 min-w-24"
          onClick={onConfirm}
        >
          {isConfirming ? <Spinner size="sm" /> : confirmText}
        </button>
        <button
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
          onClick={onClose}
        >
          {cancelText}
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
        showCloseButton
      >
        {renderContent({ showTitleInBody: false })}
      </MobilePanel>
    </>
  );
};

export default ConfirmModal;

