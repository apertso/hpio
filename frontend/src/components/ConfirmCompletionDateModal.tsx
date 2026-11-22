import { useLanguage } from "../context/LanguageContext";
import React, { useEffect, useState } from "react";
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
  /**
   * Сколько платежей отмечается разом (пропущенные периоды серии).
   * Если больше одного, «По дате платежа» отмечает каждый платеж датой его срока.
   */
  paymentsCount?: number;
  /** Срок последнего из отмечаемых платежей — для подписи диапазона */
  lastDueDate?: Date;
  /** Вызывается вместо onConfirm, когда выбран вариант «по датам платежей» */
  onConfirmDueDates?: () => void;
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
  paymentsCount = 1,
  lastDueDate,
  onConfirmDueDates,
}) => {
  const { t, locale } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    () => new Date()
  );
  // Несколько платежей: каждый отмечается своей датой срока
  const [useDueDates, setUseDueDates] = useState(false);
  const isBulk = paymentsCount > 1 && Boolean(onConfirmDueDates);

  // При каждом открытии начинаем с «Сегодня», а не с прошлого выбора
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date());
      setUseDueDates(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const today = normalizeDate(new Date());
  const normalizedDueDate = normalizeDate(dueDate);
  const normalizedSelected = selectedDate ? normalizeDate(selectedDate) : null;

  const segmentOptions: SegmentedControlOption<SegmentValue>[] = [
    { value: "today", label: t("Сегодня") },
    {
      value: "due",
      label: isBulk ? t("По датам платежей") : t("По дате платежа"),
    },
  ];

  // Для нескольких платежей «по датам» — отдельный режим, а не совпадение с датой первого платежа
  const segmentSelection: SegmentValue | undefined = isBulk && useDueDates
    ? "due"
    : normalizedSelected
    ? normalizedSelected.getTime() === today.getTime()
      ? "today"
      : !isBulk && normalizedSelected.getTime() === normalizedDueDate.getTime()
      ? "due"
      : undefined
    : undefined;

  const handleSegmentChange = (value: SegmentValue): void => {
    if (value === "today") {
      setUseDueDates(false);
      setSelectedDate(normalizeDate(new Date()));
      return;
    }
    if (isBulk) {
      // У каждого платежа своя дата — поле даты очищаем
      setUseDueDates(true);
      setSelectedDate(null);
      return;
    }
    setSelectedDate(normalizeDate(dueDate));
  };

  const handleDateChange = (date: Date | null): void => {
    setUseDueDates(false);
    setSelectedDate(date);
  };

  const handleConfirm = (): void => {
    if (isBulk && useDueDates) {
      onConfirmDueDates?.();
      return;
    }
    if (selectedDate) {
      onConfirm(selectedDate);
    }
  };

  const isConfirmDisabled =
    (!selectedDate && !(isBulk && useDueDates)) || isConfirming;

  const rangeFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const rangeText = lastDueDate
    ? `${rangeFormatter.format(dueDate)} — ${rangeFormatter.format(lastDueDate)}`
    : rangeFormatter.format(dueDate);

  const renderContent = ({ showHeadingSpacing }: ContentOptions) => (
    <div
      className={`space-y-5 text-gray-800 dark:text-gray-200 ${
        showHeadingSpacing ? "" : "mt-2"
      }`}
    >
      {isBulk ? (
        <p>
          {t("Будут отмечены выполненными все пропущенные платежи серии: {1} шт. ({2}). Выберите дату выполнения или отметьте каждый платеж датой его срока.", paymentsCount, rangeText)}
        </p>
      ) : (
        <p>
          {t("Дата выполнения платежа отличается от сегодняшней. Пожалуйста, выберите, какой датой отметить платеж как выполненный.")}
        </p>
      )}

      <div className="flex flex-row items-center gap-4">
        <DatePicker
          mode="single"
          selected={selectedDate}
          onSingleChange={handleDateChange}
          placeholder={isBulk && useDueDates ? t("По датам платежей") : t("Выберите дату")}
          label={t("Дата выполнения")}
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
          label={t("Отмена")}
          disabled={isConfirming}
        />
        <Button
          variant="primary"
          onClick={handleConfirm}
          label={t("Подтвердить")}
          loading={isConfirming}
          disabled={isConfirmDisabled}
        />
      </div>
      <div className="flex flex-col md:hidden gap-3 pt-4">
        <Button
          variant="primary"
          size="large"
          label={t("Подтвердить")}
          className="w-full"
          onClick={handleConfirm}
          loading={isConfirming}
          disabled={isConfirmDisabled}
        />
        <Button
          variant="ghost"
          label={t("Отмена")}
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
        title={t("Выберите дату выполнения")}
        className="hidden md:flex"
      >
        {renderContent({ showHeadingSpacing: true })}
      </Modal>
      <MobilePanel
        isOpen={isOpen}
        onClose={onClose}
        title={t("Выберите дату выполнения")}
      >
        {renderContent({ showHeadingSpacing: false })}
      </MobilePanel>
    </>
  );
};

export default ConfirmCompletionDateModal;
