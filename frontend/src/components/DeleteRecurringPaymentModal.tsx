import React from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";
import MobilePanel from "./MobilePanel";

const DeleteRecurringPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDeleteInstance: () => void;
  onDeleteSeries: () => void;
  isProcessing: boolean;
}> = ({ isOpen, onClose, onDeleteInstance, onDeleteSeries, isProcessing }) => {
  if (!isOpen) return null;

  const renderContent = () => (
    <div className="space-y-4">
      <p className="text-gray-700 dark:text-gray-300">
        Это повторяющийся платеж. Вы хотите удалить только этот экземпляр или
        всю серию платежей?
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        При удалении серии все будущие запланированные платежи будут отменены,
        а сама серия станет неактивной.
      </p>
      <div className="flex flex-wrap justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
          disabled={isProcessing}
        >
          Отмена
        </button>
        <button
          onClick={onDeleteInstance}
          disabled={isProcessing}
          type="button"
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-w-[120px]"
        >
          {isProcessing ? <Spinner size="sm" /> : "Только этот"}
        </button>
        <button
          onClick={onDeleteSeries}
          disabled={isProcessing}
          type="button"
          className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 min-w-[140px]"
        >
          {isProcessing ? <Spinner size="sm" /> : "Удалить серию"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Удаление повторяющегося платежа"
        className="hidden md:flex"
      >
        {renderContent()}
      </Modal>
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title="Удаление повторяющегося платежа"
        showCloseButton
      >
        {renderContent()}
      </MobilePanel>
    </>
  );
};

export default DeleteRecurringPaymentModal;
