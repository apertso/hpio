import React, { useState } from "react";
import Modal from "./Modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import RadioButton from "./RadioButton";
import MobilePanel from "./MobilePanel";

interface ConfirmCompletionDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDate: Date) => void;
  dueDate: Date;
  isConfirming?: boolean;
}

type ContentOptions = {
  showHeadingSpacing: boolean;
};

const ConfirmCompletionDateModal: React.FC<ConfirmCompletionDateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dueDate,
  isConfirming,
}) => {
  type Selection = "today" | "due" | "custom";
  const [selectedOption, setSelectedOption] = useState<Selection>("today");
  const [customDate, setCustomDate] = useState<Date | null>(new Date());

  const handleConfirm = () => {
    if (selectedOption === "today") {
      onConfirm(new Date());
    } else if (selectedOption === "due") {
      onConfirm(dueDate);
    } else if (customDate) {
      onConfirm(customDate);
    }
  };

  if (!isOpen) return null;

  const renderContent = ({ showHeadingSpacing }: ContentOptions) => (
    <div className={`space-y-4 text-gray-800 dark:text-gray-200 ${showHeadingSpacing ? "" : "mt-2"}`}>
      <p>
        Дата выполнения платежа отличается от сегодняшней. Пожалуйста,
        выберите, какой датой отметить платеж как выполненный.
      </p>

      <fieldset className="space-y-2">
        <RadioButton
          id="today"
          name="date-option"
          value="today"
          checked={selectedOption === "today"}
          onChange={() => setSelectedOption("today")}
          label={`Сегодня (${new Date().toLocaleDateString("ru-RU")})`}
        />
        <RadioButton
          id="due"
          name="date-option"
          value="due"
          checked={selectedOption === "due"}
          onChange={() => setSelectedOption("due")}
          label={`По дате платежа (${dueDate.toLocaleDateString("ru-RU")})`}
        />
        <RadioButton
          id="custom"
          name="date-option"
          value="custom"
          checked={selectedOption === "custom"}
          onChange={() => setSelectedOption("custom")}
          label="Выбрать другую дату:"
        />
        {selectedOption === "custom" && (
          <div className="pl-7">
            <DatePicker
              selected={customDate}
              onChange={(date: Date | null) => setCustomDate(date)}
              dateFormat="yyyy-MM-dd"
              className="block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-700 dark:text-white"
              wrapperClassName="w-full"
            />
          </div>
        )}
      </fieldset>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onClose}
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
        >
          Отмена
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          type="button"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isConfirming ? "Подтверждение..." : "Подтвердить"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Выберите дату выполнения"
        className="hidden md:flex"
      >
        {renderContent({ showHeadingSpacing: true })}
      </Modal>
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title="Выберите дату выполнения"
        showCloseButton
      >
        {renderContent({ showHeadingSpacing: false })}
      </MobilePanel>
    </>
  );
};

export default ConfirmCompletionDateModal;
