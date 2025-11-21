import React, { useState } from "react";
import Modal from "./Modal";
import DatePicker from "./DatePicker";
import MobilePanel from "./MobilePanel";
import { Button } from "./Button";
import SegmentedControl, { SegmentedControlOption } from "./SegmentedControl";

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

type SegmentValue = "today" | "due";

const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const ConfirmCompletionDateModal: React.FC<ConfirmCompletionDateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dueDate,
  isConfirming,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date()
  );

  if (!isOpen) return null;

  const today = normalizeDate(new Date());
  const normalizedDueDate = normalizeDate(dueDate);
  const normalizedSelected = selectedDate ? normalizeDate(selectedDate) : null;

  const segmentOptions: SegmentedControlOption<SegmentValue>[] = [
    { value: "today", label: "Сегодня" },
    {
      value: "due",
      label: "По дате платежа",
    },
  ];

  const segmentSelection: SegmentValue | undefined = normalizedSelected
    ? normalizedSelected.getTime() === today.getTime()
      ? "today"
      : normalizedSelected.getTime() === normalizedDueDate.getTime()
      ? "due"
      : undefined
    : undefined;

  const handleSegmentChange = (value: SegmentValue): void => {
    if (value === "today") {
      setSelectedDate(normalizeDate(new Date()));
      return;
    }
    setSelectedDate(normalizeDate(dueDate));
  };

  const handleDateChange = (date: Date | null): void => {
    setSelectedDate(date);
  };

  const handleConfirm = (): void => {
    if (selectedDate) {
      onConfirm(selectedDate);
    }
  };

  const isConfirmDisabled = !selectedDate || isConfirming;

  const renderContent = ({ showHeadingSpacing }: ContentOptions) => (
    <div
      className={`space-y-5 text-gray-800 dark:text-gray-200 ${
        showHeadingSpacing ? "" : "mt-2"
      }`}
    >
      <p>
        Дата выполнения платежа отличается от сегодняшней. Пожалуйста, выберите,
        какой датой отметить платеж как выполненный.
      </p>

      <div className="flex flex-row items-center gap-4">
        <DatePicker
          mode="single"
          selected={selectedDate}
          onSingleChange={handleDateChange}
          placeholder="Выберите дату"
          label="Дата выполнения"
          variant="compact"
        />
        <SegmentedControl
          options={segmentOptions}
          selected={segmentSelection}
          onChange={handleSegmentChange}
          className="flex-nowrap"
          optionClassName="!px-2 md:!px-4"
        />
      </div>

      <div className="hidden md:flex justify-end space-x-4 pt-4">
        <Button
          variant="ghost"
          onClick={onClose}
          label="Отмена"
          disabled={isConfirming}
        />
        <Button
          variant="primary"
          onClick={handleConfirm}
          label="Подтвердить"
          loading={isConfirming}
          disabled={isConfirmDisabled}
        />
      </div>
      <div className="flex flex-col md:hidden gap-3 pt-4">
        <Button
          variant="primary"
          size="large"
          label="Подтвердить"
          className="w-full"
          onClick={handleConfirm}
          loading={isConfirming}
          disabled={isConfirmDisabled}
        />
        <Button
          variant="ghost"
          label="Отмена"
          className="w-full"
          onClick={onClose}
          disabled={isConfirming}
        />
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
      >
        {renderContent({ showHeadingSpacing: false })}
      </MobilePanel>
    </>
  );
};

export default ConfirmCompletionDateModal;
