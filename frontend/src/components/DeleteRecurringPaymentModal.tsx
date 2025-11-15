import React from "react";
import Modal from "./Modal";
import { Button } from "./Button";
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
        При удалении серии все будущие запланированные платежи будут отменены, а
        сама серия станет неактивной.
      </p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="destructive"
            loading={isProcessing}
            onClick={onDeleteInstance}
            className="w-full"
          >
            Только этот
          </Button>
          <Button
            variant="destructive"
            loading={isProcessing}
            onClick={onDeleteSeries}
            className="w-full"
          >
            Удалить серию
          </Button>
        </div>
        <Button
          variant="secondary"
          layout="text-only"
          size="small"
          onClick={onClose}
          className="w-full"
          disabled={isProcessing}
        >
          Отмена
        </Button>
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
