import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { Button } from "./Button";
import MobilePanel from "./MobilePanel";
import Checkbox from "./Checkbox";

const DeleteRecurringPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onDeleteInstance: () => void;
  onDeleteSeries: () => void;
  isProcessing: boolean;
}> = ({ isOpen, onClose, onDeleteInstance, onDeleteSeries, isProcessing }) => {
  const [shouldDeleteSeries, setShouldDeleteSeries] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShouldDeleteSeries(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = (): void => {
    if (shouldDeleteSeries) {
      onDeleteSeries();
    } else {
      onDeleteInstance();
    }
  };

  const renderContent = (): React.ReactNode => (
    <div className="flex flex-col gap-4">
      <p className="text-gray-700 dark:text-gray-300">
        Это повторяющийся платёж. По умолчанию удаляется только текущий
        экземпляр серии.
      </p>
      <Checkbox
        id="delete-series-checkbox"
        checked={shouldDeleteSeries}
        onChange={(event) => setShouldDeleteSeries(event.target.checked)}
        label={
          <div>
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              Удалить всю серию
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">
              Отменит все будущие платежи и деактивирует серию.
            </p>
          </div>
        }
      />
      <div className="space-y-3">
        <div className="hidden md:flex justify-end space-x-4 pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            label="Отмена"
          />
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isProcessing}
            label={shouldDeleteSeries ? "Удалить серию" : "Удалить только этот"}
          />
        </div>
        <div className="flex flex-col md:hidden pt-6 space-y-3">
          <Button
            variant="destructive"
            size="large"
            className="w-full"
            onClick={handleDelete}
            loading={isProcessing}
            label={shouldDeleteSeries ? "Удалить серию" : "Удалить только этот"}
          />
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
            disabled={isProcessing}
            label="Отмена"
          />
        </div>
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
      >
        {renderContent()}
      </MobilePanel>
    </>
  );
};

export default DeleteRecurringPaymentModal;
